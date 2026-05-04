"use client";

import { useEffect, useMemo, useState } from "react";
import { CriteriaForm } from "@/components/CriteriaForm";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { NeighborhoodSection } from "@/components/NeighborhoodSection";
import { OutreachPanel } from "@/components/OutreachPanel";
import { ShortlistPanel } from "@/components/ShortlistPanel";
import { LISTINGS } from "@/lib/data/listings";
import { NEIGHBORHOODS } from "@/lib/data/neighborhoods";
import { DEFAULT_CRITERIA } from "@/lib/defaults";
import { generateOutreach, newOutreachAction } from "@/lib/outreach";
import { rankNeighborhoods } from "@/lib/scoring";
import type { OutreachAction, SearchCriteria } from "@/lib/types";

export default function HomePage() {
  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_CRITERIA);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  // Outreach is always keyed by listingId. action.id is informational only.
  const [outreach, setOutreach] = useState<Record<string, OutreachAction>>({});
  const [shortlistOnly, setShortlistOnly] = useState(false);

  const ranked = useMemo(() => {
    let visible = LISTINGS.filter((l) => !passed.has(l.id));
    if (shortlistOnly) visible = visible.filter((l) => shortlist.has(l.id));
    return rankNeighborhoods(NEIGHBORHOODS, visible, criteria);
  }, [criteria, passed, shortlist, shortlistOnly]);

  const listingsById = useMemo(
    () => Object.fromEntries(LISTINGS.map((l) => [l.id, l])),
    [],
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
    // We intentionally re-run when ranked/passed/autoDraft toggle changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria.outreach.autoDraft, ranked, passed]);

  function passListing(listingId: string) {
    setPassed((s) => {
      const next = new Set(s);
      next.add(listingId);
      return next;
    });
    // Note: we no longer delete the outreach draft on pass — passing hides
    // the listing from results but preserves any draft work in the panel.
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
      <Hero neighborhoodCount={NEIGHBORHOODS.length} listingCount={LISTINGS.length} />

      <div className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mt-2">
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
                {ranked.length} neighborhoods, ranked for you
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                {shortlistOnly
                  ? `${totalMatches} shortlisted listing${totalMatches === 1 ? "" : "s"} shown.`
                  : `${totalMatches} active listings sorted into the places we'd actually recommend you live.`}
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
            tone={criteria.outreach.tone}
          />
        </section>

        <footer className="mt-16 border-t border-ink-100 pt-8 text-sm text-ink-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              HomeHound MVP · listings &amp; neighborhoods are mock data, swap in real
              scrapers via{" "}
              <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">
                src/lib/data
              </code>
              .
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
