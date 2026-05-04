# HomeHound

> An AI-powered apartment-search agent that finds **neighborhoods** first, then the apartments inside them.

HomeHound scrapes (or, in this MVP, mocks) listings, scores them against what
matters to you — safety, commute, food, vibe, affordability, amenities, and
landlord responsiveness — and drafts the first-touch outreach so you can stop
refreshing tabs at 11pm.

This repository is a Next.js + TypeScript + Tailwind MVP built around a clean
domain model so future scraping or API integrations can replace mock data
without touching the UI.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** with a custom moss/clay palette and `Fraunces` display type
- **Vitest** for unit tests on the scoring engine
- No backend yet — all state is in-memory React state. Everything is structured
  so a Postgres/Prisma layer can be dropped in later (see _Next steps_).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm run test
npm run build
```

## CI

A GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push to
`main`/`feat/**`/`fix/**`/`chore/**` and on pull requests, and executes:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build`

No external secrets are required — the workflow runs entirely on
ubuntu-latest with Node 20.

## Deploying to Vercel

The repo includes a minimal `vercel.json` so Vercel auto-detects Next.js and
builds with `npm ci && next build`. There are two ways to wire up previews —
both require **external setup** (Vercel account + linking the repo) that
cannot be done from inside this repo:

**Option A — Vercel GitHub integration (recommended).**

1. Sign in at <https://vercel.com> and click _Add New → Project_.
2. Import the `crittercapital-llc/AptFinder` repo and grant Vercel access.
3. Accept the auto-detected Next.js settings (build = `next build`,
   output = `.next`, install = `npm ci`).
4. Click _Deploy_. Every PR will then get a preview URL posted by the Vercel
   bot as a check on the PR.

**Option B — Vercel CLI from a developer machine.**

```bash
npm i -g vercel
vercel login
vercel link        # link this repo to a Vercel project
vercel             # deploy a preview
vercel --prod      # deploy production
```

There are no Vercel-only environment variables in this repo today (all data
is mock and lives in `src/lib/data`). When real data sources land, add their
keys via the Vercel dashboard or `vercel env add`.

## Code map

```
src/
  app/
    page.tsx                 # main agent UI: criteria → ranked neighborhoods → outreach
    layout.tsx               # global font + metadata
    globals.css              # Tailwind layer + design tokens
  components/
    Header.tsx               # sticky brand bar
    Hero.tsx                 # value-prop intro
    CriteriaForm.tsx         # full intake (budget, beds, neighborhoods, weights, outreach)
    NeighborhoodSection.tsx  # neighborhood-first card with matching listings beneath
    ListingCard.tsx          # listing + transparent score breakdown
    OutreachPanel.tsx        # outreach drafts, copy-to-clipboard, regenerate, status
    ShortlistPanel.tsx       # shortlist drawer with count, jump, filter-only toggle
    ScoreBar.tsx             # accessible 0..100 bar
  lib/
    types.ts                 # canonical domain shapes
    scoring.ts               # weighted scoring engine + neighborhood ranking
    outreach.ts              # outreach draft generation + status helpers
    defaults.ts              # default criteria, amenity options, commute anchors
    data/
      neighborhoods.ts       # mock neighborhood index — replace with real source
      listings.ts            # mock listings — replace with real scraper output
```

## Scoring model

Each listing is scored on seven 0..100 factors:

| Factor          | Source                                                          |
| --------------- | --------------------------------------------------------------- |
| Safety          | Static neighborhood index (would be replaced by blended crime + walkability data) |
| Commute         | Computed at request time from neighborhood `commuteAnchors` and the user's mode/cap |
| Food            | Static neighborhood index, surfaced with signature spots in UI  |
| Vibe            | Static neighborhood index, +bump if user flagged as preferred   |
| Affordability   | Listing rent against user's budget band                         |
| Amenities       | Overlap between user wishlist and listing amenities             |
| Responsiveness  | Per-listing `landlordResponsiveness` (0..100)                   |

Users assign 0–5 importance to each factor. HomeHound normalizes those to
weights summing to 1.0, multiplies each factor's raw score by its weight, and
sums to a 0..100 overall match. The UI surfaces transparent reasons under
"Why this score" on every listing card.

Neighborhoods rank by the average match of their top 3 listings, with a small
bonus for explicitly preferred neighborhoods.

## Outreach workflow

The "Draft outreach" action on a listing builds an editable subject + body
based on the user's tone preference and criteria. Status moves through
`draft_ready → sent → replied → tour_scheduled` (or `passed`), each with a
prompted next step. **Nothing is sent externally** — this MVP is intentionally
draft-only.

## Replacing mock data

To wire in real listings or neighborhoods:

1. Implement a fetcher returning `Listing[]` / `Neighborhood[]` with the same
   shapes from `src/lib/types.ts`.
2. Replace the imports in `src/app/page.tsx` with server-fetched data
   (Next.js Server Components or a route handler).
3. The scoring engine (`src/lib/scoring.ts`) and UI continue to work without
   changes.

## Next steps (left for follow-ups)

- Persistence: Prisma schema for `SearchCriteria`, `Listing`, `Neighborhood`,
  `ScoredOutput`, `OutreachAction` — current types map 1:1.
- Real scrapers / RentSpree / Zillow API adapter feeding `LISTINGS`.
- Crime, walkability, and POI density data feeding `Neighborhood.scores`.
- A map view alongside the neighborhood ranking.
- Authenticated outreach delivery (with explicit per-send confirmation).

## Test IDs

All interactive elements expose stable `data-testid`s
(`listing-…`, `start-outreach-…`, `weight-…`, `pref-neighborhood-…`, etc.) so
end-to-end tests can drive the UI without DOM-structure churn.
