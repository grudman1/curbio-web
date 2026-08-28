"use client";

// The 2–5-way switch: attribution mode, week pickers, view toggles. One
// bordered track, filled active segment, arrow keys move the selection.

export function SegmentedControl<K extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: K;
  options: readonly { key: K; label: string; shortLabel?: string; title?: string }[];
  onChange: (key: K) => void;
  /** Accessible group name. */
  label: string;
  size?: "sm" | "md";
}) {
  const idx = options.findIndex((o) => o.key === value);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = e.key === "ArrowLeft" ? Math.max(0, idx - 1) : Math.min(options.length - 1, idx + 1);
    if (next !== idx) onChange(options[next].key);
  }

  return (
    <div
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex flex-none items-center gap-0.5 rounded-md border border-nav3-border bg-app-card p-0.5"
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            title={o.title}
            onClick={() => onChange(o.key)}
            className={`cursor-pointer whitespace-nowrap rounded-[5px] border-0 font-sans transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
              size === "sm" ? "px-2 py-[3px] text-ops-micro font-semibold" : "px-2.5 py-[5px] text-[13px] font-medium"
            } ${
              active
                ? "bg-app-well font-semibold text-nav3-hover-text"
                : "bg-transparent text-nav3-muted-text hover:text-nav3-hover-text"
            }`}
          >
            {o.shortLabel ? (
              <>
                <span className="hidden sm:inline">{o.label}</span>
                <span className="sm:hidden">{o.shortLabel}</span>
              </>
            ) : (
              o.label
            )}
          </button>
        );
      })}
    </div>
  );
}
