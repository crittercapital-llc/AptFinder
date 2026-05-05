"use client";

import type { OutreachAction, ScoredNeighborhood } from "@/lib/types";
import { ListingCard } from "@/components/ListingCard";
import { ScoreBar } from "@/components/ScoreBar";

interface Props {
  scored: ScoredNeighborhood;
  rank: number;
  outreach: Record<string, OutreachAction>;
  shortlist: Set<string>;
  onStartOutreach: (listingId: string) => void;
  onPass: (listingId: string) => void;
  onShortlist: (listingId: string) => void;
}

export function NeighborhoodSection({
  scored,
  rank,
  outreach,
  shortlist,
  onStartOutreach,
  onPass,
  onShortlist,
}: Props) {
  const { neighborhood, matchingListings, total, pitch } = scored;
  const score = Math.round(total);

  return (
    <section
      className="card overflow-hidden"
      data-testid={`neighborhood-${neighborhood.id}`}
    >
      <div className="grid grid-cols-1 gap-6 border-b border-ink-100 p-6 md:grid-cols-[1.25fr_1fr] md:p-8">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-ink-400">#{rank}</span>
            <h3 className="font-display text-3xl font-semibold tracking-tight text-ink-900">
              {neighborhood.name}
            </h3>
            <span className="text-sm text-ink-500">{neighborhood.city}</span>
          </div>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-700">
            {pitch}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            {neighborhood.blurb}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {neighborhood.vibeTags.map((t) => (
              <span key={t} className="pill">
                {t}
              </span>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <SignatureItem label="Coffee" value={neighborhood.signature.coffee} />
            <SignatureItem label="Food" value={neighborhood.signature.food} />
            <SignatureItem label="Nightlife" value={neighborhood.signature.nightlife} />
            <SignatureItem label="Parks" value={neighborhood.signature.parks} />
          </dl>
        </div>

        <div className="rounded-xl2 border border-ink-100 bg-ink-50/60 p-5">
          <div className="flex items-baseline justify-between">
            <span className="section-eyebrow">Match score</span>
            <span
              className="font-display text-3xl font-semibold text-ink-900"
              data-testid={`neighborhood-score-${neighborhood.id}`}
            >
              {score}
              <span className="text-base text-ink-400">/100</span>
            </span>
          </div>
          <div className="mt-3">
            <ScoreBar value={score} />
          </div>
          {scored.factors.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm text-ink-700">
              {scored.factors
                .slice()
                .sort((a, b) => b.contribution - a.contribution)
                .slice(0, 4)
                .map((f) => (
                  <li key={f.factor} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-600" aria-hidden="true" />
                    <span>{f.reason}</span>
                  </li>
                ))}
            </ul>
          )}
          <div className="mt-4 text-xs text-ink-500">
            Median 1BR rent ~ ${neighborhood.medianRent1br.toLocaleString()}/mo
          </div>
        </div>
      </div>

      <div className="bg-ink-50/40 p-6 md:p-8">
        {matchingListings.length === 0 ? (
          <p className="text-sm text-ink-500">
            No active listings in {neighborhood.name} match your filters yet — HomeHound will
            keep watching.
          </p>
        ) : (
          <>
            <div className="mb-4 flex items-baseline justify-between">
              <h4 className="font-display text-lg font-semibold text-ink-900">
                {matchingListings.length} matching listing
                {matchingListings.length === 1 ? "" : "s"}
              </h4>
              <span className="text-xs text-ink-500">Sorted by overall match</span>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {matchingListings.map((s) => (
                <ListingCard
                  key={s.listing.id}
                  scored={s}
                  outreach={outreach[s.listing.id]}
                  shortlisted={shortlist.has(s.listing.id)}
                  onStartOutreach={onStartOutreach}
                  onPass={onPass}
                  onShortlist={onShortlist}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SignatureItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-700">{value}</dd>
    </div>
  );
}
