// Core domain types for HomeHound.
// Shaped so future scrapers / APIs can populate the same shapes that the
// scoring engine and UI already consume.

export type FactorKey =
  | "safety"
  | "commute"
  | "food"
  | "vibe"
  | "affordability"
  | "amenities"
  | "responsiveness";

export type BuildingSizePreference = "any" | "boutique" | "midrise" | "highrise";

export type OutreachStatus =
  | "not_started"
  | "draft_ready"
  | "sent"
  | "replied"
  | "tour_scheduled"
  | "passed";

export interface CommutePreference {
  destination: string;       // e.g. "Mission Bay, SF" or work address
  maxMinutes: number;        // hard cap
  mode: "transit" | "walk" | "bike" | "drive";
}

export interface SearchCriteria {
  city: string;
  preferredNeighborhoods: string[];
  budgetMin: number;
  budgetMax: number;
  bedrooms: number;          // 0 = studio
  moveInBy: string;          // ISO date
  buildingSize: BuildingSizePreference;
  amenities: string[];       // e.g. ["in_unit_laundry","pet_friendly"]
  commute: CommutePreference;
  // 0..5 importance per factor (controls weighting)
  weights: Record<FactorKey, number>;
  outreach: {
    autoDraft: boolean;
    tone: "warm" | "concise" | "formal";
    introLine: string;       // user signature / context
  };
}

// 0..100 scale for each underlying signal. Higher is better.
export interface NeighborhoodScores {
  safety: number;
  commute: number;       // computed against criteria.commute on demand
  food: number;
  vibe: number;
  affordability: number; // relative to criteria.budgetMax
  amenities: number;     // density of nearby amenities (cafes, parks, gyms)
}

export interface Neighborhood {
  id: string;
  name: string;
  city: string;
  blurb: string;
  // Hand-tuned descriptors used by the agent's reasoning UI.
  vibeTags: string[];
  signature: {
    coffee: string;
    food: string;
    nightlife: string;
    parks: string;
  };
  // Average rent for a 1BR in the neighborhood, used for affordability scoring.
  medianRent1br: number;
  // Static signals (we'd recompute from data sources in production).
  scores: Omit<NeighborhoodScores, "commute" | "affordability">;
  // Map placeholder coords for future map integration.
  lat: number;
  lng: number;
  // Approximate transit time to common SF anchor (used by mock commute calc).
  commuteAnchors: Record<string, { transit: number; walk: number; bike: number; drive: number }>;
}

export interface Listing {
  id: string;
  neighborhoodId: string;
  title: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent: number;
  amenities: string[];
  // "boutique" 2-12 unit, "midrise" 12-50, "highrise" 50+, "townhome" 1-4
  buildingType: "boutique" | "midrise" | "highrise" | "townhome";
  managed: "self" | "small_pm" | "large_pm";
  // Historical landlord responsiveness, 0..100.
  landlordResponsiveness: number;
  // First available move-in date, ISO.
  availableOn: string;
  photoColor: string; // CSS gradient seed for visual placeholder
  notes: string;
  contact: {
    landlordName: string;
    email: string;
    phone?: string;
    preferredChannel: "email" | "sms";
  };
}

export interface ScoredFactor {
  factor: FactorKey;
  rawScore: number;     // 0..100
  weight: number;       // 0..1
  contribution: number; // rawScore * weight
  reason: string;       // human-readable why
}

export interface ScoredListing {
  listing: Listing;
  neighborhood: Neighborhood;
  total: number;        // 0..100
  factors: ScoredFactor[];
  matchHighlights: string[]; // top reasons surfaced in UI
  warnings: string[];        // e.g. "Above budget by $150"
}

export interface ScoredNeighborhood {
  neighborhood: Neighborhood;
  total: number;
  factors: ScoredFactor[];
  matchingListings: ScoredListing[];
  pitch: string; // 1-2 sentence agent-voice summary
}

export interface OutreachAction {
  id: string;
  listingId: string;
  status: OutreachStatus;
  draftSubject: string;
  draftBody: string;
  createdAt: string;
  updatedAt: string;
  nextStep: string;
}
