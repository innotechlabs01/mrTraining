/**
 * Route-level loading UI for the app shell (coach + nutrition).
 *
 * App Router streams this while the page resolves data, so navigation feels
 * instant instead of blocking on fetches. Dark-first, single-accent design
 * per rules/02-design-system (no accent color in the skeleton itself —
 * surfaces only, so the brand accent stays reserved for live content).
 */
export default function AppLoading() {
  return (
    <div
      className="min-h-screen bg-surface-0"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>
      <div className="animate-pulse">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between border-b border-surface-3 px-6">
          <div className="h-6 w-32 rounded bg-surface-2" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-surface-2" />
            <div className="hidden h-8 w-24 rounded bg-surface-2 sm:block" />
          </div>
        </div>

        {/* Content cards */}
        <div className="mx-auto grid max-w-7xl gap-6 p-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-surface-3 bg-surface-1 p-5"
            >
              <div className="mb-4 h-4 w-1/2 rounded bg-surface-2" />
              <div className="mb-2 h-3 w-full rounded bg-surface-2" />
              <div className="h-3 w-3/4 rounded bg-surface-2" />
              <div className="mt-4 h-8 w-24 rounded bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
