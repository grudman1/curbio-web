import Link from "next/link";

// The container every ops panel composes from: 16px radius, hairline border,
// no shadow.
//
// `headerHref` makes ONLY the header row a link, never the whole card — a card
// whose body is an interactive chart or table must not swallow clicks meant
// for its contents.
//
// NO CAPTIONS. There is no slot for a grey sentence explaining what a card
// contains — the title and the data carry that. Where a number genuinely needs
// qualifying ("through Aug 14"), it goes on `titleTooltip` and surfaces on
// hover, costing no vertical space and no visual weight. The old `meta` slot
// became a caption slot in practice and is gone.

export function OpsCard({
  title,
  titleTooltip,
  headerHref,
  control,
  children,
  footer,
  fill = false,
  ruled = false,
  className = "",
}: {
  title?: string;
  /** Qualification for the title, on hover. Never rendered as standing text. */
  titleTooltip?: string;
  /** When set, the header row links here. The body never does. */
  headerHref?: string;
  /** A control that scopes this card's own contents (e.g. a segmented range). */
  control?: React.ReactNode;
  children: React.ReactNode;
  /** Pinned below the body — a link out of a capped list, never a caption. */
  footer?: React.ReactNode;
  /** Fill the grid row's height, so paired cards agree. */
  fill?: boolean;
  /** Rule between header and body — for panels where the two are distinct. */
  ruled?: boolean;
  className?: string;
}) {
  const head = (title || control) && (
    <div className="ops-card-head">
      {title && (
        <h2
          className={`ops-card-title${titleTooltip ? " ops-card-title--info" : ""}`}
          title={titleTooltip}
        >
          {title}
        </h2>
      )}
      {control && <span className="ml-auto">{control}</span>}
    </div>
  );

  return (
    <section className={`ops-card${fill ? " ops-card--fill" : ""} ${className}`}>
      {head &&
        (headerHref ? (
          <Link href={headerHref} className="block no-underline">
            {head}
          </Link>
        ) : (
          head
        ))}
      <div className={`ops-card-body${ruled ? " ops-card-body--ruled" : ""}`}>
        {children}
        {footer && <div className="ops-card-foot">{footer}</div>}
      </div>
    </section>
  );
}

/** KPI tile: label → number → badge. No icon tile — an icon cannot
 *  disambiguate "Qualified leads" from "Close rate", so it would be
 *  decoration, and this screen does not spend space on decoration. */
export function OpsMetric({
  label,
  value,
  suffix,
  badge,
  unwired,
  sparkline,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  badge?: React.ReactNode;
  /** No data source: dashed border, hollow dot, em-dash value, no caption. */
  unwired?: { tooltip: string };
  sparkline?: React.ReactNode;
}) {
  return (
    // No dashed border for an unwired metric. It singled ONE card out as
    // visually broken among four, which reads as "this card failed" rather
    // than "this number has no source yet". The hollow dot and the em-dash
    // already carry that, and they carry it without shouting.
    <div className="ops-card ops-card--pad flex flex-col justify-between">
      <div className="flex items-center gap-2">
        <span className="ops-metric-label truncate">{label}</span>
        {unwired && (
          <span
            className="ops-dot ops-dot--unwired ml-auto"
            title={unwired.tooltip}
            aria-label={unwired.tooltip}
            role="img"
          />
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className={`ops-metric-value${unwired ? " ops-metric-value--empty" : ""}`}>
            {value}
          </span>
          {/* nowrap: the suffix is a unit, and a unit that wraps under its own
              number reads as a second line of data rather than as part of it. */}
          {suffix && <span className="ops-metric-suffix whitespace-nowrap">{suffix}</span>}
        </div>
        {/* flex-none: if anything has to give, it is not the chart's scale. */}
        {sparkline && <span className="flex-none">{sparkline}</span>}
      </div>

      {/* Reserved even when empty, so a card without a delta doesn't sit
          shorter than its neighbours in the grid. */}
      <div className="mt-3 min-h-[22px]">{badge}</div>
    </div>
  );
}

/** Signed delta as a tinted pill. `goodDirection` decides only the COLOUR —
 *  the sign is always literal, so a metric where more is worse still shows a
 *  rise honestly, just in red. */
export function OpsDelta({
  value,
  suffix = "",
  label,
  goodDirection = "up",
}: {
  value: number | null;
  /** "%", "pts" — appended to the magnitude. */
  suffix?: string;
  /** Trailing context, e.g. "vs Jul". */
  label?: string;
  goodDirection?: "up" | "down";
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="ops-badge ops-badge--neutral">—</span>
        {label && <span className="ops-subtle text-[12px]">{label}</span>}
      </span>
    );
  }
  const flat = value === 0;
  const favorable = value > 0 === (goodDirection === "up");
  const tone = flat ? "neutral" : favorable ? "success" : "error";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`ops-badge ops-badge--${tone}`}>
        {!flat && <span aria-hidden>{value > 0 ? "↑" : "↓"}</span>}
        {Math.abs(value)}
        {suffix}
      </span>
      {label && <span className="ops-subtle text-[12px]">{label}</span>}
    </span>
  );
}
