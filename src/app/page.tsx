"use client";

import { useEffect, useMemo, useState } from "react";
import { CriteriaForm } from "@/components/CriteriaForm";
import type { ProfileFields } from "@/components/DiscoveryWizard";
import { DiscoveryWizard } from "@/components/DiscoveryWizard";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { NeighborhoodRecommendations } from "@/components/NeighborhoodRecommendations";
import { NeighborhoodSection } from "@/components/NeighborhoodSection";
import { OutreachPanel } from "@/components/OutreachPanel";
import { ShortlistPanel } from "@/components/ShortlistPanel";
import { LISTINGS } from "@/lib/data/listings";
import { NEIGHBORHOODS } from "@/lib/data/neighborhoods";
import { DEFAULT_CRITERIA } from "@/lib/defaults";
import {
  DEFAULT_DISCOVERY_ANSWERS,
  discoveryCommuteToLegacyMode,
  rankNeighborhoodsForDiscovery,
} from "@/lib/discovery";
import { generateOutreach, newOutreachAction } from "@/lib/outreach";
import { rankNeighborhoods } from "@/lib/scoring";
import type {
  DiscoveryAnswers,
  Listing,
  OutreachAction,
  SearchCriteria,
} from "@/lib/types";

type Phase = "discovery" | "review" | "results";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("discovery");
  const [discoveryAnswers, setDiscoveryAnswers] = useState<DiscoveryAnswers>(
    DEFAULT_DISCOVERY_ANSWERS,
  );
  const [acceptedNeighborhoods, setAcceptedNeighborhoods] = useState<Set<string>>(
    new Set(),
  );

  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_CRITERIA);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  // Outreach is always keyed by listingId. action.id is informational only.
  const [outreach, setOutreach] = useState<Record<string, OutreachAction>>({});
  const [shortlistOnly, setShortlistOnly] = useState(false);

  // Live listings from Rentcast — falls back to mock data when the API key
  // isn't configured or the request fails.
  const [listings, setListings] = useState<Listing[]>(LISTINGS);
  const [listingsSource, setListingsSource] = useState<"mock" | "live" | "loading">("mock");

  useEffect(() => {
    setListingsSource("loading");
    const city = encodeURIComponent(criteria.city);
    fetch(`/api/listings?city=${city}&state=CA`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<Listing[]>;
      })
      .then((data) => {
        if (data.length > 0) {
          setListings(data);
          setListingsSource("live");
        } else {
          setListingsSource("mock");
        }
      })
      .catch(() => {
        setListings(LISTINGS);
        setListingsSource("mock");
      });
  }, [criteria.city]);

  const recommendations = useMemo(
    () => rankNeighborhoodsForDiscovery(NEIGHBORHOODS, discoveryAnswers),
    [discoveryAnswers],
  );

  // Listings restricted to neighborhoods the user accepted in discovery.
  const acceptedListings = useMemo(() => {
    if (acceptedNeighborhoods.size === 0) return listings;
    return listings.filter((l) => acceptedNeighborhoods.has(l.neighborhoodId));
  }, [acceptedNeighborhoods, listings]);

  // Neighborhoods restricted to the accepted set so the listing-side ranking
  // doesn't surface places the user already declined.
  const acceptedNeighborhoodObjs = useMemo(() => {
    if (acceptedNeighborhoods.size === 0) return NEIGHBORHOODS;
    return NEIGHBORHOODS.filter((n) => acceptedNeighborhoods.has(n.id));
  }, [acceptedNeighborhoods]);

  const ranked = useMemo(() => {
    let visible = acceptedListings.filter((l) => !passed.has(l.id));
    if (shortlistOnly) visible = visible.filter((l) => shortlist.has(l.id));
    return rankNeighborhoods(acceptedNeighborhoodObjs, visible, criteria);
  }, [acceptedListings, acceptedNeighborhoodObjs, criteria, passed, shortlist, shortlistOnly]);

  const listingsById = useMemo(
    () => Object.fromEntries(listings.map((l) => [l.id, l])),
    [listings],
  );

  const totalMatches = useMemo(
    () => ranked.reduce((s, n) => s + n.matchingListings.length, 0),
    [ranked],
  );

  function startOutreach(listingId: string) {
    const listing = listingsById[listingId];
    if (!listing) return;
    const action = newOutreachAction(listing, criteria);
    setOutreach((m) => ({ ...m, [listingId]: action }));
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("outreach")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  // Auto-draft: when enabled, generate drafts for the top recommended listings
  // that don't yet have outreach (and that haven't been passed). Capped to a
  // small number so we don't fire 12 drafts on first load.
  useEffect(() => {
    if (phase !== "results") return;
    if (!criteria.outreach.autoDraft) return;
    const candidates: string[] = [];
    for (const n of ranked) {
      for (const s of n.matchingListings) {
        if (candidates.length >= 3) break;
        const id = s.listing.id;
        if (passed.has(id)) continue;
        if (outreach[id]) continue;
        candidates.push(id);
      }
      if (candidates.length >= 3) break;
    }
    if (candidates.length === 0) return;
    setOutreach((m) => {
      const next = { ...m };
      for (const id of candidates) {
        if (next[id]) continue;
        const listing = listingsById[id];
        if (!listing) continue;
        next[id] = newOutreachAction(listing, criteria);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, criteria.outreach.autoDraft, ranked, passed]);

  function handleDiscoverySubmit(answers: DiscoveryAnswers, profile: ProfileFields) {
    setDiscoveryAnswers(answers);
    setCriteria((c) => ({
      ...c,
      bedrooms: profile.bedrooms,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      outreach: { ...c.outreach, aboutMe: profile.aboutMe },
      commute: {
        destination: answers.commuteDestination,
        maxMinutes: answers.commuteMaxMinutes,
        mode: discoveryCommuteToLegacyMode(answers.commuteModes),
      },
    }));
    // Pre-select the top 3 recommendations for the user's review step.
    const ranked = rankNeighborhoodsForDiscovery(NEIGHBORHOODS, answers);
    setAcceptedNeighborhoods(new Set(ranked.slice(0, 3).map((r) => r.neighborhood.id)));
    setPhase("review");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function toggleAcceptNeighborhood(id: string) {
    setAcceptedNeighborhoods((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function acceptTopRecommendations() {
    const top = recommendations.slice(0, 5).map((r) => r.neighborhood.id);
    setAcceptedNeighborhoods(new Set(top));
  }

  function confirmRecommendations() {
    if (acceptedNeighborhoods.size === 0) return;
    // Push the accepted neighborhoods into preferredNeighborhoods so the
    // listing-side scoring also boosts them.
    setCriteria((c) => ({
      ...c,
      preferredNeighborhoods: Array.from(acceptedNeighborhoods),
    }));
    setPhase("results");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("neighborhoods")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function backToDiscovery() {
    setPhase("discovery");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("discovery")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function backToReview() {
    setPhase("review");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function passListing(listingId: string) {
    setPassed((s) => {
      const next = new Set(s);
      next.add(listingId);
      return next;
    });
  }

  function toggleShortlist(listingId: string) {
    setShortlist((s) => {
      const next = new Set(s);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      return next;
    });
  }

  function updateOutreach(listingId: string, patch: Partial<OutreachAction>) {
    setOutreach((m) => {
      const existing = m[listingId];
      if (!existing) return m;
      return { ...m, [listingId]: { ...existing, ...patch, updatedAt: new Date().toISOString() } };
    });
  }

  function advanceOutreach(listingId: string, status: OutreachAction["status"]) {
    updateOutreach(listingId, { status });
  }

  function regenerateOutreach(listingId: string) {
    const listing = listingsById[listingId];
    if (!listing) return;
    const { subject, body } = generateOutreach(listing, criteria);
    updateOutreach(listingId, { draftSubject: subject, draftBody: body });
  }

  function removeOutreach(listingId: string) {
    setOutreach((m) => {
      if (!m[listingId]) return m;
      const { [listingId]: _, ...rest } = m;
      return rest;
    });
  }

  function jumpToListing(listingId: string) {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-testid="listing-${listingId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <main className="min-h-screen">
      <Header shortlistCount={shortlist.size} />
      <Hero neighborhoodCount={NEIGHBORHOODS.length} listingCount={listings.length} />

      <div className="mx-auto max-w-7xl px-6 pb-24">
        {phase === "discovery" && (
          <div className="mt-2">
            <DiscoveryWizard
              initial={discoveryAnswers}
              initialProfile={{
                aboutMe: criteria.outreach.aboutMe,
                budgetMin: criteria.budgetMin,
                budgetMax: criteria.budgetMax,
                bedrooms: criteria.bedrooms,
              }}
              onSubmit={handleDiscoverySubmit}
            />
          </div>
        )}

        {phase === "review" && (
          <div className="mt-2">
            <NeighborhoodRecommendations
              recommendations={recommendations}
              selected={acceptedNeighborhoods}
              onToggle={toggleAcceptNeighborhood}
              onAcceptAll={acceptTopRecommendations}
              onConfirm={confirmRecommendations}
              onEdit={backToDiscovery}
            />
          </div>
        )}

        {phase === "results" && (
          <>
            <div
              className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-moss-200 bg-moss-50 px-5 py-4 text-sm text-moss-900"
              data-testid="results-banner"
            >
              <div>
                <div className="section-eyebrow text-moss-700">Searching apartments in</div>
                <div className="mt-0.5 font-display text-lg font-semibold">
                  {Array.from(acceptedNeighborhoods)
                    .map((id) => NEIGHBORHOODS.find((n) => n.id === id)?.name ?? id)
                    .join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={backToReview}
                  data-testid="results-edit-neighborhoods"
                >
                  Adjust neighborhoods
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={backToDiscovery}
                  data-testid="results-edit-discovery"
                >
                  Restart questionnaire
                </button>
              </div>
            </div>

            <div className="mt-6">
              <CriteriaForm value={criteria} onChange={setCriteria} />
            </div>

            <section className="mt-10">
              <ShortlistPanel
                shortlist={shortlist}
                listingsById={listingsById}
                shortlistOnly={shortlistOnly}
                onToggleFilter={() => setShortlistOnly((v) => !v)}
                onJump={jumpToListing}
                onRemove={(id) => toggleShortlist(id)}
              />
            </section>

            <section id="neighborhoods" className="mt-10">
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="section-eyebrow">Neighborhood-first results</div>
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-900">
                    {ranked.length} accepted neighborhood{ranked.length === 1 ? "" : "s"}, ranked for you
                  </h2>
                  <p className="mt-1 text-sm text-ink-600">
                    {shortlistOnly
                      ? `${totalMatches} shortlisted listing${totalMatches === 1 ? "" : "s"} shown.`
                      : `${totalMatches} active listings inside the neighborhoods you accepted.`}
                  </p>
                </div>
                {passed.size > 0 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setPassed(new Set())}
                    data-testid="restore-passed"
                  >
                    Restore {passed.size} passed listing{passed.size === 1 ? "" : "s"}
                  </button>
                )}
              </div>

              <div className="space-y-8" data-testid="neighborhood-list">
                {ranked.map((n, idx) => (
                  <NeighborhoodSection
                    key={n.neighborhood.id}
                    scored={n}
                    rank={idx + 1}
                    outreach={outreach}
                    shortlist={shortlist}
                    onStartOutreach={startOutreach}
                    onPass={passListing}
                    onShortlist={toggleShortlist}
                  />
                ))}
              </div>
            </section>

            <section className="mt-12">
              <OutreachPanel
                outreach={outreach}
                listingsById={listingsById}
                onUpdate={updateOutreach}
                onAdvance={advanceOutreach}
                onRemove={removeOutreach}
                onRegenerate={regenerateOutreach}
                outreachCriteria={criteria.outreach}
              />
            </section>
          </>
        )}

        <footer className="mt-16 border-t border-ink-100 pt-8 text-sm text-ink-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div data-testid="footer-data-source">
              {listingsSource === "live" ? (
                <>HomeHound · listings sourced live from <strong>Rentcast</strong>.</>
              ) : listingsSource === "loading" ? (
                <>HomeHound · fetching live listings…</>
              ) : (
                <>
                  HomeHound MVP · listings are <strong>local mock data</strong>{" "}
                  — add a <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">RENTCAST_API_KEY</code> to{" "}
                  <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">.env.local</code> to enable live listings.
                </>
              )}
            </div>
            <div className="text-xs text-ink-400">
              Built as a neighborhood-first agent, not a listing grid.
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
