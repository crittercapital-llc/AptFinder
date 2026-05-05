"use client";

import { useState } from "react";
import {
  BUILDING_STYLE_LABELS,
  COMMUTE_MODE_LABELS,
  LIFESTYLE_LABELS,
} from "@/lib/discovery";
import { COMMUTE_DESTINATIONS } from "@/lib/defaults";
import type {
  BuildingStyle,
  DiscoveryAnswers,
  DiscoveryCommuteMode,
  LifestyleInterest,
  NoisePreference,
} from "@/lib/types";

interface Props {
  initial: DiscoveryAnswers;
  onSubmit: (answers: DiscoveryAnswers) => void;
}

const STEPS = [
  { id: "commute", label: "Commute" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "life", label: "Life situation" },
  { id: "housing", label: "Housing style" },
] as const;

const COMMUTE_MODE_ORDER: DiscoveryCommuteMode[] = ["rail", "bus", "drive", "bike", "walk"];
const LIFESTYLE_ORDER: LifestyleInterest[] = [
  "parks",
  "restaurants",
  "nightlife",
  "cafes",
  "fitness",
  "quiet_walks",
  "cultural",
];
const BUILDING_STYLE_ORDER: BuildingStyle[] = [
  "large_buildings",
  "small_buildings",
  "mom_and_pop",
  "boutique_victorian",
];

export function DiscoveryWizard({ initial, onSubmit }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<DiscoveryAnswers>(initial);

  function patch<K extends keyof DiscoveryAnswers>(k: K, v: DiscoveryAnswers[K]) {
    setAnswers((a) => ({ ...a, [k]: v }));
  }

  function toggleMode(m: DiscoveryCommuteMode) {
    patch(
      "commuteModes",
      answers.commuteModes.includes(m)
        ? answers.commuteModes.filter((x) => x !== m)
        : [...answers.commuteModes, m],
    );
  }

  function toggleLifestyle(l: LifestyleInterest) {
    patch(
      "lifestyle",
      answers.lifestyle.includes(l)
        ? answers.lifestyle.filter((x) => x !== l)
        : [...answers.lifestyle, l],
    );
  }

  function toggleStyle(s: BuildingStyle) {
    patch(
      "buildingStyles",
      answers.buildingStyles.includes(s)
        ? answers.buildingStyles.filter((x) => x !== s)
        : [...answers.buildingStyles, s],
    );
  }

  const isLast = stepIndex === STEPS.length - 1;
  const stepValid = isStepValid(stepIndex, answers);

  function next() {
    if (!stepValid) return;
    if (isLast) {
      onSubmit(answers);
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function back() {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  }

  return (
    <section
      id="discovery"
      className="card p-6 md:p-8"
      data-testid="discovery-wizard"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="section-eyebrow">Neighborhood discovery</div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            Let&apos;s find the right neighborhoods first.
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-600">
            A few quick questions about your day-to-day. We&apos;ll recommend
            neighborhoods that fit before showing you any apartments.
          </p>
        </div>
        <div className="text-xs text-ink-500" data-testid="discovery-step-indicator">
          Step {stepIndex + 1} of {STEPS.length} ·{" "}
          <span className="text-ink-700">{STEPS[stepIndex].label}</span>
        </div>
      </div>

      <ol
        className="mt-5 grid grid-cols-4 gap-2 text-xs"
        data-testid="discovery-progress"
        aria-label="Progress"
      >
        {STEPS.map((s, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
          return (
            <li key={s.id} className="flex flex-col gap-1">
              <div
                className={
                  "h-1.5 rounded-full " +
                  (state === "done"
                    ? "bg-moss-600"
                    : state === "active"
                      ? "bg-moss-400"
                      : "bg-ink-100")
                }
                data-testid={`discovery-progress-${s.id}-${state}`}
              />
              <span
                className={
                  state === "pending" ? "text-ink-400" : "font-medium text-ink-700"
                }
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-7">
        {stepIndex === 0 && (
          <CommuteStep
            answers={answers}
            patch={patch}
            toggleMode={toggleMode}
          />
        )}
        {stepIndex === 1 && (
          <LifestyleStep
            answers={answers}
            patch={patch}
            toggleLifestyle={toggleLifestyle}
          />
        )}
        {stepIndex === 2 && <LifeStep answers={answers} patch={patch} />}
        {stepIndex === 3 && (
          <HousingStep answers={answers} toggleStyle={toggleStyle} />
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
        <button
          type="button"
          className="btn-ghost"
          onClick={back}
          disabled={stepIndex === 0}
          data-testid="discovery-back"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          {!stepValid && (
            <span
              className="text-xs text-clay-700"
              data-testid="discovery-step-error"
              role="alert"
            >
              {stepValidationMessage(stepIndex, answers)}
            </span>
          )}
          <button
            type="button"
            className="btn"
            onClick={next}
            disabled={!stepValid}
            data-testid={isLast ? "discovery-submit" : "discovery-next"}
          >
            {isLast ? "See recommended neighborhoods" : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}

function isStepValid(step: number, a: DiscoveryAnswers): boolean {
  if (step === 0) {
    return (
      !!a.commuteDestination &&
      Number.isFinite(a.commuteMaxMinutes) &&
      a.commuteMaxMinutes >= 5 &&
      a.commuteModes.length > 0
    );
  }
  if (step === 2) {
    return Number.isFinite(a.yearsPlanned) && a.yearsPlanned >= 1;
  }
  return true;
}

function stepValidationMessage(step: number, a: DiscoveryAnswers): string {
  if (step === 0) {
    if (a.commuteModes.length === 0) return "Pick at least one commute method.";
    if (!Number.isFinite(a.commuteMaxMinutes) || a.commuteMaxMinutes < 5) {
      return "Set a commute time of at least 5 minutes.";
    }
  }
  if (step === 2) {
    if (!Number.isFinite(a.yearsPlanned) || a.yearsPlanned < 1) {
      return "Tell us how many years you plan to stay (≥1).";
    }
  }
  return "";
}

function CommuteStep({
  answers,
  patch,
  toggleMode,
}: {
  answers: DiscoveryAnswers;
  patch: <K extends keyof DiscoveryAnswers>(k: K, v: DiscoveryAnswers[K]) => void;
  toggleMode: (m: DiscoveryCommuteMode) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="field-label" htmlFor="discovery-destination">
          Where will you commute to most often?
        </label>
        <select
          id="discovery-destination"
          className="input mt-2"
          value={answers.commuteDestination}
          onChange={(e) => patch("commuteDestination", e.target.value)}
          data-testid="discovery-destination"
        >
          {COMMUTE_DESTINATIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-500">
          Office, school, or wherever you spend most of your weekday hours.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="field-label" htmlFor="discovery-commute-max">
            Preferred commute time
          </label>
          <span className="font-mono text-sm text-ink-700">
            up to {answers.commuteMaxMinutes} min
          </span>
        </div>
        <input
          id="discovery-commute-max"
          type="range"
          min={10}
          max={75}
          step={5}
          value={answers.commuteMaxMinutes}
          onChange={(e) => patch("commuteMaxMinutes", Number(e.target.value))}
          className="mt-2 w-full accent-moss-600"
          data-testid="discovery-commute-max"
          aria-label="Maximum commute minutes"
        />
      </div>

      <fieldset>
        <legend className="field-label">
          Which commute methods are you open to?
        </legend>
        <p className="mt-1 text-xs text-ink-500">
          Toggle off anything you&apos;d rather not rely on (e.g. buses).
        </p>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="discovery-modes">
          {COMMUTE_MODE_ORDER.map((m) => {
            const on = answers.commuteModes.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMode(m)}
                aria-pressed={on}
                data-testid={`discovery-mode-${m}`}
                className={
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition " +
                  (on
                    ? "border-moss-600 bg-moss-600 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50")
                }
              >
                {COMMUTE_MODE_LABELS[m]}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function LifestyleStep({
  answers,
  patch,
  toggleLifestyle,
}: {
  answers: DiscoveryAnswers;
  patch: <K extends keyof DiscoveryAnswers>(k: K, v: DiscoveryAnswers[K]) => void;
  toggleLifestyle: (l: LifestyleInterest) => void;
}) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="field-label">What do you actually like to do?</legend>
        <p className="mt-1 text-xs text-ink-500">
          Pick everything that sounds like a normal week for you.
        </p>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="discovery-lifestyle">
          {LIFESTYLE_ORDER.map((l) => {
            const on = answers.lifestyle.includes(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggleLifestyle(l)}
                aria-pressed={on}
                data-testid={`discovery-lifestyle-${l}`}
                className={
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition " +
                  (on
                    ? "border-moss-600 bg-moss-600 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50")
                }
              >
                {LIFESTYLE_LABELS[l]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Noise level</legend>
        <div
          className="mt-2 grid grid-cols-3 gap-2"
          data-testid="discovery-noise"
          role="radiogroup"
        >
          {(["quiet", "balanced", "lively"] as NoisePreference[]).map((p) => {
            const on = answers.noise === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => patch("noise", p)}
                data-testid={`discovery-noise-${p}`}
                className={
                  "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition " +
                  (on
                    ? "border-moss-600 bg-moss-50 text-moss-800"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50")
                }
              >
                {p === "quiet" ? "Quiet" : p === "balanced" ? "Balanced" : "Lively"}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ToggleCard
          checked={answers.wantsNightlifeNearby}
          onChange={(v) => patch("wantsNightlifeNearby", v)}
          testId="discovery-wants-nightlife"
          title="Near bars & restaurants"
          subtitle="Want to walk to dinner and a drink without thinking about it."
        />
        <ToggleCard
          checked={answers.wantsParksNearby}
          onChange={(v) => patch("wantsParksNearby", v)}
          testId="discovery-wants-parks"
          title="Near parks & green space"
          subtitle="Trees and benches you can reach in 10 minutes."
        />
      </div>
    </div>
  );
}

function LifeStep({
  answers,
  patch,
}: {
  answers: DiscoveryAnswers;
  patch: <K extends keyof DiscoveryAnswers>(k: K, v: DiscoveryAnswers[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <ToggleCard
        checked={answers.hasYoungKids}
        onChange={(v) => patch("hasYoungKids", v)}
        testId="discovery-has-kids"
        title="Family with young kids?"
        subtitle="If yes, we'll weight schools, sidewalks, and calmer streets more heavily."
      />

      <div>
        <div className="flex items-baseline justify-between">
          <label className="field-label" htmlFor="discovery-years">
            How many years do you plan to live here?
          </label>
          <span className="font-mono text-sm text-ink-700" data-testid="discovery-years-display">
            {answers.yearsPlanned} year{answers.yearsPlanned === 1 ? "" : "s"}
          </span>
        </div>
        <input
          id="discovery-years"
          type="range"
          min={1}
          max={10}
          step={1}
          value={answers.yearsPlanned}
          onChange={(e) => patch("yearsPlanned", Number(e.target.value))}
          className="mt-2 w-full accent-moss-600"
          data-testid="discovery-years"
          aria-label="Years planned"
        />
        <p className="mt-1 text-xs text-ink-500">
          Longer stays bias us toward neighborhoods that hold up over time.
        </p>
      </div>
    </div>
  );
}

function HousingStep({
  answers,
  toggleStyle,
}: {
  answers: DiscoveryAnswers;
  toggleStyle: (s: BuildingStyle) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="field-label">Building styles you like</div>
        <p className="mt-1 text-xs text-ink-500">
          Pick all that apply. We&apos;ll prefer neighborhoods whose housing stock
          actually has these.
        </p>
      </div>
      <div
        className="grid grid-cols-1 gap-2 md:grid-cols-2"
        data-testid="discovery-building-styles"
      >
        {BUILDING_STYLE_ORDER.map((s) => {
          const on = answers.buildingStyles.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStyle(s)}
              aria-pressed={on}
              data-testid={`discovery-building-${s}`}
              className={
                "rounded-xl2 border px-4 py-3 text-left transition " +
                (on
                  ? "border-moss-600 bg-moss-50 text-moss-900"
                  : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50")
              }
            >
              <div className="text-sm font-semibold">{BUILDING_STYLE_LABELS[s]}</div>
              <div className="mt-0.5 text-xs text-ink-500">{describeStyle(s)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function describeStyle(s: BuildingStyle): string {
  switch (s) {
    case "large_buildings":
      return "50+ units, full amenities, doormen, gyms.";
    case "small_buildings":
      return "12–50 units — somewhere between boutique and tower.";
    case "mom_and_pop":
      return "Owner-operated, fewer units, tight upkeep.";
    case "boutique_victorian":
      return "Pre-war character — Victorians, Edwardians, walk-ups.";
  }
}

function ToggleCard({
  checked,
  onChange,
  testId,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  testId: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      data-testid={testId}
      className={
        "flex w-full items-start gap-3 rounded-xl2 border px-4 py-3 text-left transition " +
        (checked
          ? "border-moss-600 bg-moss-50 text-moss-900"
          : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50")
      }
    >
      <span
        className={
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border " +
          (checked ? "border-moss-600 bg-moss-600 text-white" : "border-ink-300 bg-white")
        }
        aria-hidden="true"
      >
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-500">{subtitle}</span>
      </span>
    </button>
  );
}
