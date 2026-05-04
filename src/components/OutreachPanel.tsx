"use client";

import { useMemo } from "react";
import type { Listing, OutreachAction } from "@/lib/types";
import { nextStepFor, statusLabel } from "@/lib/outreach";

interface Props {
  outreach: Record<string, OutreachAction>;
  listingsById: Record<string, Listing>;
  onUpdate: (id: string, patch: Partial<OutreachAction>) => void;
  onAdvance: (id: string, status: OutreachAction["status"]) => void;
  onRemove: (id: string) => void;
}

const ALL_STATUSES: OutreachAction["status"][] = [
  "draft_ready",
  "sent",
  "replied",
  "tour_scheduled",
  "passed",
];

export function OutreachPanel({
  outreach,
  listingsById,
  onUpdate,
  onAdvance,
  onRemove,
}: Props) {
  const items = useMemo(() => Object.values(outreach), [outreach]);

  if (items.length === 0) {
    return (
      <section
        id="outreach"
        className="card p-8 text-center"
        data-testid="outreach-empty"
      >
        <div className="section-eyebrow mb-2">Outreach</div>
        <h2 className="font-display text-2xl font-semibold text-ink-900">
          No outreach drafts yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
          Click <span className="font-medium text-ink-800">Draft outreach</span> on a listing
          to generate a first-touch message. HomeHound never sends without your review.
        </p>
      </section>
    );
  }

  return (
    <section id="outreach" className="card p-6 md:p-8" data-testid="outreach-panel">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="section-eyebrow">Outreach</div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            {items.length} active conversation{items.length === 1 ? "" : "s"}
          </h2>
        </div>
        <span className="hidden text-xs text-ink-500 md:inline">
          Drafts only — nothing is sent automatically.
        </span>
      </div>

      <ol className="mt-6 space-y-5">
        {items.map((o) => {
          const listing = listingsById[o.listingId];
          if (!listing) return null;
          return (
            <li
              key={o.id}
              className="rounded-xl2 border border-ink-100 bg-ink-50/40 p-5"
              data-testid={`outreach-card-${o.listingId}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm text-ink-500">{listing.address}</div>
                  <div className="font-display text-lg font-semibold text-ink-900">
                    {listing.title}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Outreach status"
                    data-testid={`outreach-status-select-${o.listingId}`}
                    className="input py-1 text-sm"
                    value={o.status}
                    onChange={(e) => onAdvance(o.id, e.target.value as OutreachAction["status"])}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onRemove(o.id)}
                    data-testid={`outreach-remove-${o.listingId}`}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-[auto_1fr]">
                <span className="font-semibold text-ink-600">To</span>
                <span className="text-ink-800">
                  {listing.contact.landlordName} — {listing.contact.email}
                  <span className="ml-2 text-xs text-ink-500">
                    ({listing.contact.preferredChannel} preferred)
                  </span>
                </span>
                <span className="font-semibold text-ink-600">Subject</span>
                <input
                  className="input py-1.5"
                  data-testid={`outreach-subject-${o.listingId}`}
                  value={o.draftSubject}
                  onChange={(e) =>
                    onUpdate(o.id, { draftSubject: e.target.value, updatedAt: new Date().toISOString() })
                  }
                />
                <span className="font-semibold text-ink-600">Body</span>
                <textarea
                  className="input min-h-[180px] font-mono text-[13px] leading-relaxed"
                  data-testid={`outreach-body-${o.listingId}`}
                  value={o.draftBody}
                  onChange={(e) =>
                    onUpdate(o.id, { draftBody: e.target.value, updatedAt: new Date().toISOString() })
                  }
                />
              </div>

              <div className="mt-4 rounded-md border border-moss-200 bg-moss-50 p-3 text-sm text-moss-800">
                <span className="font-semibold">Next step:</span>{" "}
                {nextStepFor(o.status)}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
