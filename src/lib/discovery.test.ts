import { describe, expect, it } from "vitest";
import { LISTINGS } from "@/lib/data/listings";
import { NEIGHBORHOODS, findNeighborhood } from "@/lib/data/neighborhoods";
import {
  DEFAULT_DISCOVERY_ANSWERS,
  discoveryCommuteToLegacyMode,
  pickBestCommute,
  rankNeighborhoodsForDiscovery,
  scoreNeighborhoodForDiscovery,
} from "@/lib/discovery";
import type { DiscoveryAnswers } from "@/lib/types";

const answers = (overrides: Partial<DiscoveryAnswers> = {}): DiscoveryAnswers => ({
  ...DEFAULT_DISCOVERY_ANSWERS,
  ...overrides,
});

describe("pickBestCommute", () => {
  it("picks the lowest-minute mode the user allows", () => {
    const n = findNeighborhood("mission")!;
    const best = pickBestCommute(
      n,
      answers({
        commuteDestination: "Mission Bay, SF",
        commuteModes: ["rail", "bus", "drive", "bike", "walk"],
      }),
    );
    // drive=14 is lowest in the anchor; rail=24, bus=22, bike=18, walk=55
    expect(best).toEqual({ minutes: 14, mode: "drive" });
  });

  it("excludes a mode when the user filters it out", () => {
    const n = findNeighborhood("mission")!;
    const best = pickBestCommute(
      n,
      answers({
        commuteDestination: "Mission Bay, SF",
        commuteModes: ["rail", "bus", "bike", "walk"], // no drive
      }),
    );
    // bike=18 next-lowest after the excluded drive
    expect(best).toEqual({ minutes: 18, mode: "bike" });
  });

  it("returns null for an unknown destination (no anchor)", () => {
    const n = findNeighborhood("mission")!;
    const best = pickBestCommute(
      n,
      answers({ commuteDestination: "Reykjavík", commuteModes: ["rail"] }),
    );
    expect(best).toBeNull();
  });

  it("returns null when the only allowed mode is unreachable (sentinel)", () => {
    const n = findNeighborhood("rockridge")!;
    // Bus and bike are sentinel-marked unreachable for Mission Bay from Rockridge.
    const best = pickBestCommute(
      n,
      answers({
        commuteDestination: "Mission Bay, SF",
        commuteModes: ["bus", "bike"],
      }),
    );
    expect(best).toBeNull();
  });

  it("filters buses out without removing rail", () => {
    const n = findNeighborhood("mission")!;
    const best = pickBestCommute(
      n,
      answers({ commuteDestination: "Mission Bay, SF", commuteModes: ["rail"] }),
    );
    expect(best?.mode).toBe("rail");
  });
});

describe("scoreNeighborhoodForDiscovery", () => {
  it("scores between 0 and 100 with at least one reason", () => {
    const n = findNeighborhood("hayes-valley")!;
    const r = scoreNeighborhoodForDiscovery(n, answers());
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("never surfaces the 999 internal sentinel in reasons", () => {
    const n = findNeighborhood("rockridge")!;
    const r = scoreNeighborhoodForDiscovery(
      n,
      answers({ commuteDestination: "Mission Bay, SF", commuteModes: ["bus"] }),
    );
    const text = r.reasons.map((x) => x.text).join(" ");
    expect(text).not.toMatch(/999/);
  });

  it("degrades gracefully with an unknown destination", () => {
    const n = findNeighborhood("mission")!;
    const r = scoreNeighborhoodForDiscovery(
      n,
      answers({ commuteDestination: "Atlantis", commuteModes: ["rail", "drive"] }),
    );
    expect(r.commuteMinutes).toBeNull();
    expect(r.commuteMode).toBeNull();
    expect(r.components.commute).toBe(0);
    expect(r.reasons.some((x) => x.key === "commute" && !x.positive)).toBe(true);
  });

  it("degrades gracefully when no allowed mode is reachable", () => {
    const n = findNeighborhood("rockridge")!;
    const r = scoreNeighborhoodForDiscovery(
      n,
      answers({ commuteDestination: "Mission Bay, SF", commuteModes: ["walk"] }),
    );
    expect(r.commuteMinutes).toBeNull();
    expect(r.components.commute).toBe(0);
  });

  it("rewards a quiet user picking Outer Sunset over Mission", () => {
    const sunset = findNeighborhood("outer-sunset")!;
    const mission = findNeighborhood("mission")!;
    const a = answers({
      noise: "quiet",
      commuteDestination: "Mission Bay, SF",
      commuteModes: ["drive", "rail"],
    });
    const sScore = scoreNeighborhoodForDiscovery(sunset, a).components.noise;
    const mScore = scoreNeighborhoodForDiscovery(mission, a).components.noise;
    expect(sScore).toBeGreaterThan(mScore);
  });

  it("rewards a lively user picking Mission over Outer Sunset", () => {
    const sunset = findNeighborhood("outer-sunset")!;
    const mission = findNeighborhood("mission")!;
    const a = answers({ noise: "lively" });
    expect(
      scoreNeighborhoodForDiscovery(mission, a).components.noise,
    ).toBeGreaterThan(scoreNeighborhoodForDiscovery(sunset, a).components.noise);
  });

  it("favors family-friendly neighborhoods when hasYoungKids is true", () => {
    const noe = findNeighborhood("noe-valley")!;
    const mission = findNeighborhood("mission")!;
    const withKids = answers({ hasYoungKids: true });
    const without = answers({ hasYoungKids: false });
    const noeWith = scoreNeighborhoodForDiscovery(noe, withKids).total;
    const missionWith = scoreNeighborhoodForDiscovery(mission, withKids).total;
    const noeWithout = scoreNeighborhoodForDiscovery(noe, without).total;
    const missionWithout = scoreNeighborhoodForDiscovery(mission, without).total;
    // Noe should benefit more from kids being on than Mission does.
    expect(noeWith - missionWith).toBeGreaterThan(noeWithout - missionWithout);
  });

  it("rewards parks-near preference for park-rich neighborhoods", () => {
    const sunset = findNeighborhood("outer-sunset")!;
    const wantParks = scoreNeighborhoodForDiscovery(
      sunset,
      answers({ wantsParksNearby: true }),
    ).components.parks;
    const dontCare = scoreNeighborhoodForDiscovery(
      sunset,
      answers({ wantsParksNearby: false }),
    ).components.parks;
    expect(wantParks).toBeGreaterThan(dontCare);
  });

  it("rewards housing match for boutique-victorian seekers in Hayes Valley", () => {
    const hv = findNeighborhood("hayes-valley")!;
    const mb = findNeighborhood("mission-bay")!;
    const a = answers({ buildingStyles: ["boutique_victorian"] });
    const hvHousing = scoreNeighborhoodForDiscovery(hv, a).components.housing;
    const mbHousing = scoreNeighborhoodForDiscovery(mb, a).components.housing;
    expect(hvHousing).toBeGreaterThan(mbHousing);
  });

  it("rewards large-building preference in Mission Bay over Noe Valley", () => {
    const mb = findNeighborhood("mission-bay")!;
    const noe = findNeighborhood("noe-valley")!;
    const a = answers({ buildingStyles: ["large_buildings"] });
    expect(scoreNeighborhoodForDiscovery(mb, a).components.housing).toBeGreaterThan(
      scoreNeighborhoodForDiscovery(noe, a).components.housing,
    );
  });

  it("commute weight makes faster commutes win, all else equal", () => {
    // Mission Bay is 5 min from itself; Outer Sunset is 25+ min by drive.
    const a = answers({
      commuteDestination: "Mission Bay, SF",
      commuteMaxMinutes: 30,
      commuteModes: ["drive"],
    });
    const mb = scoreNeighborhoodForDiscovery(findNeighborhood("mission-bay")!, a);
    const os = scoreNeighborhoodForDiscovery(findNeighborhood("outer-sunset")!, a);
    expect(mb.components.commute).toBeGreaterThan(os.components.commute);
  });
});

describe("rankNeighborhoodsForDiscovery", () => {
  it("returns one recommendation per neighborhood, sorted descending", () => {
    const ranked = rankNeighborhoodsForDiscovery(NEIGHBORHOODS, DEFAULT_DISCOVERY_ANSWERS);
    expect(ranked).toHaveLength(NEIGHBORHOODS.length);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].total).toBeGreaterThanOrEqual(ranked[i].total);
    }
  });

  it("a family with kids ranks Noe Valley higher than a singles-clubbing query", () => {
    const family = rankNeighborhoodsForDiscovery(
      NEIGHBORHOODS,
      answers({
        hasYoungKids: true,
        noise: "quiet",
        wantsNightlifeNearby: false,
        wantsParksNearby: true,
        lifestyle: ["parks", "quiet_walks"],
      }),
    );
    const singles = rankNeighborhoodsForDiscovery(
      NEIGHBORHOODS,
      answers({
        hasYoungKids: false,
        noise: "lively",
        wantsNightlifeNearby: true,
        wantsParksNearby: false,
        lifestyle: ["nightlife", "restaurants"],
      }),
    );
    const noeFamilyRank = family.findIndex((r) => r.neighborhood.id === "noe-valley");
    const noeSinglesRank = singles.findIndex((r) => r.neighborhood.id === "noe-valley");
    expect(noeFamilyRank).toBeLessThan(noeSinglesRank);
  });
});

describe("listing filtering by accepted neighborhoods", () => {
  // Mirrors the page-level logic — no listings outside accepted set surface.
  function filteredListings(accepted: Set<string>) {
    if (accepted.size === 0) return LISTINGS;
    return LISTINGS.filter((l) => accepted.has(l.neighborhoodId));
  }

  it("returns only listings from accepted neighborhoods", () => {
    const accepted = new Set(["hayes-valley", "noe-valley"]);
    const out = filteredListings(accepted);
    expect(out.length).toBeGreaterThan(0);
    out.forEach((l) => expect(accepted.has(l.neighborhoodId)).toBe(true));
    // Ensure we're actually filtering — at least one Mission listing should be excluded.
    expect(out.some((l) => l.neighborhoodId === "mission")).toBe(false);
  });

  it("returns all listings when no accepted set is provided", () => {
    expect(filteredListings(new Set()).length).toBe(LISTINGS.length);
  });
});

describe("discoveryCommuteToLegacyMode", () => {
  it("maps rail/bus to transit", () => {
    expect(discoveryCommuteToLegacyMode(["rail"])).toBe("transit");
    expect(discoveryCommuteToLegacyMode(["bus"])).toBe("transit");
    expect(discoveryCommuteToLegacyMode(["rail", "bus", "drive"])).toBe("transit");
  });
  it("falls through to drive/bike/walk when rail/bus excluded", () => {
    expect(discoveryCommuteToLegacyMode(["drive", "bike"])).toBe("drive");
    expect(discoveryCommuteToLegacyMode(["bike", "walk"])).toBe("bike");
    expect(discoveryCommuteToLegacyMode(["walk"])).toBe("walk");
  });
  it("defaults to transit on empty input", () => {
    expect(discoveryCommuteToLegacyMode([])).toBe("transit");
  });
});
