import { describe, expect, it } from "vitest";
import { LISTINGS } from "@/lib/data/listings";
import { NEIGHBORHOODS, findNeighborhood } from "@/lib/data/neighborhoods";
import { DEFAULT_CRITERIA } from "@/lib/defaults";
import {
  affordabilityScore,
  amenityScore,
  commuteScore,
  normalizeBudget,
  normalizeWeights,
  rankNeighborhoods,
  scoreListing,
} from "@/lib/scoring";
import type { SearchCriteria } from "@/lib/types";

const criteria = (overrides: Partial<SearchCriteria> = {}): SearchCriteria => ({
  ...DEFAULT_CRITERIA,
  ...overrides,
});

describe("normalizeWeights", () => {
  it("normalizes positive weights to sum to 1", () => {
    const out = normalizeWeights({
      safety: 4,
      commute: 4,
      food: 2,
      vibe: 2,
      affordability: 4,
      amenities: 1,
      responsiveness: 3,
    });
    const sum = Object.values(out).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1);
  });

  it("falls back to even distribution when total is zero", () => {
    const out = normalizeWeights({
      safety: 0,
      commute: 0,
      food: 0,
      vibe: 0,
      affordability: 0,
      amenities: 0,
      responsiveness: 0,
    });
    Object.values(out).forEach((v) => expect(v).toBeCloseTo(1 / 7));
  });
});

describe("affordabilityScore", () => {
  const listing = LISTINGS[0]; // $3150
  it("returns 100 at or below the lower bound", () => {
    expect(affordabilityScore(listing, criteria({ budgetMin: 4000, budgetMax: 5000 }))).toBe(100);
  });
  it("scores in-band rent above 70", () => {
    const s = affordabilityScore(listing, criteria({ budgetMin: 2500, budgetMax: 3500 }));
    expect(s).toBeGreaterThan(70);
    expect(s).toBeLessThanOrEqual(100);
  });
  it("penalizes rent above the cap", () => {
    const s = affordabilityScore(listing, criteria({ budgetMin: 1500, budgetMax: 2000 }));
    expect(s).toBeLessThan(70);
  });
});

describe("amenityScore", () => {
  const listing = LISTINGS[0]; // in_unit_laundry, pet_friendly, dishwasher
  it("rewards exact matches", () => {
    const s = amenityScore(listing, criteria({ amenities: ["in_unit_laundry", "pet_friendly"] }));
    expect(s).toBe(100);
  });
  it("partial overlap scores between 40 and 100", () => {
    const s = amenityScore(listing, criteria({ amenities: ["in_unit_laundry", "pool"] }));
    expect(s).toBeGreaterThan(40);
    expect(s).toBeLessThan(100);
  });
  it("falls back to amenity count when user has no asks", () => {
    const s = amenityScore(listing, criteria({ amenities: [] }));
    expect(s).toBeGreaterThan(60);
  });
});

describe("commuteScore", () => {
  it("scores 100 well under cap", () => {
    const n = findNeighborhood("mission-bay")!;
    const { score } = commuteScore(
      n,
      criteria({ commute: { destination: "Mission Bay, SF", maxMinutes: 30, mode: "transit" } }),
    );
    expect(score).toBe(100);
  });

  it("drops below 60 when minutes exceed the cap", () => {
    const n = findNeighborhood("outer-sunset")!;
    const { score, minutes } = commuteScore(
      n,
      criteria({ commute: { destination: "Mission Bay, SF", maxMinutes: 20, mode: "transit" } }),
    );
    expect(minutes).toBeGreaterThan(20);
    expect(score).toBeLessThan(60);
  });

  it("returns zero for unreachable modes and marks as unavailable", () => {
    const n = findNeighborhood("rockridge")!;
    const result = commuteScore(
      n,
      criteria({ commute: { destination: "Mission Bay, SF", maxMinutes: 30, mode: "walk" } }),
    );
    expect(result.score).toBe(0);
    expect(result.available).toBe(false);
    expect(result.minutes).toBeNull();
    expect(result.reason).toBe("unreachable_mode");
  });

  it("returns unavailable for a destination with no anchor", () => {
    const n = findNeighborhood("mission")!;
    const result = commuteScore(
      n,
      criteria({ commute: { destination: "Reykjavík", maxMinutes: 30, mode: "transit" } }),
    );
    expect(result.available).toBe(false);
    expect(result.minutes).toBeNull();
    expect(result.score).toBe(0);
    expect(result.reason).toBe("missing_anchor");
  });
});

describe("scoreListing", () => {
  it("produces 0..100 totals with reasons for every factor", () => {
    const listing = LISTINGS[0];
    const n = findNeighborhood(listing.neighborhoodId)!;
    const result = scoreListing(listing, n, criteria());
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.factors).toHaveLength(7);
    result.factors.forEach((f) => {
      expect(f.reason.length).toBeGreaterThan(0);
      expect(f.weight).toBeGreaterThanOrEqual(0);
      expect(f.rawScore).toBeGreaterThanOrEqual(0);
      expect(f.rawScore).toBeLessThanOrEqual(100);
    });
  });

  it("warns when listing is over budget", () => {
    const listing = LISTINGS.find((l) => l.id === "lst-006")!; // $4100
    const n = findNeighborhood(listing.neighborhoodId)!;
    const result = scoreListing(
      listing,
      n,
      criteria({ budgetMin: 2500, budgetMax: 3500 }),
    );
    expect(result.warnings.some((w) => w.toLowerCase().includes("budget"))).toBe(true);
  });

  it("warns when bedrooms differ from request", () => {
    const studio = LISTINGS.find((l) => l.bedrooms === 0)!;
    const n = findNeighborhood(studio.neighborhoodId)!;
    const result = scoreListing(studio, n, criteria({ bedrooms: 1 }));
    expect(result.warnings.some((w) => w.toLowerCase().includes("studio"))).toBe(true);
  });
});

describe("normalizeBudget", () => {
  it("returns inputs as-is when valid", () => {
    const b = normalizeBudget(criteria({ budgetMin: 2000, budgetMax: 3000 }));
    expect(b).toEqual({ min: 2000, max: 3000, inverted: false, invalid: false });
  });
  it("swaps min and max when inverted", () => {
    const b = normalizeBudget(criteria({ budgetMin: 4000, budgetMax: 2000 }));
    expect(b.min).toBe(2000);
    expect(b.max).toBe(4000);
    expect(b.inverted).toBe(true);
  });
  it("flags invalid when a bound is NaN", () => {
    const b = normalizeBudget(criteria({ budgetMin: NaN as unknown as number, budgetMax: 3000 }));
    expect(b.invalid).toBe(true);
  });
});

describe("scoreListing — robustness", () => {
  it("survives inverted budgets and still scores affordability sensibly", () => {
    const listing = LISTINGS[0]; // $3150
    const n = findNeighborhood(listing.neighborhoodId)!;
    const result = scoreListing(listing, n, criteria({ budgetMin: 5000, budgetMax: 2500 }));
    expect(Number.isFinite(result.total)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("does not crash and warns when commute destination has no anchor", () => {
    const listing = LISTINGS[0];
    const n = findNeighborhood(listing.neighborhoodId)!;
    const result = scoreListing(
      listing,
      n,
      criteria({ commute: { destination: "Atlantis", maxMinutes: 30, mode: "transit" } }),
    );
    expect(result.warnings.some((w) => w.toLowerCase().includes("commute"))).toBe(true);
  });

  it("never surfaces the 999 internal sentinel in user-visible reasons or warnings", () => {
    const listing = LISTINGS.find((l) => l.neighborhoodId === "rockridge")!;
    const n = findNeighborhood("rockridge")!;
    const result = scoreListing(
      listing,
      n,
      criteria({ commute: { destination: "Mission Bay, SF", maxMinutes: 30, mode: "walk" } }),
    );
    const allText = [
      ...result.warnings,
      ...result.factors.map((f) => f.reason),
      ...result.matchHighlights,
    ].join(" | ");
    expect(allText).not.toMatch(/999/);
  });

  it("total equals the sum of factor contributions (clamped 0..100)", () => {
    const listing = LISTINGS[0];
    const n = findNeighborhood(listing.neighborhoodId)!;
    const result = scoreListing(listing, n, criteria());
    const sum = result.factors.reduce((s, f) => s + f.contribution, 0);
    const expected = Math.max(0, Math.min(100, sum));
    expect(result.total).toBeCloseTo(expected, 5);
  });

  it("warns when the listing's available date is later than the user's move-in", () => {
    const listing = LISTINGS.find((l) => l.id === "lst-005")!; // available 2026-07-01
    const n = findNeighborhood(listing.neighborhoodId)!;
    const result = scoreListing(listing, n, criteria({ moveInBy: "2026-06-01" }));
    expect(result.warnings.some((w) => w.toLowerCase().includes("move-in"))).toBe(true);
  });
});

describe("rankNeighborhoods", () => {
  it("returns neighborhoods sorted descending by total", () => {
    const ranked = rankNeighborhoods(NEIGHBORHOODS, LISTINGS, DEFAULT_CRITERIA);
    expect(ranked).toHaveLength(NEIGHBORHOODS.length);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].total).toBeGreaterThanOrEqual(ranked[i].total);
    }
  });

  it("boosts a preferred neighborhood relative to the same criteria without preference", () => {
    const baseline = rankNeighborhoods(NEIGHBORHOODS, LISTINGS, criteria({ preferredNeighborhoods: [] }));
    const preferred = rankNeighborhoods(
      NEIGHBORHOODS,
      LISTINGS,
      criteria({ preferredNeighborhoods: ["outer-sunset"] }),
    );
    const baseSunset = baseline.find((n) => n.neighborhood.id === "outer-sunset")!;
    const prefSunset = preferred.find((n) => n.neighborhood.id === "outer-sunset")!;
    expect(prefSunset.total).toBeGreaterThan(baseSunset.total);
  });
});
