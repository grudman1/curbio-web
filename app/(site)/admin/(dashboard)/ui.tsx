// Shared presentational pieces for the Control Room tabs. Pure styling —
// no data access lives here. Server and client components both import from
// this file (nothing below touches server-only APIs).
//
// Design language: the public site's, tool-shaped. Serif (Lora) for panel
// and section headings, sans (Libre Franklin) for everything operational,
// navy on white with stone hairlines, amber only as accent. Mono is
// reserved for genuinely code-like values (URL slugs) — nothing else.

export const mono = "var(--font-mono)";
export const OK = "var(--color-state-success)";
export const FAIL = "var(--color-state-error)";
export const WARN = "var(--color-accent)";
export const MUTED = "var(--color-text-muted)";
export const SUBTLE = "var(--color-text-subtle)";

// How many recent leads feed the aggregates AND the alert banner's 24 h
// failure scan. Labelled everywhere it is shown — these are "last N"
// numbers, never dressed up as all-time analytics.
export const SCAN = 200;

// Micro caps label — the brand's eyebrow pattern, used for column headers
// and small in-panel labels (not for headings; those are serif now).
export const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SUBTLE,
  margin: 0,
};

// Serif panel heading — small enough to stay tool-like, unmistakably the
// brand's headline voice.
export const panelHeading: React.CSSProperties = {
  fontFamily: "var(--font-family-serif)",
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: "var(--tracking-heading)",
  color: "var(--color-text)",
  margin: 0,
};

export function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-raised)",
        padding: "var(--space-5) var(--space-6) var(--space-6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: "var(--space-4)",
        }}
      >
        <h2 style={panelHeading}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

// Soft status pill: tinted fill, hairline border, sans. `color` is any of
// the tone constants above — fill and border derive from it, so callers
// keep the old (text, color) API.
export function Chip({
  text,
  color,
  dashed = false,
}: {
  text: string;
  color: string;
  dashed?: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        color,
        border: `1px ${dashed ? "dashed" : "solid"} color-mix(in srgb, ${color} 32%, transparent)`,
        borderRadius: "var(--radius-pill)",
        padding: "3px 10px",
        whiteSpace: "nowrap",
        background: dashed ? "transparent" : `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      {text}
    </span>
  );
}

export function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: "var(--text-label)",
        color: SUBTLE,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div style={{ minWidth: 86 }}>
      <div
        style={{
          fontFamily: "var(--font-family-serif)",
          fontSize: 32,
          fontWeight: 600,
          color: tone ?? "var(--color-text)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-label)",
          color: MUTED,
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        ...panelHeading,
        fontSize: 20,
        margin: "0 0 var(--space-4)",
      }}
    >
      {children}
    </h2>
  );
}
