import type { Metadata } from "next";
import {
  COLOR_GROUPS,
  ELEVATION_TOKENS,
  MOTION_TOKENS,
  PRIMITIVE_TOKENS,
  RADIUS_TOKENS,
  SPACE_TOKENS,
  TYPE_SCALE,
} from "@/config/designTokens";
import { TokenValue } from "./TokenValue";
import { PageHeader } from "../../_ui/v2/PageHeader";
import { StatusBadge } from "../../_ui/v2/HealthDot";

// Internal QA surface for the Phase 2 → 3 migration. Never indexed.
export const metadata: Metadata = {
  title: "Design system — Curbio",
  robots: { index: false, follow: false },
};

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: "var(--space-16)" }}>
      <h2
        title={note}
        style={{
          fontFamily: "var(--font-family-serif)",
          fontSize: 20,
          fontWeight: "var(--weight-semibold)" as unknown as number,
          letterSpacing: "var(--tracking-heading)",
          color: "var(--color-text)",
          paddingBottom: "var(--space-3)",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "var(--space-6)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({ token }: { token: string }) {
  const isText = token.startsWith("color-text");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div
        style={{
          height: 64,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: isText ? "var(--color-surface-raised)" : `var(--${token})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: `var(--${token})`,
          fontFamily: "var(--font-family-serif)",
          fontSize: "var(--text-h4)",
        }}
      >
        {isText ? "Ag" : ""}
      </div>
      <code style={{ fontSize: "var(--text-micro)", color: "var(--color-text)" }}>--{token}</code>
      <TokenValue token={token} />
    </div>
  );
}

const grid = (min: number) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
  gap: "var(--space-5)",
});

export default function DesignSystemPage() {
  // Renders inside the Control Room tab shell (../layout.tsx), which already
  // provides the page chrome — so this is a <div> in the content column, not
  // its own <main> with its own gutters.
  return (
    <div
      style={{
        maxWidth: "var(--container-max)",
        padding: "var(--space-2) 0 var(--space-8)",
      }}
    >
      <PageHeader
        title="Design system"
        badge={
          <>
            <StatusBadge
              status="app/tokens.css"
              tone="neutral"
              title="Live reference for the semantic token layer: every value is read from app/tokens.css at render time. Semantic tokens point at the primitive palette at the bottom; a rebrand replaces the primitives and everything here follows."
            />
            <StatusBadge
              status="two systems"
              tone="warning"
              title="Two systems are live at once, deliberately. The legacy lp-* rules that style sell.curbio.com consume the primitives directly and are untouched until Phase 3; everything new consumes the semantic layer. See DECISIONS.md."
            />
          </>
        }
      />

      {COLOR_GROUPS.map((g) => (
        <Section key={g.title} id={`color-${g.title.toLowerCase()}`} title={`Color — ${g.title}`} note={g.note}>
          <div style={grid(150)}>
            {g.tokens.map((t) => (
              <Swatch key={t} token={t} />
            ))}
          </div>
        </Section>
      ))}

      <Section id="type" title="Type scale">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {TYPE_SCALE.map((t) => (
            <div key={t.token} style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-4)" }}>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  alignItems: "baseline",
                  marginBottom: "var(--space-2)",
                }}
              >
                <code style={{ fontSize: "var(--text-micro)", color: "var(--color-text-muted)" }}>
                  --{t.token}
                </code>
                <TokenValue token={t.token} inline />
              </div>
              <div
                style={{
                  fontFamily: `var(--font-family-${t.family})`,
                  fontSize: `var(--${t.token})`,
                  lineHeight: "var(--leading-heading)",
                  color: "var(--color-text)",
                }}
              >
                {t.label} — the one call that does it all
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="space" title="Spacing" note="4px base scale.">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {SPACE_TOKENS.map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <code style={{ fontSize: "var(--text-micro)", width: 110, color: "var(--color-text-muted)" }}>
                --{t}
              </code>
              <div style={{ height: 16, width: `var(--${t})`, background: "var(--color-accent)", borderRadius: "var(--radius-sm)" }} />
              <TokenValue token={t} inline />
            </div>
          ))}
        </div>
      </Section>

      <Section id="radius" title="Radii">
        <div style={grid(140)}>
          {RADIUS_TOKENS.map((t) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div
                style={{
                  height: 72,
                  background: "var(--color-surface-inverse)",
                  borderRadius: `var(--${t})`,
                }}
              />
              <code style={{ fontSize: "var(--text-micro)", color: "var(--color-text)" }}>--{t}</code>
              <TokenValue token={t} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="elevation" title="Elevation">
        <div style={grid(180)}>
          {ELEVATION_TOKENS.map((t) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div
                style={{
                  height: 84,
                  background: "var(--color-surface-raised)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: `var(--${t})`,
                }}
              />
              <code style={{ fontSize: "var(--text-micro)", color: "var(--color-text)" }}>--{t}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="motion"
        title="Motion"
        note="Hover a swatch to see the duration and easing applied. All motion is disabled under prefers-reduced-motion."
      >
        <div style={grid(180)}>
          {MOTION_TOKENS.filter((t) => t.startsWith("duration")).map((t) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div
                className="ds-motion"
                style={{
                  height: 64,
                  background: "var(--color-accent)",
                  borderRadius: "var(--radius-md)",
                  transitionDuration: `var(--${t})`,
                  transitionTimingFunction: "var(--easing-out)",
                  transitionProperty: "transform, background",
                }}
              />
              <code style={{ fontSize: "var(--text-micro)", color: "var(--color-text)" }}>--{t}</code>
              <TokenValue token={t} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {MOTION_TOKENS.filter((t) => t.startsWith("easing")).map((t) => (
            <div key={t} style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
              <code style={{ fontSize: "var(--text-micro)", width: 160, color: "var(--color-text-muted)" }}>
                --{t}
              </code>
              <TokenValue token={t} inline />
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="primitives"
        title="Primitive palette"
        note="The raw values the semantic layer points at. These are what Phase 3 replaces — do not reference them directly in new components."
      >
        <div style={grid(120)}>
          {PRIMITIVE_TOKENS.map((t) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div
                style={{
                  height: 56,
                  background: `var(--${t})`,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                }}
              />
              <code style={{ fontSize: "var(--text-micro)", color: "var(--color-text)" }}>--{t}</code>
              <TokenValue token={t} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
