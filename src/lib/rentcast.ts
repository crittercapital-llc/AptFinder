import type { Listing } from "@/lib/types";
import { NEIGHBORHOODS } from "@/lib/data/neighborhoods";

// ── Rentcast response shape ──────────────────────────────────────────────────

export interface RentcastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
  latitude: number;
  longitude: number;
  propertyType: string; // "Apartment" | "Condo" | "Townhouse" | "Single Family" | ...
  bedrooms: number;
  bathrooms: number;
  squareFootage: number | null;
  price: number;
  listedDate: string | null;
  status: string;
  daysOnMarket: number | null;
}

// ── Mapping ──────────────────────────────────────────────────────────────────

export function mapRentcastListing(r: RentcastListing): Listing {
  const neighborhoodId = nearestNeighborhood(r.latitude, r.longitude, r.city);
  const bedroomLabel =
    r.bedrooms === 0 ? "Studio" : `${r.bedrooms}BR`;

  return {
    id: `rc-${r.id}`,
    neighborhoodId,
    title: `${bedroomLabel} at ${r.addressLine1}${r.addressLine2 ? ` ${r.addressLine2}` : ""}`,
    address: r.formattedAddress,
    bedrooms: r.bedrooms ?? 0,
    bathrooms: r.bathrooms ?? 1,
    sqft: r.squareFootage ?? 0,
    rent: r.price,
    amenities: [],
    buildingType: inferBuildingType(r.propertyType),
    managed: "small_pm",
    landlordResponsiveness: deterministicScore(r.id, 55, 95),
    availableOn: r.listedDate
      ? r.listedDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
    photoColor: addressToGradient(r.formattedAddress),
    notes: r.daysOnMarket != null ? `${r.daysOnMarket} days on market.` : "",
    contact: {
      landlordName: "Property Manager",
      email: slugEmail(r.addressLine1),
      preferredChannel: "email",
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function nearestNeighborhood(lat: number, lng: number, city: string): string {
  const candidates = NEIGHBORHOODS.filter((n) =>
    city.toLowerCase().includes("oakland")
      ? n.city === "Oakland"
      : n.city === "San Francisco",
  );
  if (candidates.length === 0) return NEIGHBORHOODS[0].id;

  let best = candidates[0];
  let bestDist = Infinity;
  for (const n of candidates) {
    const d = Math.hypot(n.lat - lat, n.lng - lng);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best.id;
}

function inferBuildingType(propertyType: string): Listing["buildingType"] {
  const t = propertyType.toLowerCase();
  if (t.includes("townhouse") || t.includes("townhome")) return "townhome";
  if (t.includes("single") || t.includes("house")) return "boutique";
  if (t.includes("condo")) return "midrise";
  return "midrise";
}

// Stable pseudo-random score in [min, max] seeded by a string.
function deterministicScore(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return min + Math.abs(h % (max - min + 1));
}

// Simple gradient seed from the address string so every card has a distinct colour.
function addressToGradient(address: string): string {
  const hue = deterministicScore(address, 0, 359);
  return `hsl(${hue},40%,70%)`;
}

// Placeholder contact email derived from the street address.
function slugEmail(addressLine1: string): string {
  const slug = addressLine1
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `contact-${slug}@placeholder.homehound`;
}
