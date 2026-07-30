// Shared presentational pieces for the Control Room tabs. Pure styling —
// no data access lives here. Server and client components both import from
// this file (nothing below touches server-only APIs).

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

export const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-label)",
  fontWeight: 800,
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  color: MUTED,
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
        padding: "var(--space-4) var(--space-5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={eyebrow}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

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
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color,
        border: `1px ${dashed ? "dashed" : "solid"} ${color}`,
        borderRadius: "var(--radius-pill)",
        padding: "2px 8px",
        whiteSpace: "nowrap",
        background: "var(--color-surface-raised)",
      }}
    >
      {text}
    </span>
  );
}

export function Meta({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: "var(--text-micro)", color: SUBTLE }}>{children}</span>;
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
          fontFamily: mono,
          fontSize: 28,
          fontWeight: 600,
          color: tone ?? "var(--color-text)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "var(--text-micro)", color: SUBTLE, marginTop: 5 }}>{label}</div>
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 style={{ ...eyebrow, margin: "0 0 10px" }}>{children}</h2>;
}
