"use client";

import { useState } from "react";
import type { FactorKey, SearchCriteria } from "@/lib/types";
import { FACTOR_LABELS } from "@/lib/scoring";
import { AMENITY_OPTIONS, COMMUTE_DESTINATIONS, SUPPORTED_CITIES } from "@/lib/defaults";
import { NEIGHBORHOODS } from "@/lib/data/neighborhoods";

interface Props {
  value: SearchCriteria;
  onChange: (next: SearchCriteria) => void;
}

const FACTOR_HELP: Record<FactorKey, string> = {
  safety: "Crime stats, well-lit streets, late-night feel.",
  commute: "Travel time to your destination by your chosen mode.",
  food: "Coffee, dinner spots, grocery quality.",
  vibe: "How the neighborhood actually feels day-to-day.",
  affordability: "Rent vs. your budget band.",
  amenities: "How well listings match your amenity wishlist.",
  responsiveness: "Whether the landlord actually replies.",
};

export function CriteriaForm({ value, onChange }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const budgetError = computeBudgetError(value.budgetMin, value.budgetMax);

  function update<K extends keyof SearchCriteria>(k: K, v: SearchCriteria[K]) {
    onChange({ ...value, [k]: v });
  }

  function toggleAmenity(a: string) {
    const has = value.amenities.includes(a);
    update("amenities", has ? value.amenities.filter((x) => x !== a) : [...value.amenities, a]);
  }

  function togglePreferredNeighborhood(id: string) {
    const has = value.preferredNeighborhoods.includes(id);
    update(
      "preferredNeighborhoods",
      has
        ? value.preferredNeighborhoods.filter((x) => x !== id)
        : [...value.preferredNeighborhoods, id],
    );
  }

  function setWeight(k: FactorKey, v: number) {
    update("weights", { ...value.weights, [k]: v });
  }

  return (
    <form
      id="criteria"
      className="card p-6 md:p-8"
      data-testid="criteria-form"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <div className="section-eyebrow">Your criteria</div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            Tell HomeHound what matters
          </h2>
        </div>
        <span className="hidden text-xs text-ink-500 md:inline">
          Updates the recommendations live as you type.
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="city">
            City
          </label>
          <select
            id="city"
            data-testid="input-city"
            className="input mt-1"
            value={SUPPORTED_CITIES.includes(value.city) ? value.city : SUPPORTED_CITIES[0]}
            onChange={(e) => update("city", e.target.value)}
          >
            {SUPPORTED_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-500">
            HomeHound currently indexes {SUPPORTED_CITIES.join(" and ")}. More cities coming soon.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="bedrooms">
            Bedrooms
          </label>
          <select
            id="bedrooms"
            data-testid="select-bedrooms"
            className="input mt-1"
            value={value.bedrooms}
            onChange={(e) => update("bedrooms", Number(e.target.value))}
          >
            <option value={0}>Studio</option>
            <option value={1}>1 bedroom</option>
            <option value={2}>2 bedrooms</option>
            <option value={3}>3+ bedrooms</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="field-label">Budget</label>
          <div className="mt-1 flex items-center gap-3">
            <CurrencyInput
              testId="input-budget-min"
              value={value.budgetMin}
              onChange={(v) => update("budgetMin", v)}
              ariaLabel="Minimum monthly rent"
              invalid={budgetError !== null}
            />
            <span className="text-ink-400">to</span>
            <CurrencyInput
              testId="input-budget-max"
              value={value.budgetMax}
              onChange={(v) => update("budgetMax", v)}
              ariaLabel="Maximum monthly rent"
              invalid={budgetError !== null}
            />
            <span className="text-sm text-ink-500">/ month</span>
          </div>
          {budgetError && (
            <p
              className="mt-1 text-xs text-clay-700"
              data-testid="budget-error"
              role="alert"
            >
              {budgetError}
            </p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="moveInBy">
            Move-in by
          </label>
          <input
            id="moveInBy"
            data-testid="input-movein"
            type="date"
            className="input mt-1"
            value={value.moveInBy}
            onChange={(e) => update("moveInBy", e.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="buildingSize">
            Building size
          </label>
          <select
            id="buildingSize"
            data-testid="select-building-size"
            className="input mt-1"
            value={value.buildingSize}
            onChange={(e) => update("buildingSize", e.target.value as SearchCriteria["buildingSize"])}
          >
            <option value="any">No preference</option>
            <option value="boutique">Boutique / mom &amp; pop (≤12 units)</option>
            <option value="midrise">Midrise (12–50)</option>
            <option value="highrise">Highrise (50+)</option>
          </select>
        </div>
      </div>

      <fieldset className="mt-7">
        <legend className="field-label">Commute</legend>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            data-testid="select-commute-dest"
            className="input"
            value={value.commute.destination}
            onChange={(e) =>
              update("commute", { ...value.commute, destination: e.target.value })
            }
            aria-label="Commute destination"
          >
            {COMMUTE_DESTINATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            data-testid="select-commute-mode"
            className="input"
            value={value.commute.mode}
            onChange={(e) =>
              update("commute", { ...value.commute, mode: e.target.value as SearchCriteria["commute"]["mode"] })
            }
            aria-label="Commute mode"
          >
            <option value="transit">Transit</option>
            <option value="walk">Walk</option>
            <option value="bike">Bike</option>
            <option value="drive">Drive</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              data-testid="input-commute-max"
              type="range"
              min={10}
              max={90}
              step={5}
              value={value.commute.maxMinutes}
              onChange={(e) =>
                update("commute", { ...value.commute, maxMinutes: Number(e.target.value) })
              }
              className="flex-1 accent-moss-600"
              aria-label="Maximum commute minutes"
            />
            <span className="w-16 text-right font-mono text-sm text-ink-700">
              {value.commute.maxMinutes} min
            </span>
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="field-label">Preferred neighborhoods</legend>
        <p className="mt-1 text-xs text-ink-500">
          Optional — we&apos;ll still surface strong matches outside these.
        </p>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="neighborhood-toggles">
          {NEIGHBORHOODS.map((n) => {
            const on = value.preferredNeighborhoods.includes(n.id);
            return (
              <button
                key={n.id}
                type="button"
                data-testid={`pref-neighborhood-${n.id}`}
                onClick={() => togglePreferredNeighborhood(n.id)}
                className={
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition " +
                  (on
                    ? "border-moss-600 bg-moss-600 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50")
                }
                aria-pressed={on}
              >
                {n.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="field-label">Amenities</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {AMENITY_OPTIONS.map((a) => {
            const on = value.amenities.includes(a.value);
            return (
              <label
                key={a.value}
                className={
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition " +
                  (on
                    ? "border-moss-300 bg-moss-50 text-moss-800"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50")
                }
              >
                <input
                  type="checkbox"
                  className="checkbox"
                  data-testid={`amenity-${a.value}`}
                  checked={on}
                  onChange={() => toggleAmenity(a.value)}
                />
                <span>{a.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-7">
        <button
          type="button"
          className="btn-ghost px-0"
          onClick={() => setAdvancedOpen((v) => !v)}
          data-testid="toggle-advanced"
          aria-expanded={advancedOpen}
        >
          {advancedOpen ? "Hide" : "Show"} weighting & outreach options
          <span aria-hidden="true">{advancedOpen ? "▾" : "▸"}</span>
        </button>
      </div>

      {advancedOpen && (
        <div className="mt-4 grid grid-cols-1 gap-7 lg:grid-cols-2">
          <div>
            <div className="field-label">Weight what matters most</div>
            <p className="mt-1 text-xs text-ink-500">
              0 = ignore this factor entirely, 5 = dealbreaker. HomeHound normalizes.
            </p>
            <div className="mt-3 space-y-3">
              {(Object.keys(value.weights) as FactorKey[]).map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <div className="w-44 text-sm font-medium text-ink-800">{FACTOR_LABELS[k]}</div>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={value.weights[k]}
                    onChange={(e) => setWeight(k, Number(e.target.value))}
                    className="flex-1 accent-moss-600"
                    data-testid={`weight-${k}`}
                    aria-label={`${FACTOR_LABELS[k]} importance`}
                  />
                  <div className="w-8 text-right font-mono text-sm text-ink-700">
                    {value.weights[k]}
                  </div>
                  <div className="hidden flex-1 text-xs text-ink-500 md:block">
                    {FACTOR_HELP[k]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="field-label">Outreach</div>
            <p className="mt-1 text-xs text-ink-500">
              HomeHound generates first-touch drafts only. Nothing is sent without your review.
            </p>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-ink-800">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={value.outreach.autoDraft}
                  onChange={(e) =>
                    update("outreach", { ...value.outreach, autoDraft: e.target.checked })
                  }
                  data-testid="outreach-auto"
                />
                Auto-draft outreach for top recommendations
              </label>

              <div>
                <label className="field-label" htmlFor="outreach-tone">
                  Tone
                </label>
                <select
                  id="outreach-tone"
                  className="input mt-1"
                  data-testid="outreach-tone"
                  value={value.outreach.tone}
                  onChange={(e) =>
                    update("outreach", { ...value.outreach, tone: e.target.value as SearchCriteria["outreach"]["tone"] })
                  }
                >
                  <option value="warm">Warm</option>
                  <option value="concise">Concise</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="outreach-intro">
                  Sign-off line
                </label>
                <input
                  id="outreach-intro"
                  className="input mt-1"
                  data-testid="outreach-intro"
                  value={value.outreach.introLine}
                  onChange={(e) =>
                    update("outreach", { ...value.outreach, introLine: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function CurrencyInput({
  value,
  onChange,
  ariaLabel,
  testId,
  invalid,
}: {
  value: number;
  onChange: (n: number) => void;
  ariaLabel: string;
  testId: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative flex-1">
      <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-ink-400">
        $
      </span>
      <input
        type="number"
        min={0}
        step={50}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        data-testid={testId}
        className={"input pl-7 " + (invalid ? "border-clay-400 focus:border-clay-500 focus:ring-clay-100" : "")}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(NaN);
            return;
          }
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : NaN);
        }}
      />
    </div>
  );
}

function computeBudgetError(min: number, max: number): string | null {
  const minOk = Number.isFinite(min) && min >= 0;
  const maxOk = Number.isFinite(max) && max >= 0;
  if (!minOk && !maxOk) return "Enter both a min and a max budget.";
  if (!minOk) return "Minimum budget is missing or invalid.";
  if (!maxOk) return "Maximum budget is missing or invalid.";
  if (min > max) return "Minimum budget is higher than the max — try swapping them.";
  return null;
}
