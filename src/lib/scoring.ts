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

// Compute a 0..100 commute score for a listing given the user's commute pref.
// Anchors on the listing's neighborhood static data; if the destination isn't
// recognized, use a heuristic based on Mission Bay.
export function commuteScore(
  neighborhood: Neighborhood,
  criteria: SearchCriteria,
): { score: number; minutes: number } {
  const dest = criteria.commute.destination;
  const anchor =
    neighborhood.commuteAnchors[dest] ??
    neighborhood.commuteAnchors["Mission Bay, SF"];
  const minutes = anchor[criteria.commute.mode];
  const cap = criteria.commute.maxMinutes;
  if (minutes >= 999) return { score: 0, minutes: 999 };
  if (minutes <= cap * 0.5) return { score: 100, minutes };
  if (minutes <= cap) {
    // Linear from 100 at half cap to 60 at cap.
    const t = (minutes - cap * 0.5) / (cap * 0.5);
    return { score: clamp(100 - t * 40), minutes };
  }
  // Over the cap — drop off faster.
  const overshoot = minutes - cap;
  return { score: clamp(60 - overshoot * 2), minutes };
}

export function affordabilityScore(listing: Listing, criteria: SearchCriteria): number {
  if (listing.rent <= criteria.budgetMin) return 100;
  if (listing.rent <= criteria.budgetMax) {
    const range = Math.max(1, criteria.budgetMax - criteria.budgetMin);
    const ratio = (listing.rent - criteria.budgetMin) / range;
    return clamp(100 - ratio * 30);
  }
  // Over budget: score plummets with overshoot.
  const overshoot = listing.rent - criteria.budgetMax;
  const overshootPct = overshoot / Math.max(1, criteria.budgetMax);
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
  const { score: cScore, minutes } = commuteScore(neighborhood, criteria);
  const aff = affordabilityScore(listing, criteria);
  const amen = amenityScore(listing, criteria);
  const vibe = vibeScore(neighborhood, criteria);

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
      rawScore: cScore,
      weight: weights.commute,
      contribution: cScore * weights.commute,
      reason:
        minutes >= 999
          ? `No reasonable ${criteria.commute.mode} route to ${criteria.commute.destination}.`
          : `~${minutes} min ${criteria.commute.mode} to ${criteria.commute.destination} (cap ${criteria.commute.maxMinutes}).`,
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
        listing.rent <= criteria.budgetMax
          ? `$${listing.rent}/mo fits inside your $${criteria.budgetMin}-$${criteria.budgetMax} band.`
          : `$${listing.rent}/mo is $${listing.rent - criteria.budgetMax} over your cap.`,
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
  if (listing.rent > criteria.budgetMax) {
    warnings.push(`Above budget by $${listing.rent - criteria.budgetMax}/mo.`);
  }
  if (minutes > criteria.commute.maxMinutes) {
    warnings.push(`${minutes} min commute exceeds your ${criteria.commute.maxMinutes} min cap.`);
  }
  if (listing.bedrooms !== criteria.bedrooms) {
    warnings.push(
      `${bedroomLabel(listing.bedrooms)} vs. ${bedroomLabel(criteria.bedrooms)} requested.`,
    );
  }
  if (!buildingSizeMatch(listing, criteria)) {
    warnings.push(`Building size differs from your "${criteria.buildingSize}" preference.`);
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
    factors: top[0]?.factors ?? [],
    matchingListings: scored,
    pitch,
  };
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
