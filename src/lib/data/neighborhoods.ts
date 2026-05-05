import type { Neighborhood } from "@/lib/types";

// Mock neighborhood data. Replace with scraped/aggregated data sources later.
// Anchors used in commute scoring should match values referenced by the UI
// commute destinations.
//
// `transit` remains the legacy best-of rail+bus value used by the existing
// listing-side scoring path. The discovery flow picks among rail/bus/drive/
// bike/walk individually so users can exclude e.g. buses.
//
// Use 999 for unreachable modes — the scoring layer translates that into a
// human-friendly "not reachable by X" message and never surfaces the number.
export const NEIGHBORHOODS: Neighborhood[] = [
  {
    id: "mission",
    name: "Mission District",
    city: "San Francisco",
    blurb:
      "Sunny microclimate, taqueria royalty, and a small-business street life that hums after dark.",
    vibeTags: ["creative", "walkable", "late-night", "diverse"],
    signature: {
      coffee: "Ritual on Valencia, Four Barrel, Stanza",
      food: "La Taqueria, Foreign Cinema, Tartine Manufactory",
      nightlife: "Trick Dog, ABV, Make-Out Room",
      parks: "Dolores Park, Garfield Square",
    },
    medianRent1br: 3200,
    scores: { safety: 64, food: 96, vibe: 92, amenities: 88 },
    lat: 37.7599,
    lng: -122.4148,
    commuteAnchors: {
      "Mission Bay, SF": { transit: 22, rail: 24, bus: 22, walk: 55, bike: 18, drive: 14 },
      "Financial District, SF": { transit: 18, rail: 14, bus: 22, walk: 60, bike: 20, drive: 16 },
      "SoMa, SF": { transit: 14, rail: 12, bus: 16, walk: 35, bike: 12, drive: 10 },
      "Palo Alto, CA": { transit: 75, rail: 70, bus: 999, walk: 999, bike: 999, drive: 45 },
    },
    traits: {
      noiseLevel: 78,
      parkAccess: 70,
      familyFriendliness: 48,
      nightlifeDensity: 92,
      cafeDensity: 90,
      fitnessAccess: 70,
      quietWalkability: 45,
      culturalDensity: 78,
      longTermStability: 65,
      housingStock: {
        largeBuildings: 0.1,
        smallBuildings: 0.25,
        momAndPop: 0.3,
        boutiqueVictorian: 0.5,
      },
    },
  },
  {
    id: "hayes-valley",
    name: "Hayes Valley",
    city: "San Francisco",
    blurb:
      "Boutique-lined blocks, opera-house adjacency, and the kind of patisserie line you actually wait in.",
    vibeTags: ["refined", "walkable", "design-y"],
    signature: {
      coffee: "Ritual at Octavia, Blue Bottle Linden",
      food: "Rich Table, Souvla, Nopa (across Divisadero)",
      nightlife: "Smuggler's Cove, Anina, Two Sisters",
      parks: "Patricia's Green, Alamo Square",
    },
    medianRent1br: 3650,
    scores: { safety: 78, food: 90, vibe: 86, amenities: 84 },
    lat: 37.7765,
    lng: -122.4254,
    commuteAnchors: {
      "Mission Bay, SF": { transit: 25, rail: 25, bus: 28, walk: 65, bike: 18, drive: 14 },
      "Financial District, SF": { transit: 16, rail: 14, bus: 18, walk: 45, bike: 14, drive: 12 },
      "SoMa, SF": { transit: 12, rail: 10, bus: 14, walk: 30, bike: 10, drive: 8 },
      "Palo Alto, CA": { transit: 80, rail: 75, bus: 999, walk: 999, bike: 999, drive: 50 },
    },
    traits: {
      noiseLevel: 60,
      parkAccess: 72,
      familyFriendliness: 64,
      nightlifeDensity: 78,
      cafeDensity: 88,
      fitnessAccess: 72,
      quietWalkability: 68,
      culturalDensity: 90,
      longTermStability: 78,
      housingStock: {
        largeBuildings: 0.1,
        smallBuildings: 0.3,
        momAndPop: 0.25,
        boutiqueVictorian: 0.65,
      },
    },
  },
  {
    id: "noe-valley",
    name: "Noe Valley",
    city: "San Francisco",
    blurb:
      "Family-tilted main-street energy, sun-trap streets, and the city's quietest 24th Street nights.",
    vibeTags: ["calm", "family-friendly", "sunny"],
    signature: {
      coffee: "Bernie's, Martha & Bros, Haus Coffee",
      food: "Lupa, Saru, Firefly",
      nightlife: "The Valley Tavern (low key), wine at La Ciccia",
      parks: "Noe Valley Town Square, Upper Douglass Dog Park",
    },
    medianRent1br: 3450,
    scores: { safety: 88, food: 78, vibe: 70, amenities: 72 },
    lat: 37.7501,
    lng: -122.4337,
    commuteAnchors: {
      "Mission Bay, SF": { transit: 30, rail: 32, bus: 30, walk: 80, bike: 22, drive: 16 },
      "Financial District, SF": { transit: 28, rail: 24, bus: 32, walk: 999, bike: 28, drive: 18 },
      "SoMa, SF": { transit: 24, rail: 22, bus: 26, walk: 60, bike: 18, drive: 14 },
      "Palo Alto, CA": { transit: 70, rail: 65, bus: 999, walk: 999, bike: 999, drive: 40 },
    },
    traits: {
      noiseLevel: 30,
      parkAccess: 78,
      familyFriendliness: 92,
      nightlifeDensity: 32,
      cafeDensity: 65,
      fitnessAccess: 60,
      quietWalkability: 88,
      culturalDensity: 40,
      longTermStability: 90,
      housingStock: {
        largeBuildings: 0.05,
        smallBuildings: 0.2,
        momAndPop: 0.45,
        boutiqueVictorian: 0.7,
      },
    },
  },
  {
    id: "mission-bay",
    name: "Mission Bay",
    city: "San Francisco",
    blurb:
      "New-build skyline along the bay path, hospital and biotech anchors, and gym-on-every-corner energy.",
    vibeTags: ["modern", "quiet-evenings", "bayfront"],
    signature: {
      coffee: "Philz Mission Bay, Spark Social",
      food: "Mersea, The Ramp, Spark Social food trucks",
      nightlife: "Chase Center events, Hi Tops nearby",
      parks: "Mission Creek Park, China Basin Park",
    },
    medianRent1br: 3800,
    scores: { safety: 84, food: 64, vibe: 60, amenities: 82 },
    lat: 37.7706,
    lng: -122.3893,
    commuteAnchors: {
      "Mission Bay, SF": { transit: 5, rail: 6, bus: 8, walk: 10, bike: 5, drive: 4 },
      "Financial District, SF": { transit: 18, rail: 16, bus: 22, walk: 45, bike: 14, drive: 10 },
      "SoMa, SF": { transit: 10, rail: 9, bus: 14, walk: 25, bike: 8, drive: 7 },
      "Palo Alto, CA": { transit: 65, rail: 55, bus: 999, walk: 999, bike: 999, drive: 35 },
    },
    traits: {
      noiseLevel: 35,
      parkAccess: 72,
      familyFriendliness: 70,
      nightlifeDensity: 30,
      cafeDensity: 55,
      fitnessAccess: 92,
      quietWalkability: 82,
      culturalDensity: 50,
      longTermStability: 60,
      housingStock: {
        largeBuildings: 0.85,
        smallBuildings: 0.15,
        momAndPop: 0.0,
        boutiqueVictorian: 0.0,
      },
    },
  },
  {
    id: "outer-sunset",
    name: "Outer Sunset",
    city: "San Francisco",
    blurb:
      "Ocean Beach mornings, surf-shop hush, and a quietly excellent food row along Noriega.",
    vibeTags: ["beachy", "quiet", "coffee-forward"],
    signature: {
      coffee: "Trouble Coffee, Andytown, The Snug",
      food: "Outerlands, Hook Fish Co, Other Avenues co-op",
      nightlife: "Riptide, Lyle's, San Tung",
      parks: "Ocean Beach, Golden Gate Park",
    },
    medianRent1br: 2700,
    scores: { safety: 86, food: 76, vibe: 78, amenities: 64 },
    lat: 37.754,
    lng: -122.5022,
    commuteAnchors: {
      "Mission Bay, SF": { transit: 55, rail: 60, bus: 55, walk: 999, bike: 45, drive: 25 },
      "Financial District, SF": { transit: 50, rail: 50, bus: 55, walk: 999, bike: 45, drive: 25 },
      "SoMa, SF": { transit: 45, rail: 48, bus: 50, walk: 999, bike: 40, drive: 22 },
      "Palo Alto, CA": { transit: 90, rail: 85, bus: 999, walk: 999, bike: 999, drive: 45 },
    },
    traits: {
      noiseLevel: 22,
      parkAccess: 92,
      familyFriendliness: 84,
      nightlifeDensity: 28,
      cafeDensity: 60,
      fitnessAccess: 80,
      quietWalkability: 92,
      culturalDensity: 35,
      longTermStability: 85,
      housingStock: {
        largeBuildings: 0.05,
        smallBuildings: 0.15,
        momAndPop: 0.55,
        boutiqueVictorian: 0.4,
      },
    },
  },
  {
    id: "rockridge",
    name: "Rockridge",
    city: "Oakland",
    blurb:
      "Craftsman blocks off College Ave, BART-direct convenience, and a foodie main street that doesn't try too hard.",
    vibeTags: ["leafy", "transit-easy", "foodie"],
    signature: {
      coffee: "Hudson Bay Café, Highwire, Bicycle Coffee",
      food: "À Côté, Wood Tavern, Ramen Shop",
      nightlife: "The Kingfish Pub, College Ave wine bars",
      parks: "Frog Park, Claremont Canyon",
    },
    medianRent1br: 2500,
    scores: { safety: 82, food: 82, vibe: 80, amenities: 78 },
    lat: 37.8442,
    lng: -122.2519,
    commuteAnchors: {
      "Mission Bay, SF": { transit: 45, rail: 40, bus: 999, walk: 999, bike: 999, drive: 25 },
      "Financial District, SF": { transit: 25, rail: 22, bus: 999, walk: 999, bike: 999, drive: 22 },
      "SoMa, SF": { transit: 30, rail: 26, bus: 999, walk: 999, bike: 999, drive: 24 },
      "Palo Alto, CA": { transit: 90, rail: 80, bus: 999, walk: 999, bike: 999, drive: 50 },
    },
    traits: {
      noiseLevel: 35,
      parkAccess: 80,
      familyFriendliness: 88,
      nightlifeDensity: 40,
      cafeDensity: 78,
      fitnessAccess: 70,
      quietWalkability: 88,
      culturalDensity: 55,
      longTermStability: 86,
      housingStock: {
        largeBuildings: 0.05,
        smallBuildings: 0.2,
        momAndPop: 0.5,
        boutiqueVictorian: 0.55,
      },
    },
  },
];

export function findNeighborhood(id: string): Neighborhood | undefined {
  return NEIGHBORHOODS.find((n) => n.id === id);
}
