// Small shared pieces for the admin shell. Tailwind against the token theme —
// no inline style objects (DECISIONS.md → "Tailwind is the styling system for
// new work"). Pure presentation; nothing here reads data.

import { TONE_BG, TONE_BORDER, TONE_TEXT, type Tone } from "./tone";

/** The em-dash every unknown number renders. Never a zero, never a spinner.
 *  Moved from hubUi.tsx unchanged — the rule it encodes is older than this
 *  redesign and outlives it. */
export const DASH = "—";

/** Micro caps label — column headers, eyebrows. */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-sans text-ops-micro font-bold uppercase text-content-subtle ${className}`}>
      {children}
    </span>
  );
}

/** Panel heading. Caps sans at 13px — was 18px serif. Serif now survives only
 *  in the page title and Today's one hero number. */
export function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0 font-sans text-ops-panel font-bold uppercase text-content">{children}</h2>
  );
}

export function Panel({
  title,
  right,
  children,
  className = "",
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-edge bg-surface-raised p-ops-panel ${className}`}
    >
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
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

/**
 * Chip. Tinted fill + hairline border; `unknown` is dashed and untinted.
 * Text uses TONE_TEXT, so `warn` renders in the darker amber step and never
 * fails AA as small amber on white.
 */
export function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const unknown = tone === "unknown";
  return (
    <span
      className={`inline-flex flex-none items-center whitespace-nowrap rounded-pill border px-2 py-[2px] font-sans text-ops-micro font-bold uppercase ${TONE_TEXT[tone]} ${TONE_BORDER[tone]} ${
        unknown ? "border-dashed" : ""
      }`}
    >
      {children}
    </span>
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
 * it covers" that appears under data. This is the affordance that replaces
 * paragraphs — it is capped at one line by design, and anything longer belongs
 * in an InfoPopover.
 */
export function Provenance({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 truncate font-sans text-ops-label text-content-subtle">{children}</p>
  );
}
