export function Header() {
  return (
    <header className="border-b border-ink-100 bg-white/70 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="font-display text-xl font-semibold tracking-tight text-ink-900">
              HomeHound
            </div>
            <div className="text-xs text-ink-500">
              the apartment agent that knows your neighborhood
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          <a className="btn-ghost" href="#criteria" data-testid="nav-criteria">
            Criteria
          </a>
          <a className="btn-ghost" href="#neighborhoods" data-testid="nav-neighborhoods">
            Neighborhoods
          </a>
          <a className="btn-ghost" href="#outreach" data-testid="nav-outreach">
            Outreach
          </a>
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div
      aria-hidden="true"
      className="grid h-10 w-10 place-items-center rounded-xl2 bg-moss-700 text-moss-50 shadow-soft"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9h14v-9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="14" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
