export function Hero({ neighborhoodCount, listingCount }: { neighborhoodCount: number; listingCount: number }) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-moss-200/50 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-clay-200/40 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-12 pt-14 md:pt-20">
        <div className="max-w-3xl">
          <div className="section-eyebrow mb-3">A broker that never sleeps</div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink-900 md:text-6xl">
            Find a <span className="italic text-moss-700">neighborhood</span>,
            <br className="hidden md:block" /> not just an apartment.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-600 md:text-lg">
            HomeHound scrapes listings, scores them against what actually matters to you —
            safety, commute, food, vibe — and drafts the landlord outreach so you can stop
            refreshing tabs at 11pm.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-ink-600">
            <Stat label="neighborhoods indexed" value={neighborhoodCount} />
            <Dot />
            <Stat label="live listings" value={listingCount} />
            <Dot />
            <Stat label="hours of refreshing saved" value="∞" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-display text-2xl font-semibold text-ink-900">{value}</span>
      <span className="text-ink-500">{label}</span>
    </span>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-ink-300" aria-hidden="true" />;
}
