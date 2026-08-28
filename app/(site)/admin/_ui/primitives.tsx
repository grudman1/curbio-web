// Small shared pieces for the admin shell. Tailwind against the token theme —
// no inline style objects, no hexes (DESIGN-APP.md). Pure presentation;
// nothing here reads data. Server-safe: no hooks, no handlers.

import { TONE_BORDER, TONE_BG, type Tone } from "./tone";

/** The em-dash every unknown number renders. Never a zero, never a spinner. */
export const DASH = "—";

/** Micro caps label — column headers only. Not a heading voice. */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-sans text-ops-micro font-bold uppercase text-content-subtle ${className}`}>
      {children}
    </span>
  );
}

/** Card title. Sentence-case sans, 14px/600 — not caps, not serif. */
export function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0 font-sans text-ops-card-title font-semibold text-content">{children}</h2>
  );
}

/** The card every screen composes from: white, 12px radius, soft border and
 *  shadow. `flush` drops the padding for cards whose body is a full-bleed
 *  table. */
export function Panel({
  title,
  right,
  children,
  className = "",
  flush = false,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={`rounded-lg border border-app-border bg-app-card shadow-app-card ${
        flush ? "overflow-hidden" : "p-ops-panel"
      } ${className}`}
    >
      {(title || right) && (
        <div className={`flex items-center justify-between gap-3 ${flush ? "px-ops-panel pt-ops-panel pb-3" : "mb-3"}`}>
          {title ? <PanelHeading>{title}</PanelHeading> : <span />}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Status dot. `unknown` is hollow and dashed — it can never be produced as a
 * filled dot, because the fill is chosen here and not by the caller.
 */
export function StatusDot({ tone, title }: { tone: Tone; title?: string }) {
  const unknown = tone === "unknown";
  return (
    <span
      title={title}
      aria-hidden
      className={`inline-block h-[7px] w-[7px] flex-none rounded-full border-[1.5px] ${TONE_BORDER[tone]} ${TONE_BG[tone]} ${
        unknown ? "border-dashed" : ""
      }`}
    />
  );
}

const BADGE_TONE: Record<Tone, string> = {
  good: "bg-pill-good-bg text-pill-good-fg",
  warn: "bg-pill-warn-bg text-pill-warn-fg",
  bad: "bg-pill-bad-bg text-pill-bad-fg",
  // No fill by rule: a missing state never gets a colour.
  unknown: "border border-dashed border-tone-unknown bg-transparent text-content-subtle",
};

/**
 * Status pill — muted tinted fill + darker text of the same hue
 * (Pipedrive-style). `unknown` renders as a dashed outline with no fill.
 * `info` and `neutral` exist for badges that carry no judgement.
 */
export function Badge({
  tone,
  children,
  title,
}: {
  tone: Tone | "info" | "neutral";
  children: React.ReactNode;
  title?: string;
}) {
  const cls =
    tone === "info"
      ? "bg-pill-info-bg text-pill-info-fg"
      : tone === "neutral"
        ? "bg-pill-neutral-bg text-pill-neutral-fg"
        : BADGE_TONE[tone];
  return (
    <span
      title={title}
      className={`inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-pill px-2 py-[3px] font-sans text-ops-micro font-bold ${cls}`}
    >
      {children}
    </span>
  );
}

/** Back-compat alias — same component, previous name. */
export function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

const STAT_TONE: Record<Tone, string> = {
  good: "text-tone-good",
  warn: "text-tone-warn-text",
  bad: "text-tone-bad",
  unknown: "text-content-subtle",
};

/** Small stat inside a card: value over label. `null` renders the em-dash.
 *  For the screen-top KPI row use StatCard; this is the in-panel size. */
export function InlineStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string | null;
  tone?: Tone;
}) {
  const known = value !== null;
  return (
    <div className="min-w-[72px]">
      <div
        className={`font-sans text-[22px] font-semibold leading-none tabular-nums ${
          !known ? "text-content-subtle" : tone ? STAT_TONE[tone] : "text-content"
        }`}
      >
        {known ? value : DASH}
      </div>
      <div className="mt-1 font-sans text-ops-label text-content-muted">{label}</div>
    </div>
  );
}

/** Right-aligned muted metadata — counts, timestamps, provenance. */
export function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap font-sans text-ops-label text-content-subtle">{children}</span>
  );
}

/**
 * Provenance line. The one-line "where this number came from and what window
 * it covers" that appears under data. Capped at one line by design; anything
 * longer belongs in an InfoPopover.
 */
export function Provenance({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 truncate font-sans text-ops-label text-content-subtle">{children}</p>
  );
}
