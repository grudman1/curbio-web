// Loading placeholders — every route ships a loading.tsx built from these,
// so navigation never flashes a blank screen. Pulse only under motion-safe.

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block rounded-md bg-app-well motion-safe:animate-[skeleton-pulse_1.6s_ease-in-out_infinite] ${className}`}
    />
  );
}

/** The default screen skeleton: title, a stat row, a table card. */
export function ScreenSkeleton({ tiles = 4, rows = 6 }: { tiles?: number; rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-[22px] w-[160px]" />
        <Skeleton className="h-[18px] w-[72px] rounded-pill" />
      </div>
      {tiles > 0 && (
        <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
          {Array.from({ length: tiles }, (_, i) => (
            <div key={i} className="rounded-lg border border-app-border bg-app-card p-3.5 shadow-app-card">
              <Skeleton className="h-[12px] w-[80px]" />
              <Skeleton className="mt-3 h-[24px] w-[56px]" />
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-app-border bg-app-card shadow-app-card">
        <div className="border-b border-app-border bg-app-well px-ops-panel py-2.5">
          <Skeleton className="h-[11px] w-[220px]" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-app-border px-ops-panel py-2.5 last:border-b-0">
            <Skeleton className="h-[13px] w-[180px]" />
            <Skeleton className="h-[13px] w-[90px]" />
            <Skeleton className="ml-auto h-[13px] w-[60px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
