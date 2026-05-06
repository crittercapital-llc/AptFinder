import { NextResponse } from "next/server";
import type { RentcastListing } from "@/lib/rentcast";
import { mapRentcastListing } from "@/lib/rentcast";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

export async function GET(request: Request) {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RENTCAST_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "San Francisco";
  const state = searchParams.get("state") || "CA";
  const limit = Math.min(Number(searchParams.get("limit") || "100"), 500);

  const url = new URL(`${RENTCAST_BASE}/listings/rental/long-term`);
  url.searchParams.set("city", city);
  url.searchParams.set("state", state);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("status", "Active");

  let rentcastData: RentcastListing[];
  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      // Next.js data cache: revalidate every 30 minutes.
      // On Vercel this persists across serverless invocations, keeping
      // Rentcast API usage well within free-tier limits.
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Rentcast error", res.status, body);
      return NextResponse.json(
        { error: `Rentcast returned ${res.status}` },
        { status: res.status },
      );
    }

    rentcastData = await res.json();
  } catch (err) {
    console.error("Rentcast fetch failed", err);
    return NextResponse.json({ error: "Failed to reach Rentcast." }, { status: 502 });
  }

  const listings = rentcastData.map(mapRentcastListing);

  return NextResponse.json(listings, {
    headers: {
      // Tell the browser (and Vercel's edge) to treat this as fresh for 30 min.
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300",
    },
  });
}
