"use client";

import type { DiscoveryRecommendation } from "@/lib/types";
import { COMMUTE_MODE_LABELS } from "@/lib/discovery";
import { ScoreBar } from "@/components/ScoreBar";

interface Props {
  recommendations: DiscoveryRecommendation[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAcceptAll: () => void;
  onConfirm: () => void;
  onEdit: () => void;
}

export function NeighborhoodRecommendations({
  recommendations,
  selected,
  onToggle,
  onAcceptAll,
  onConfirm,
  onEdit,
}: Props) {
  const top = recommendations.slice(0, 5);
  const rest = recommendations.slice(5);
  const selectedCount = selected.size;

  return (
    <section
      id="recommendations"
      className="card p-6 md:p-8"
      data-testid="recommendations-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="section-eyebrow">Recommended neighborhoods</div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            {top.length} neighborhoods that fit, ranked
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-600">
            Pick the ones that resonate. We&apos;ll only search apartments inside
            the neighborhoods you accept.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={onEdit}
            data-testid="recommendations-edit"
          >
            Edit answers
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onAcceptAll}
            data-testid="recommendations-accept-all"
          >
            Accept top {top.length}
          </button>
        </div>
      </div>

      <ul className="mt-6 space-y-4" data-testid="recommendation-list">
        {top.map((r, idx) => (
          <RecommendationRow
            key={r.neighborhood.id}
            r={r}
            rank={idx + 1}
            selected={selected.has(r.neighborhood.id)}
            onToggle={() => onToggle(r.neighborhood.id)}
          />
        ))}
      </ul>

      {rest.length > 0 && (
        <details className="mt-5 rounded-xl2 border border-ink-100 bg-ink-50/40 px-4 py-3">
          <summary className="cursor-pointer select-none text-sm font-medium text-ink-700">
            Show {rest.length} lower-scoring neighborhood{rest.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-3 space-y-3" data-testid="recommendation-rest">
            {rest.map((r, idx) => (
              <RecommendationRow
                key={r.neighborhood.id}
                r={r}
                rank={idx + top.length + 1}
                selected={selected.has(r.neighborhood.id)}
                onToggle={() => onToggle(r.neighborhood.id)}
                compact
              />
            ))}
          </ul>
        </details>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
        <div className="text-sm text-ink-600" data-testid="recommendations-selected-count">
          {selectedCount === 0
            ? "No neighborhoods accepted yet."
            : `${selectedCount} neighborhood${selectedCount === 1 ? "" : "s"} accepted.`}
        </div>
        <button
          type="button"
          className="btn"
          onClick={onConfirm}
          disabled={selectedCount === 0}
          data-testid="recommendations-confirm"
        >
          Search apartments in {selectedCount || "…"} neighborhood
          {selectedCount === 1 ? "" : "s"}
        </button>
      </div>
    </section>
  );
}

function RecommendationRow({
  r,
  rank,
  selected,
  onToggle,
  compact,
}: {
  r: DiscoveryRecommendation;
  rank: number;
  selected: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const score = Math.round(r.total);
  const positives = r.reasons.filter((x) => x.positive).slice(0, 3);
  const cautions = r.reasons.filter((x) => !x.positive).slice(0, 2);

  return (
    <li
      className={
        "rounded-xl2 border bg-white p-4 transition " +
        (selected ? "border-moss-600 ring-1 ring-moss-200" : "border-ink-100")
      }
      data-testid={`recommendation-${r.neighborhood.id}`}
    >
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          data-testid={`recommendation-toggle-${r.neighborhood.id}`}
          className={
            "mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition " +
            (selected
              ? "border-moss-600 bg-moss-600 text-white"
              : "border-ink-300 bg-white text-transparent hover:border-moss-400")
          }
          aria-label={selected ? `Remove ${r.neighborhood.name}` : `Accept ${r.neighborhood.name}`}
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-xs text-ink-400">#{rank}</span>
            <h3 className="font-display text-xl font-semibold tracking-tight text-ink-900">
              {r.neighborhood.name}
            </h3>
            <span className="text-xs text-ink-500">{r.neighborhood.city}</span>
            <span
              className="ml-auto pill-accent"
              data-testid={`recommendation-score-${r.neighborhood.id}`}
            >
              {score}/100 fit
            </span>
          </div>

          {!compact && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
              {r.neighborhood.blurb}
            </p>
          )}

          <div className="mt-3 max-w-md">
            <ScoreBar value={score} />
          </div>

          {(positives.length > 0 || cautions.length > 0) && (
            <ul
              className="mt-3 space-y-1.5 text-sm"
              data-testid={`recommendation-reasons-${r.neighborhood.id}`}
            >
              {positives.map((p) => (
                <li key={p.key} className="flex gap-2 text-ink-700">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-600"
                    aria-hidden="true"
                  />
                  <span>{p.text}</span>
                </li>
              ))}
              {cautions.map((c) => (
                <li key={c.key} className="flex gap-2 text-clay-700">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500"
                    aria-hidden="true"
                  />
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.commuteMinutes !== null && r.commuteMode && (
              <span className="pill" data-testid={`recommendation-commute-${r.neighborhood.id}`}>
                {r.commuteMinutes} min by{" "}
                {COMMUTE_MODE_LABELS[r.commuteMode].split(" ")[0].toLowerCase()}
              </span>
            )}
            {r.neighborhood.vibeTags.slice(0, 2).map((t) => (
              <span key={t} className="pill">
                {t}
              </span>
            ))}
            <span className="pill">~${r.neighborhood.medianRent1br.toLocaleString()}/mo 1BR</span>
          </div>
        </div>
      </div>
    </li>
  );
}
