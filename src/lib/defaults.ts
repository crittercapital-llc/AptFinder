import type { SearchCriteria } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";

// Sensible defaults so the app demonstrates real value on first load.
export const DEFAULT_CRITERIA: SearchCriteria = {
  city: "San Francisco",
  preferredNeighborhoods: ["mission", "hayes-valley"],
  budgetMin: 2500,
  budgetMax: 3500,
  bedrooms: 1,
  moveInBy: "2026-06-15",
  buildingSize: "boutique",
  amenities: ["in_unit_laundry", "pet_friendly"],
  commute: {
    destination: "Mission Bay, SF",
    maxMinutes: 30,
    mode: "transit",
  },
  weights: { ...DEFAULT_WEIGHTS },
  outreach: {
    autoDraft: true,
    tone: "warm",
    introLine: "— Alex, software engineer relocating from Seattle",
  },
};

export const AMENITY_OPTIONS: { value: string; label: string }[] = [
  { value: "in_unit_laundry", label: "In-unit laundry" },
  { value: "pet_friendly", label: "Pet friendly" },
  { value: "dishwasher", label: "Dishwasher" },
  { value: "parking", label: "Parking" },
  { value: "gym", label: "Gym" },
  { value: "pool", label: "Pool" },
  { value: "doorman", label: "Doorman" },
  { value: "roof_deck", label: "Roof deck" },
  { value: "garden", label: "Garden / yard" },
  { value: "fireplace", label: "Fireplace" },
  { value: "bike_storage", label: "Bike storage" },
];

export const COMMUTE_DESTINATIONS = [
  "Mission Bay, SF",
  "Financial District, SF",
  "SoMa, SF",
  "Palo Alto, CA",
];
