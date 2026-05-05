import type {
  BuildingStyle,
  DiscoveryAnswers,
  DiscoveryCommuteMode,
  DiscoveryReason,
  DiscoveryRecommendation,
  LifestyleInterest,
  Neighborhood,
} from "@/lib/types";
import { COMMUTE_UNREACHABLE } from "@/lib/scoring";

// Default seed answers — all required fields are filled so that the form's
// scoring engine never has to handle undefined. The user can change anything.
export const DEFAULT_DISCOVERY_ANSWERS: DiscoveryAnswers = {
  commuteDestination: "Mission Bay, SF",
  commuteMaxMinutes: 35,
  commuteModes: ["rail", "drive", "bike", "walk"], // bus excluded by default — easy to re-enable
  lifestyle: ["restaurants", "cafes", "greenspaces"],
  noise: "balanced",
  wantsNightlifeNearby: true,
  wantsParksNearby: true,
  hasYoungKids: false,
  yearsPlanned: 3,
  buildingStyles: ["boutique_victorian", "mom_and_pop"],
};

export const COMMUTE_MODE_LABELS: Record<DiscoveryCommuteMode, string> = {
  rail: "Rail (BART / Muni Metro / Caltrain)",
  bus: "Bus",
  drive: "Car",
  bike: "Bike",
  walk: "Walk",
};

export const LIFESTYLE_LABELS: Record<LifestyleInterest, string> = {
  greenspaces: "Hang in Greenspaces",
  restaurants: "Restaurants",
  nightlife: "Bars & nightlife",
  cafes: "Cafés",
  fitness: "Fitness & outdoor",
  quiet_walks: "Quiet walks",
  cultural: "Cultural activities",
};

export const BUILDING_STYLE_LABELS: Record<BuildingStyle, string> = {
  large_buildings: "Large apartment buildings",
  small_buildings: "Small buildings",
  mom_and_pop: "Mom-and-pop owned",
  boutique_victorian: "Boutique / Victorian-style",
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

// Pick the best (lowest-minute) reachable commute mode the user is willing to
// take. Returns null when the destination has no anchor or no mode is workable.
export interface BestCommute {
  minutes: number;
  mode: DiscoveryCommuteMode;
}

export function pickBestCommute(
  neighborhood: Neighborhood,
  answers: DiscoveryAnswers,
): BestCommute | null {
  const anchor = neighborhood.commuteAnchors[answers.commuteDestination];
  if (!anchor) return null;
  const allowed = answers.commuteModes.length > 0
    ? answers.commuteModes
    : (Object.keys(anchor) as DiscoveryCommuteMode[]).filter(
        (m): m is DiscoveryCommuteMode =>
          m === "rail" || m === "bus" || m === "drive" || m === "bike" || m === "walk",
      );
  let best: BestCommute | null = null;
  for (const mode of allowed) {
    const raw = anchor[mode];
    if (raw === undefined || raw === null || raw >= COMMUTE_UNREACHABLE) continue;
    if (!best || raw < best.minutes) best = { minutes: raw, mode };
  }
  return best;
}

// Given a per-mode commute time (minutes) and the user's max, return a 0..100 score.
function commuteScoreFromMinutes(minutes: number, cap: number): number {
  const safeCap = Math.max(1, cap);
  if (minutes <= safeCap * 0.5) return 100;
  if (minutes <= safeCap) {
    const t = (minutes - safeCap * 0.5) / (safeCap * 0.5);
    return clamp(100 - t * 40);
  }
  const overshoot = minutes - safeCap;
  return clamp(60 - overshoot * 2);
}

// Map the user's 1..(many) years preference into a stability weight. Short
// stays don't care about long-term stability; long stays heavily reward it.
function tenureFitScore(neighborhood: Neighborhood, years: number): number {
  const stable = neighborhood.traits.longTermStability;
  if (!Number.isFinite(years) || years <= 0) return stable; // fall through neutrally
  if (years <= 2) {
    // Short tenure: stability still nice but vibe-tilted neighborhoods are fine.
    return clamp(60 + (stable - 60) * 0.3);
  }
  if (years <= 5) return stable;
  // 5+ years — penalize unstable neighborhoods more.
  return clamp(stable * 1.1 - 10);
}

function noiseScore(neighborhood: Neighborhood, pref: DiscoveryAnswers["noise"]): number {
  const noise = neighborhood.traits.noiseLevel; // 0 quiet .. 100 loud
  if (pref === "quiet") return clamp(100 - noise);
  if (pref === "lively") return clamp(noise + 5); // tiny bias toward lively
  // balanced: peaks around noise=50
  const dist = Math.abs(noise - 50);
  return clamp(100 - dist * 1.4);
}

function familyScore(neighborhood: Neighborhood, hasKids: boolean): number {
  if (!hasKids) return 70; // neutral-positive — does not penalize neighborhoods.
  return neighborhood.traits.familyFriendliness;
}

function parksScore(neighborhood: Neighborhood, wants: boolean): number {
  if (!wants) return 60;
  return neighborhood.traits.parkAccess;
}

function nightlifeScore(neighborhood: Neighborhood, wants: boolean): number {
  if (!wants) {
    // Slight bonus for low-nightlife if user explicitly opted out.
    return clamp(100 - neighborhood.traits.nightlifeDensity * 0.6);
  }
  // Blend nightlife density with restaurant signature heuristic.
  return clamp(neighborhood.traits.nightlifeDensity * 0.7 + neighborhood.scores.food * 0.3);
}

function lifestyleScore(neighborhood: Neighborhood, interests: LifestyleInterest[]): number {
  if (interests.length === 0) return 70;
  const t = neighborhood.traits;
  const map: Record<LifestyleInterest, number> = {
    greenspaces: t.parkAccess,
    restaurants: neighborhood.scores.food,
    nightlife: t.nightlifeDensity,
    cafes: t.cafeDensity,
    fitness: t.fitnessAccess,
    quiet_walks: t.quietWalkability,
    cultural: t.culturalDensity,
  };
  const sum = interests.reduce((s, k) => s + map[k], 0);
  return sum / interests.length;
}

function housingScore(neighborhood: Neighborhood, styles: BuildingStyle[]): number {
  if (styles.length === 0) return 70;
  const stock = neighborhood.traits.housingStock;
  const map: Record<BuildingStyle, number> = {
    large_buildings: stock.largeBuildings,
    small_buildings: stock.smallBuildings,
    mom_and_pop: stock.momAndPop,
    boutique_victorian: stock.boutiqueVictorian,
  };
  // Best-of: how well does this neighborhood satisfy ANY of the user's picks?
  // Using max-of preserves the "I want one of these" semantics rather than
  // averaging away a strong match.
  const best = Math.max(...styles.map((s) => map[s]));
  return clamp(40 + best * 60);
}

// Build a small set of human-readable reasons for the recommendation card.
function buildReasons(
  n: Neighborhood,
  answers: DiscoveryAnswers,
  best: BestCommute | null,
  components: DiscoveryRecommendation["components"],
): DiscoveryReason[] {
  const reasons: DiscoveryReason[] = [];

  // Commute
  if (best && best.minutes <= answers.commuteMaxMinutes) {
    reasons.push({
      key: "commute",
      positive: true,
      text: `~${best.minutes} min by ${COMMUTE_MODE_LABELS[best.mode].toLowerCase()} to ${answers.commuteDestination}.`,
    });
  } else if (best) {
    reasons.push({
      key: "commute",
      positive: false,
      text: `Best commute is ${best.minutes} min by ${COMMUTE_MODE_LABELS[best.mode].toLowerCase()} — over your ${answers.commuteMaxMinutes} min cap.`,
    });
  } else if (!n.commuteAnchors[answers.commuteDestination]) {
    reasons.push({
      key: "commute",
      positive: false,
      text: `We don't have a commute estimate from ${n.name} to ${answers.commuteDestination} yet.`,
    });
  } else {
    reasons.push({
      key: "commute",
      positive: false,
      text: `No workable route from ${n.name} to ${answers.commuteDestination} with the modes you allowed.`,
    });
  }

  // Noise
  if (components.noise >= 75) {
    const label = answers.noise === "quiet" ? "library-quiet" : answers.noise === "lively" ? "lively" : "balanced";
    reasons.push({
      key: "noise",
      positive: true,
      text: `Reads ${label} — matches your noise preference.`,
    });
  } else if (components.noise <= 35) {
    reasons.push({
      key: "noise",
      positive: false,
      text:
        answers.noise === "quiet"
          ? `Louder than you asked for — noise level ~${n.traits.noiseLevel}/100.`
          : `Quieter than you'd like — noise level ~${n.traits.noiseLevel}/100.`,
    });
  }

  // Lifestyle
  if (answers.lifestyle.length > 0 && components.lifestyle >= 75) {
    const interestNames = answers.lifestyle.slice(0, 3).map((i) => LIFESTYLE_LABELS[i].toLowerCase());
    reasons.push({
      key: "lifestyle",
      positive: true,
      text: `Strong fit for ${interestNames.join(", ")}.`,
    });
  }

  // Parks
  if (answers.wantsParksNearby && n.traits.parkAccess >= 75) {
    reasons.push({
      key: "parks",
      positive: true,
      text: `Park access is excellent — ${n.signature.parks.split(",")[0]} nearby.`,
    });
  } else if (answers.wantsParksNearby && n.traits.parkAccess < 50) {
    reasons.push({
      key: "parks",
      positive: false,
      text: `Light on parks — limited green space within easy reach.`,
    });
  }

  // Nightlife / restaurants
  if (answers.wantsNightlifeNearby && n.traits.nightlifeDensity >= 70) {
    reasons.push({
      key: "nightlife",
      positive: true,
      text: `Plenty of bars & restaurants — ${n.signature.nightlife.split(",")[0]} on the rotation.`,
    });
  } else if (!answers.wantsNightlifeNearby && n.traits.nightlifeDensity <= 40) {
    reasons.push({
      key: "nightlife",
      positive: true,
      text: `Quiet on the bar/restaurant front, the way you wanted.`,
    });
  } else if (answers.wantsNightlifeNearby && n.traits.nightlifeDensity < 40) {
    reasons.push({
      key: "nightlife",
      positive: false,
      text: `Bar & restaurant scene is sparse compared to what you asked for.`,
    });
  }

  // Family
  if (answers.hasYoungKids && n.traits.familyFriendliness >= 80) {
    reasons.push({
      key: "family",
      positive: true,
      text: `Family-friendly — calm streets, parks, and a kid-aware main drag.`,
    });
  } else if (answers.hasYoungKids && n.traits.familyFriendliness < 60) {
    reasons.push({
      key: "family",
      positive: false,
      text: `Less of a fit for young kids — busy or thin on family infrastructure.`,
    });
  }

  // Tenure
  if (answers.yearsPlanned >= 5 && n.traits.longTermStability >= 80) {
    reasons.push({
      key: "tenure",
      positive: true,
      text: `Holds up over a long stay — stable rents and mature housing stock.`,
    });
  } else if (answers.yearsPlanned >= 5 && n.traits.longTermStability < 60) {
    reasons.push({
      key: "tenure",
      positive: false,
      text: `Less of a long-term anchor — turnover here is higher than the city average.`,
    });
  }

  // Housing
  if (answers.buildingStyles.length > 0 && components.housing >= 80) {
    const styleNames = answers.buildingStyles.map((s) => BUILDING_STYLE_LABELS[s].toLowerCase());
    reasons.push({
      key: "housing",
      positive: true,
      text: `Housing stock matches what you want: ${styleNames.slice(0, 2).join(" / ")}.`,
    });
  } else if (answers.buildingStyles.length > 0 && components.housing < 55) {
    reasons.push({
      key: "housing",
      positive: false,
      text: `Building stock here doesn't lean toward the styles you picked.`,
    });
  }

  return reasons;
}

// Score a single neighborhood against the discovery answers. All inputs are
// well-formed (the form layer enforces this), but unknown destination /
// no-allowed-mode degrades to a 0 commute score with a clear reason rather
// than crashing.
export function scoreNeighborhoodForDiscovery(
  neighborhood: Neighborhood,
  answers: DiscoveryAnswers,
): DiscoveryRecommendation {
  const best = pickBestCommute(neighborhood, answers);
  const commute = best ? commuteScoreFromMinutes(best.minutes, answers.commuteMaxMinutes) : 0;
  const lifestyle = lifestyleScore(neighborhood, answers.lifestyle);
  const noise = noiseScore(neighborhood, answers.noise);
  const family = familyScore(neighborhood, answers.hasYoungKids);
  const nightlife = nightlifeScore(neighborhood, answers.wantsNightlifeNearby);
  const parks = parksScore(neighborhood, answers.wantsParksNearby);
  const tenure = tenureFitScore(neighborhood, answers.yearsPlanned);
  const housing = housingScore(neighborhood, answers.buildingStyles);

  const components = {
    commute,
    lifestyle,
    noise,
    family,
    nightlife,
    parks,
    tenure,
    housing,
  };

  // Weighting: commute and noise carry the most. Family is heavy only if the
  // user said yes to kids; otherwise its weight collapses (familyScore returns
  // a neutral 70 in that case).
  const weights = {
    commute: 0.28,
    lifestyle: 0.16,
    noise: 0.12,
    family: answers.hasYoungKids ? 0.14 : 0.04,
    nightlife: 0.08,
    parks: answers.wantsParksNearby ? 0.1 : 0.04,
    tenure: answers.yearsPlanned >= 5 ? 0.1 : 0.06,
    housing: 0.12,
  } as const;

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
  const weighted =
    (components.commute * weights.commute +
      components.lifestyle * weights.lifestyle +
      components.noise * weights.noise +
      components.family * weights.family +
      components.nightlife * weights.nightlife +
      components.parks * weights.parks +
      components.tenure * weights.tenure +
      components.housing * weights.housing) /
    totalWeight;

  const reasons = buildReasons(neighborhood, answers, best, components);

  return {
    neighborhood,
    total: clamp(weighted),
    commuteMinutes: best ? best.minutes : null,
    commuteMode: best ? best.mode : null,
    reasons,
    components,
  };
}

export function rankNeighborhoodsForDiscovery(
  neighborhoods: Neighborhood[],
  answers: DiscoveryAnswers,
): DiscoveryRecommendation[] {
  return neighborhoods
    .map((n) => scoreNeighborhoodForDiscovery(n, answers))
    .sort((a, b) => b.total - a.total);
}

// Map the discovery answers onto the existing SearchCriteria shape so the
// listing-side scoring engine continues to work. Bedroom/budget/etc. stay on
// the SearchCriteria side (the user can refine those after discovery).
export function discoveryCommuteToLegacyMode(
  modes: DiscoveryCommuteMode[],
): "transit" | "walk" | "bike" | "drive" {
  // Prefer the lowest-friction mode the user allowed.
  if (modes.includes("rail") || modes.includes("bus")) return "transit";
  if (modes.includes("drive")) return "drive";
  if (modes.includes("bike")) return "bike";
  if (modes.includes("walk")) return "walk";
  return "transit";
}
