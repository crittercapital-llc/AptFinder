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
  const debug = searchParams.get("debug") === "1";

  const url = new URL(`${RENTCAST_BASE}/listings/rental/long-term`);
  url.searchParams.set("city", city);
  url.searchParams.set("state", state);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("status", "Active");

  let raw: unknown;
  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Rentcast error", res.status, body);
      return NextResponse.json(
        { error: `Rentcast returned ${res.status}`, body },
        { status: res.status },
      );
    }

    raw = await res.json();
  } catch (err) {
    console.error("Rentcast fetch failed", err);
    return NextResponse.json({ error: "Failed to reach Rentcast.", detail: String(err) }, { status: 502 });
  }

  // Return the raw response when debugging so you can see the exact shape.
  if (debug) {
    return NextResponse.json({ raw, type: typeof raw, isArray: Array.isArray(raw) });
  }

  // Rentcast may return a top-level array or wrap listings in an object.
  const items: RentcastListing[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)?.listings)
      ? ((raw as Record<string, unknown>).listings as RentcastListing[])
      : Array.isArray((raw as Record<string, unknown>)?.data)
        ? ((raw as Record<string, unknown>).data as RentcastListing[])
        : [];

  if (items.length === 0) {
    console.warn("Rentcast returned no listings. Raw shape:", JSON.stringify(raw)?.slice(0, 300));
  }

  const listings = items.map(mapRentcastListing);

  return NextResponse.json(listings, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300",
    },
  });
}
