"use client";

import type { Listing } from "@/lib/types";

interface Props {
  shortlist: Set<string>;
  listingsById: Record<string, Listing>;
  shortlistOnly: boolean;
  onToggleFilter: () => void;
  onJump: (listingId: string) => void;
  onRemove: (listingId: string) => void;
}

export function ShortlistPanel({
  shortlist,
  listingsById,
  shortlistOnly,
  onToggleFilter,
  onJump,
  onRemove,
}: Props) {
  const items = Array.from(shortlist)
    .map((id) => listingsById[id])
    .filter((l): l is Listing => !!l);

  return (
    <section
      id="shortlist"
      className="card p-6 md:p-8"
      data-testid="shortlist-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="section-eyebrow">Shortlist</div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            {items.length} saved listing{items.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            {items.length === 0
              ? "Tap the bookmark on any listing to keep it here for later."
              : "Jump back to a saved listing or filter the page to just your shortlist."}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            className={shortlistOnly ? "btn" : "btn-secondary"}
            onClick={onToggleFilter}
            data-testid="shortlist-filter-toggle"
            aria-pressed={shortlistOnly}
          >
            {shortlistOnly ? "Show all listings" : "Show only shortlisted"}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <ul
          className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2"
          data-testid="shortlist-items"
        >
          {items.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-3 rounded-xl2 border border-ink-100 bg-ink-50/40 px-4 py-3"
              data-testid={`shortlist-item-${l.id}`}
            >
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-semibold text-ink-900">
                  {l.title}
                </div>
                <div className="truncate text-xs text-ink-500">
                  {l.address} · ${l.rent.toLocaleString()}/mo
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onJump(l.id)}
                  data-testid={`shortlist-jump-${l.id}`}
                >
                  Jump to
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onRemove(l.id)}
                  data-testid={`shortlist-remove-${l.id}`}
                  aria-label={`Remove ${l.title} from shortlist`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
