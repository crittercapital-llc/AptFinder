import type {
  FactorKey,
  Listing,
  Neighborhood,
  ScoredFactor,
  ScoredListing,
  ScoredNeighborhood,
  SearchCriteria,
} from "@/lib/types";

export const FACTOR_LABELS: Record<FactorKey, string> = {
  safety: "Safety",
  commute: "Commute",
  food: "Food & coffee",
  vibe: "Neighborhood vibe",
  affordability: "Affordability",
  amenities: "Amenities",
  responsiveness: "Landlord responsiveness",
};

export const DEFAULT_WEIGHTS: Record<FactorKey, number> = {
  safety: 4,
  commute: 4,
  food: 3,
  vibe: 3,
  affordability: 4,
  amenities: 2,
  responsiveness: 3,
};

// Convert raw 0..5 importance values into 0..1 normalized weights that sum to 1.
export function normalizeWeights(
  weights: Record<FactorKey, number>,
): Record<FactorKey, number> {
  const total = Object.values(weights).reduce((s, v) => s + Math.max(0, v), 0);
  if (total === 0) {
    // Even distribution fallback so the engine still works.
    const keys = Object.keys(weights) as FactorKey[];
    const flat = 1 / keys.length;
    return Object.fromEntries(keys.map((k) => [k, flat])) as Record<FactorKey, number>;
  }
  const out = {} as Record<FactorKey, number>;
  for (const k of Object.keys(weights) as FactorKey[]) {
    out[k] = Math.max(0, weights[k]) / total;
  }
  return out;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

// Sentinel used in the static commute anchor data to mark a mode as
// effectively unreachable (e.g. walking from Outer Sunset to Palo Alto).
// Internal only — never surface this number to users; commuteScore returns
// `available: false` instead so the UI can render a human-friendly message.
export const COMMUTE_UNREACHABLE = 999;

export interface CommuteScoreResult {
  score: number;
  minutes: number | null; // null when unavailable
  available: boolean;     // false ⇒ no anchor for destination, or mode unreachable
  reason: "ok" | "missing_anchor" | "unreachable_mode";
}

// Compute a 0..100 commute score for a listing given the user's commute pref.
// If the destination isn't in the neighborhood's anchor table, we return
// `available: false` rather than silently falling back to an unrelated city —
// callers (and the UI) decide how to surface that.
export function commuteScore(
  neighborhood: Neighborhood,
  criteria: SearchCriteria,
): CommuteScoreResult {
  const dest = criteria.commute.destination;
  const anchor = neighborhood.commuteAnchors[dest];
  if (!anchor) {
    return { score: 0, minutes: null, available: false, reason: "missing_anchor" };
  }
  const raw = anchor[criteria.commute.mode];
  if (raw === undefined || raw === null || raw >= COMMUTE_UNREACHABLE) {
    return { score: 0, minutes: null, available: false, reason: "unreachable_mode" };
  }
  const minutes = raw;
  const cap = Math.max(1, criteria.commute.maxMinutes);
  if (minutes <= cap * 0.5) return { score: 100, minutes, available: true, reason: "ok" };
  if (minutes <= cap) {
    // Linear from 100 at half cap to 60 at cap.
    const t = (minutes - cap * 0.5) / (cap * 0.5);
    return { score: clamp(100 - t * 40), minutes, available: true, reason: "ok" };
  }
  // Over the cap — drop off faster.
  const overshoot = minutes - cap;
  return { score: clamp(60 - overshoot * 2), minutes, available: true, reason: "ok" };
}

// Returns a sanitized {min, max} where min <= max and both are finite,
// non-negative numbers. Invalid inputs collapse to a wide-open band so the
// scoring engine still produces a result. The form layer is responsible for
// surfacing user-facing validation errors.
export function normalizeBudget(criteria: SearchCriteria): {
  min: number;
  max: number;
  inverted: boolean;
  invalid: boolean;
} {
  const rawMin = criteria.budgetMin;
  const rawMax = criteria.budgetMax;
  const minOk = Number.isFinite(rawMin) && rawMin >= 0;
  const maxOk = Number.isFinite(rawMax) && rawMax >= 0;
  if (!minOk && !maxOk) {
    return { min: 0, max: Number.POSITIVE_INFINITY, inverted: false, invalid: true };
  }
  let min = minOk ? rawMin : 0;
  let max = maxOk ? rawMax : Number.POSITIVE_INFINITY;
  let inverted = false;
  if (min > max) {
    inverted = true;
    [min, max] = [max, min];
  }
  return { min, max, inverted, invalid: !minOk || !maxOk };
}

export function affordabilityScore(listing: Listing, criteria: SearchCriteria): number {
  const { min, max } = normalizeBudget(criteria);
  if (listing.rent <= min) return 100;
  if (listing.rent <= max) {
    const range = Math.max(1, max - min);
    const ratio = (listing.rent - min) / range;
    return clamp(100 - ratio * 30);
  }
  // Over budget: score plummets with overshoot.
  const overshoot = listing.rent - max;
  const overshootPct = overshoot / Math.max(1, max);
  return clamp(70 - overshootPct * 200);
}

export function amenityScore(listing: Listing, criteria: SearchCriteria): number {
  if (criteria.amenities.length === 0) {
    // No specific asks — reward listings that have any quality amenities.
    return clamp(60 + listing.amenities.length * 5);
  }
  const matched = criteria.amenities.filter((a) => listing.amenities.includes(a));
  const ratio = matched.length / criteria.amenities.length;
  // Some credit for partial overlap so users still see options.
  return clamp(40 + ratio * 60);
}

export function vibeScore(neighborhood: Neighborhood, criteria: SearchCriteria): number {
  // Static base + bump if user listed neighborhood as preferred.
  let s = neighborhood.scores.vibe;
  if (criteria.preferredNeighborhoods.includes(neighborhood.id)) s = Math.min(100, s + 8);
  return s;
}

function buildingSizeMatch(listing: Listing, criteria: SearchCriteria): boolean {
  if (criteria.buildingSize === "any") return true;
  if (criteria.buildingSize === "boutique")
    return listing.buildingType === "boutique" || listing.buildingType === "townhome";
  return listing.buildingType === criteria.buildingSize;
}

export function scoreListing(
  listing: Listing,
  neighborhood: Neighborhood,
  criteria: SearchCriteria,
): ScoredListing {
  const weights = normalizeWeights(criteria.weights);
  const commute = commuteScore(neighborhood, criteria);
  const aff = affordabilityScore(listing, criteria);
  const amen = amenityScore(listing, criteria);
  const vibe = vibeScore(neighborhood, criteria);
  const budget = normalizeBudget(criteria);

  const commuteReason = commute.available
    ? `~${commute.minutes} min ${criteria.commute.mode} to ${criteria.commute.destination} (cap ${criteria.commute.maxMinutes}).`
    : commute.reason === "missing_anchor"
      ? `We don't have a ${criteria.commute.mode} time from ${neighborhood.name} to ${criteria.commute.destination} yet.`
      : `${neighborhood.name} isn't reachable from ${criteria.commute.destination} by ${criteria.commute.mode}.`;

  const factors: ScoredFactor[] = [
    {
      factor: "safety",
      rawScore: neighborhood.scores.safety,
      weight: weights.safety,
      contribution: neighborhood.scores.safety * weights.safety,
      reason: `${neighborhood.name} scores ${neighborhood.scores.safety}/100 on safety in our blended index.`,
    },
    {
      factor: "commute",
      rawScore: commute.score,
      weight: weights.commute,
      contribution: commute.score * weights.commute,
      reason: commuteReason,
    },
    {
      factor: "food",
      rawScore: neighborhood.scores.food,
      weight: weights.food,
      contribution: neighborhood.scores.food * weights.food,
      reason: `Signature spots: ${neighborhood.signature.coffee.split(",")[0]}, ${neighborhood.signature.food.split(",")[0]}.`,
    },
    {
      factor: "vibe",
      rawScore: vibe,
      weight: weights.vibe,
      contribution: vibe * weights.vibe,
      reason: `Vibe reads as ${neighborhood.vibeTags.slice(0, 3).join(", ")}.`,
    },
    {
      factor: "affordability",
      rawScore: aff,
      weight: weights.affordability,
      contribution: aff * weights.affordability,
      reason:
        listing.rent <= budget.max
          ? `$${listing.rent}/mo fits inside your $${budget.min}-${Number.isFinite(budget.max) ? `$${budget.max}` : "no cap"} band.`
          : `$${listing.rent}/mo is $${listing.rent - budget.max} over your cap.`,
    },
    {
      factor: "amenities",
      rawScore: amen,
      weight: weights.amenities,
      contribution: amen * weights.amenities,
      reason:
        criteria.amenities.length === 0
          ? `Has ${listing.amenities.length} amenities including ${listing.amenities.slice(0, 2).join(", ") || "—"}.`
          : `Matches ${criteria.amenities.filter((a) => listing.amenities.includes(a)).length}/${criteria.amenities.length} of your amenity asks.`,
    },
    {
      factor: "responsiveness",
      rawScore: listing.landlordResponsiveness,
      weight: weights.responsiveness,
      contribution: listing.landlordResponsiveness * weights.responsiveness,
      reason: `Landlord typically replies ${responsivenessLabel(listing.landlordResponsiveness)} (${listing.managed === "self" ? "owner-operated" : listing.managed === "small_pm" ? "small PM" : "large PM"}).`,
    },
  ];

  const total = factors.reduce((s, f) => s + f.contribution, 0);

  // Match highlights: top 3 contributing factors with above-average raw scores.
  const matchHighlights = [...factors]
    .filter((f) => f.rawScore >= 70)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((f) => `${FACTOR_LABELS[f.factor]}: ${f.reason}`);

  const warnings: string[] = [];
  if (Number.isFinite(budget.max) && listing.rent > budget.max) {
    warnings.push(`Above budget by $${listing.rent - budget.max}/mo.`);
  }
  if (!commute.available) {
    warnings.push(
      commute.reason === "missing_anchor"
        ? `Commute time to ${criteria.commute.destination} unavailable for ${neighborhood.name}.`
        : `No reasonable ${criteria.commute.mode} route from ${neighborhood.name} to ${criteria.commute.destination}.`,
    );
  } else if (commute.minutes !== null && commute.minutes > criteria.commute.maxMinutes) {
    warnings.push(`${commute.minutes} min commute exceeds your ${criteria.commute.maxMinutes} min cap.`);
  }
  if (listing.bedrooms !== criteria.bedrooms) {
    warnings.push(
      `${bedroomLabel(listing.bedrooms)} vs. ${bedroomLabel(criteria.bedrooms)} requested.`,
    );
  }
  if (!buildingSizeMatch(listing, criteria)) {
    warnings.push(`Building size differs from your "${criteria.buildingSize}" preference.`);
  }
  if (criteria.moveInBy && listing.availableOn) {
    const want = Date.parse(criteria.moveInBy);
    const have = Date.parse(listing.availableOn);
    if (Number.isFinite(want) && Number.isFinite(have) && have > want) {
      const days = Math.round((have - want) / (1000 * 60 * 60 * 24));
      warnings.push(`Available ${days} day${days === 1 ? "" : "s"} after your ${formatMoveIn(criteria.moveInBy)} move-in.`);
    }
  }

  return {
    listing,
    neighborhood,
    total: clamp(total),
    factors,
    matchHighlights,
    warnings,
  };
}

function bedroomLabel(b: number) {
  return b === 0 ? "Studio" : `${b}BR`;
}

function formatMoveIn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function responsivenessLabel(score: number) {
  if (score >= 85) return "same day";
  if (score >= 70) return "within a day";
  if (score >= 55) return "within 2-3 days";
  return "slowly";
}

export function scoreNeighborhood(
  neighborhood: Neighborhood,
  listings: Listing[],
  criteria: SearchCriteria,
): ScoredNeighborhood {
  const scored = listings
    .filter((l) => l.neighborhoodId === neighborhood.id)
    .map((l) => scoreListing(l, neighborhood, criteria))
    .sort((a, b) => b.total - a.total);

  // Neighborhood-level total: average top-3 listings, plus a small bonus
  // when the neighborhood was explicitly preferred.
  const top = scored.slice(0, 3);
  const baseAvg =
    top.length === 0 ? 0 : top.reduce((s, l) => s + l.total, 0) / top.length;
  const preferBonus = criteria.preferredNeighborhoods.includes(neighborhood.id) ? 4 : 0;
  const total = clamp(baseAvg + preferBonus);

  const pitch = buildPitch(neighborhood, criteria, top[0]);

  return {
    neighborhood,
    total,
    factors: neighborhoodFactors(neighborhood, criteria),
    matchingListings: scored,
    pitch,
  };
}

// Build neighborhood-level reason bullets that describe the neighborhood
// itself (safety, commute, food, vibe), not the top listing inside it. The
// listing-level breakdown is still available on each ListingCard.
function neighborhoodFactors(
  neighborhood: Neighborhood,
  criteria: SearchCriteria,
): ScoredFactor[] {
  const weights = normalizeWeights(criteria.weights);
  const commute = commuteScore(neighborhood, criteria);
  const vibe = vibeScore(neighborhood, criteria);

  const safetyReason =
    neighborhood.scores.safety >= 80
      ? `${neighborhood.name} reads as low-friction day & night (safety ${neighborhood.scores.safety}/100).`
      : neighborhood.scores.safety >= 65
        ? `${neighborhood.name} is mixed — fine on main drags, situational off them (safety ${neighborhood.scores.safety}/100).`
        : `${neighborhood.name} skews uneven on safety (${neighborhood.scores.safety}/100); worth a daylight + nighttime walk.`;

  const commuteReason = commute.available
    ? `~${commute.minutes} min ${criteria.commute.mode} from ${neighborhood.name} to ${criteria.commute.destination}.`
    : commute.reason === "missing_anchor"
      ? `Commute estimate to ${criteria.commute.destination} unavailable for ${neighborhood.name}.`
      : `${neighborhood.name} doesn't have a workable ${criteria.commute.mode} route to ${criteria.commute.destination}.`;

  return [
    {
      factor: "safety",
      rawScore: neighborhood.scores.safety,
      weight: weights.safety,
      contribution: neighborhood.scores.safety * weights.safety,
      reason: safetyReason,
    },
    {
      factor: "commute",
      rawScore: commute.score,
      weight: weights.commute,
      contribution: commute.score * weights.commute,
      reason: commuteReason,
    },
    {
      factor: "food",
      rawScore: neighborhood.scores.food,
      weight: weights.food,
      contribution: neighborhood.scores.food * weights.food,
      reason: `Food anchors here: ${neighborhood.signature.food}.`,
    },
    {
      factor: "vibe",
      rawScore: vibe,
      weight: weights.vibe,
      contribution: vibe * weights.vibe,
      reason: `Vibe leans ${neighborhood.vibeTags.join(", ")}.`,
    },
    {
      factor: "amenities",
      rawScore: neighborhood.scores.amenities,
      weight: weights.amenities,
      contribution: neighborhood.scores.amenities * weights.amenities,
      reason: `Walkable amenity density scores ${neighborhood.scores.amenities}/100 in our index.`,
    },
  ];
}

function buildPitch(
  n: Neighborhood,
  criteria: SearchCriteria,
  best: ScoredListing | undefined,
): string {
  const tag = n.vibeTags.slice(0, 2).join(" + ");
  const coffee = n.signature.coffee.split(",")[0].trim();
  const food = n.signature.food.split(",")[0].trim();
  const why = criteria.preferredNeighborhoods.includes(n.id)
    ? "you flagged it as a preferred neighborhood"
    : best
      ? `the top listing here scores ${Math.round(best.total)}/100 against your weights`
      : "it lines up with the priorities you set";
  return `${n.name} reads as ${tag} — think ${coffee} mornings and ${food} nights — and ${why}.`;
}

export function rankNeighborhoods(
  neighborhoods: Neighborhood[],
  listings: Listing[],
  criteria: SearchCriteria,
): ScoredNeighborhood[] {
  return neighborhoods
    .map((n) => scoreNeighborhood(n, listings, criteria))
    .sort((a, b) => b.total - a.total);
}
