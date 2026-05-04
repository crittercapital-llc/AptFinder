"use client";

import { useMemo, useState } from "react";
import { CriteriaForm } from "@/components/CriteriaForm";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { NeighborhoodSection } from "@/components/NeighborhoodSection";
import { OutreachPanel } from "@/components/OutreachPanel";
import { LISTINGS } from "@/lib/data/listings";
import { NEIGHBORHOODS } from "@/lib/data/neighborhoods";
import { DEFAULT_CRITERIA } from "@/lib/defaults";
import { newOutreachAction } from "@/lib/outreach";
import { rankNeighborhoods } from "@/lib/scoring";
import type { OutreachAction, SearchCriteria } from "@/lib/types";

export default function HomePage() {
  const [criteria, setCriteria] = useState<SearchCriteria>(DEFAULT_CRITERIA);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [outreach, setOutreach] = useState<Record<string, OutreachAction>>({});

  const ranked = useMemo(() => {
    const visibleListings = LISTINGS.filter((l) => !passed.has(l.id));
    return rankNeighborhoods(NEIGHBORHOODS, visibleListings, criteria);
  }, [criteria, passed]);

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
    // Smooth scroll to outreach panel for clear feedback.
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById("outreach")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function passListing(listingId: string) {
    setPassed((s) => {
      const next = new Set(s);
      next.add(listingId);
      return next;
    });
    setOutreach((m) => {
      const { [listingId]: _, ...rest } = m;
      return rest;
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

  function updateOutreach(id: string, patch: Partial<OutreachAction>) {
    setOutreach((m) => {
      const existing = Object.values(m).find((o) => o.id === id);
      if (!existing) return m;
      return { ...m, [existing.listingId]: { ...existing, ...patch } };
    });
  }

  function advanceOutreach(id: string, status: OutreachAction["status"]) {
    updateOutreach(id, { status, updatedAt: new Date().toISOString() });
  }

  function removeOutreach(id: string) {
    setOutreach((m) => {
      const existing = Object.values(m).find((o) => o.id === id);
      if (!existing) return m;
      const { [existing.listingId]: _, ...rest } = m;
      return rest;
    });
  }

  return (
    <main className="min-h-screen">
      <Header />
      <Hero neighborhoodCount={NEIGHBORHOODS.length} listingCount={LISTINGS.length} />

      <div className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mt-2">
          <CriteriaForm value={criteria} onChange={setCriteria} />
        </div>

        <section id="neighborhoods" className="mt-12">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="section-eyebrow">Neighborhood-first results</div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-900">
                {ranked.length} neighborhoods, ranked for you
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                {totalMatches} active listings sorted into the places we&apos;d actually
                recommend you live.
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
