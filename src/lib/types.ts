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
    tone: "warm" | "concise" | "formal" | "casual" | "enthusiastic";
    introLine: string;       // user signature / context
    aboutMe: string;         // short bio injected into outreach drafts
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

// Approximate one-way travel time in minutes to a destination, broken out by
// transport mode. `rail` and `bus` together explain the legacy `transit` field
// (which we keep for back-compat with the listing-side scoring path). Use the
// COMMUTE_UNREACHABLE sentinel for unreachable modes.
export interface CommuteAnchor {
  transit: number; // legacy: best-of rail/bus
  rail: number;
  bus: number;
  walk: number;
  bike: number;
  drive: number;
}

// Static, hand-tuned neighborhood traits used by the discovery scoring. All
// 0..100 unless noted. Designed to be replaceable with real data sources.
export interface NeighborhoodTraits {
  // Higher = louder. 0..100, where 0 is library-quiet, 100 is downtown nightlife strip.
  noiseLevel: number;
  // Density / quality of nearby parks and green space.
  parkAccess: number;
  // How well the area suits families with young kids (good schools, sidewalks, calm streets).
  familyFriendliness: number;
  // Density / variety of bars & restaurants.
  nightlifeDensity: number;
  // Cafe & "third place" density — distinct from food/nightlife.
  cafeDensity: number;
  // Fitness / outdoor access (gyms, trails, studios, biking).
  fitnessAccess: number;
  // Quiet walks: leafy streets, low car density, parks-y.
  quietWalkability: number;
  // Cultural activities: museums, theaters, music venues, galleries.
  culturalDensity: number;
  // Stability: neighborhoods that "stay good" for a long tenure (low turnover, mature housing stock).
  longTermStability: number;
  // Composition of the housing stock as approximate shares (0..1, do not need to sum to 1).
  housingStock: {
    largeBuildings: number;   // 50+ unit highrises
    smallBuildings: number;   // 12-50 unit midrises
    momAndPop: number;        // small owner-operated buildings
    boutiqueVictorian: number; // boutique/Victorian/Edwardian character
  };
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
  // Approximate one-way commute by mode to common destinations.
  commuteAnchors: Record<string, CommuteAnchor>;
  // Discovery-flow traits — see NeighborhoodTraits.
  traits: NeighborhoodTraits;
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

// ---- Neighborhood discovery (questionnaire) ----

// Modes the discovery flow exposes. "rail" and "bus" are split out from the
// legacy "transit" so users can opt out of buses without losing rail.
export type DiscoveryCommuteMode = "rail" | "bus" | "drive" | "bike" | "walk";

export type NoisePreference = "quiet" | "balanced" | "lively";

export type LifestyleInterest =
  | "greenspaces"
  | "restaurants"
  | "nightlife"
  | "cafes"
  | "fitness"
  | "quiet_walks"
  | "cultural";

export type BuildingStyle =
  | "large_buildings"
  | "small_buildings"
  | "mom_and_pop"
  | "boutique_victorian";

// Final answers from the discovery questionnaire. All fields have a default
// applied at form-init time, so the scoring function can assume well-formed
// data. Unknown destination/mode degrades gracefully in scoring.
export interface DiscoveryAnswers {
  // Step 1 — commute
  commuteDestination: string;
  commuteMaxMinutes: number;
  // Modes the user is willing to use. At least one is required by the form;
  // scoring still degrades gracefully if the array is empty.
  commuteModes: DiscoveryCommuteMode[];

  // Step 2 — lifestyle
  lifestyle: LifestyleInterest[];
  noise: NoisePreference;
  // Whether bars/restaurants matter — separate from `lifestyle` so users can
  // opt in even if they didn't pick "nightlife" / "restaurants" explicitly.
  wantsNightlifeNearby: boolean;
  wantsParksNearby: boolean;

  // Step 3 — life situation
  hasYoungKids: boolean;
  yearsPlanned: number;

  // Step 4 — housing preferences
  buildingStyles: BuildingStyle[];
}

// Per-neighborhood explanation produced by the discovery scorer. Reasons are
// short, agent-voice bullets the UI can render verbatim.
export interface DiscoveryReason {
  key: string;     // stable id for testing (e.g. "commute", "noise")
  positive: boolean;
  text: string;
}

export interface DiscoveryRecommendation {
  neighborhood: Neighborhood;
  total: number;            // 0..100
  commuteMinutes: number | null;
  commuteMode: DiscoveryCommuteMode | null; // best mode actually used
  reasons: DiscoveryReason[];
  // Sub-scores for transparency / future tuning.
  components: {
    commute: number;
    lifestyle: number;
    noise: number;
    family: number;
    nightlife: number;
    parks: number;
    tenure: number;
    housing: number;
  };
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
