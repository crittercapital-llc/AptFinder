"use client";

import { useEffect, useMemo, useState } from "react";
import type { Listing, OutreachAction, SearchCriteria } from "@/lib/types";
import { nextStepFor, statusLabel } from "@/lib/outreach";

interface Props {
  outreach: Record<string, OutreachAction>;
  listingsById: Record<string, Listing>;
  onUpdate: (listingId: string, patch: Partial<OutreachAction>) => void;
  onAdvance: (listingId: string, status: OutreachAction["status"]) => void;
  onRemove: (listingId: string) => void;
  onRegenerate: (listingId: string) => void;
  tone: SearchCriteria["outreach"]["tone"];
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
  onRegenerate,
  tone,
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
            <OutreachCard
              key={o.listingId}
              outreach={o}
              listing={listing}
              tone={tone}
              onUpdate={onUpdate}
              onAdvance={onAdvance}
              onRemove={onRemove}
              onRegenerate={onRegenerate}
            />
          );
        })}
      </ol>
    </section>
  );
}

function OutreachCard({
  outreach: o,
  listing,
  tone,
  onUpdate,
  onAdvance,
  onRemove,
  onRegenerate,
}: {
  outreach: OutreachAction;
  listing: Listing;
  tone: SearchCriteria["outreach"]["tone"];
  onUpdate: (listingId: string, patch: Partial<OutreachAction>) => void;
  onAdvance: (listingId: string, status: OutreachAction["status"]) => void;
  onRemove: (listingId: string) => void;
  onRegenerate: (listingId: string) => void;
}) {
  // Track the tone the draft was last generated for so we can prompt a
  // regenerate when the user changes tone in the criteria form.
  const [generatedTone, setGeneratedTone] = useState<SearchCriteria["outreach"]["tone"]>(tone);
  const toneStale = tone !== generatedTone;

  const [copied, setCopied] = useState<null | "subject" | "body" | "both">(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy(kind: "subject" | "body" | "both") {
    const text =
      kind === "subject"
        ? o.draftSubject
        : kind === "body"
          ? o.draftBody
          : `Subject: ${o.draftSubject}\n\n${o.draftBody}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers / non-secure contexts.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  }

  function handleRegenerate() {
    onRegenerate(o.listingId);
    setGeneratedTone(tone);
  }

  return (
    <li
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
            onChange={(e) => onAdvance(o.listingId, e.target.value as OutreachAction["status"])}
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
            onClick={() => onRemove(o.listingId)}
            data-testid={`outreach-remove-${o.listingId}`}
          >
            Remove
          </button>
        </div>
      </div>

      {toneStale && (
        <div
          className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-clay-200 bg-clay-50 px-3 py-2 text-sm text-clay-800"
          data-testid={`outreach-tone-stale-${o.listingId}`}
          role="status"
        >
          <span>
            Tone changed to <strong>{tone}</strong> — this draft was written in{" "}
            <strong>{generatedTone}</strong>.
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRegenerate}
            data-testid={`outreach-regenerate-${o.listingId}`}
          >
            Regenerate draft
          </button>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-[auto_1fr]">
        <span className="font-semibold text-ink-600">To</span>
        <span className="text-ink-800">
          {listing.contact.landlordName} — {listing.contact.email}
          <span className="ml-2 text-xs text-ink-500">
            ({listing.contact.preferredChannel} preferred)
          </span>
        </span>

        <span className="font-semibold text-ink-600">Subject</span>
        <div className="flex items-center gap-2">
          <input
            className="input py-1.5"
            data-testid={`outreach-subject-${o.listingId}`}
            value={o.draftSubject}
            onChange={(e) =>
              onUpdate(o.listingId, { draftSubject: e.target.value })
            }
          />
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={() => copy("subject")}
            data-testid={`outreach-copy-subject-${o.listingId}`}
            aria-label="Copy subject"
          >
            {copied === "subject" ? "Copied!" : "Copy"}
          </button>
        </div>

        <span className="font-semibold text-ink-600">Body</span>
        <div className="flex flex-col gap-2">
          <textarea
            className="input min-h-[180px] font-mono text-[13px] leading-relaxed"
            data-testid={`outreach-body-${o.listingId}`}
            value={o.draftBody}
            onChange={(e) =>
              onUpdate(o.listingId, { draftBody: e.target.value })
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => copy("body")}
              data-testid={`outreach-copy-body-${o.listingId}`}
            >
              {copied === "body" ? "Copied!" : "Copy body"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => copy("both")}
              data-testid={`outreach-copy-all-${o.listingId}`}
            >
              {copied === "both" ? "Copied!" : "Copy subject + body"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleRegenerate}
              data-testid={`outreach-regenerate-button-${o.listingId}`}
              title="Regenerate draft from current criteria & tone"
            >
              Regenerate
            </button>
            <span
              aria-live="polite"
              className="text-xs text-moss-700"
              data-testid={`outreach-copy-status-${o.listingId}`}
            >
              {copied ? "Copied to clipboard" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-moss-200 bg-moss-50 p-3 text-sm text-moss-800">
        <span className="font-semibold">Next step:</span>{" "}
        {nextStepFor(o.status)}
      </div>
    </li>
  );
}
