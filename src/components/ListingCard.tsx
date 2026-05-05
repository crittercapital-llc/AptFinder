"use client";

import type { OutreachAction, ScoredListing } from "@/lib/types";
import { FACTOR_LABELS } from "@/lib/scoring";
import { ScoreBar } from "@/components/ScoreBar";

interface Props {
  scored: ScoredListing;
  outreach?: OutreachAction;
  onStartOutreach: (listingId: string) => void;
  onPass: (listingId: string) => void;
  onShortlist: (listingId: string) => void;
  shortlisted: boolean;
}

export function ListingCard({
  scored,
  outreach,
  onStartOutreach,
  onPass,
  onShortlist,
  shortlisted,
}: Props) {
  const { listing } = scored;
  const total = Math.round(scored.total);

  return (
    <article
      className="card group flex flex-col overflow-hidden"
      data-testid={`listing-${listing.id}`}
    >
      <div className={`relative h-36 bg-gradient-to-br ${listing.photoColor}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_60%)]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="pill-accent" data-testid={`listing-score-${listing.id}`}>
            {total}/100 match
          </span>
          {scored.warnings.length > 0 && (
            <span className="pill-warn" title={scored.warnings.join(" • ")}>
              {scored.warnings.length} caveat{scored.warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={() => onShortlist(listing.id)}
            data-testid={`shortlist-${listing.id}`}
            aria-pressed={shortlisted}
            aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
            className={
              "grid h-8 w-8 place-items-center rounded-full border transition " +
              (shortlisted
                ? "border-clay-300 bg-clay-50 text-clay-700"
                : "border-white/60 bg-white/70 text-ink-600 hover:bg-white")
            }
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill={shortlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M6 4h12v17l-6-4-6 4z" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h4 className="font-display text-lg font-semibold leading-tight text-ink-900">
          {listing.title}
        </h4>
        <p className="mt-1 text-sm text-ink-500">{listing.address}</p>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-ink-700">
          <span className="font-display text-xl font-semibold text-ink-900">
            ${listing.rent.toLocaleString()}
          </span>
          <span className="text-ink-500">/mo</span>
          <span>{listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} BR`}</span>
          <span>{listing.bathrooms} BA</span>
          <span>{listing.sqft} sqft</span>
        </div>

        {listing.amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {listing.amenities.slice(0, 4).map((a) => (
              <span key={a} className="pill">
                {labelAmenity(a)}
              </span>
            ))}
            {listing.amenities.length > 4 && (
              <span className="pill">+{listing.amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-4">
          <ScoreBar value={total} label="Overall match" />
        </div>

        {scored.matchHighlights.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
            {scored.matchHighlights.slice(0, 3).map((h, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-600" aria-hidden="true" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-4 rounded-lg bg-ink-50/60 px-3 py-2 text-sm">
          <summary className="cursor-pointer select-none font-medium text-ink-700">
            Why this score
          </summary>
          <div className="mt-3 space-y-2.5">
            {scored.factors.map((f) => (
              <div key={f.factor}>
                <ScoreBar value={f.rawScore} label={FACTOR_LABELS[f.factor]} size="sm" />
                <p className="mt-1 text-xs text-ink-600">{f.reason}</p>
              </div>
            ))}
            {scored.warnings.length > 0 && (
              <div className="rounded-md border border-clay-200 bg-clay-50 p-2 text-xs text-clay-700">
                <div className="font-semibold">Caveats</div>
                <ul className="mt-1 list-disc pl-4">
                  {scored.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
          {outreach ? (
            <span
              className="pill-accent"
              data-testid={`outreach-status-${listing.id}`}
            >
              Outreach: {outreach.status.replace("_", " ")}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onStartOutreach(listing.id)}
              className="btn"
              data-testid={`start-outreach-${listing.id}`}
            >
              Draft outreach
            </button>
          )}
          <button
            type="button"
            onClick={() => onPass(listing.id)}
            className="btn-ghost ml-auto"
            data-testid={`pass-${listing.id}`}
          >
            Pass
          </button>
        </div>
      </div>
    </article>
  );
}

function labelAmenity(value: string) {
  const map: Record<string, string> = {
    in_unit_laundry: "In-unit laundry",
    pet_friendly: "Pet friendly",
    dishwasher: "Dishwasher",
    parking: "Parking",
    gym: "Gym",
    pool: "Pool",
    doorman: "Doorman",
    roof_deck: "Roof deck",
    garden: "Garden",
    fireplace: "Fireplace",
    bike_storage: "Bike storage",
  };
  return map[value] ?? value;
}
