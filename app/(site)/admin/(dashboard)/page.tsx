import { buildPageRegistry, type RegistryEntry } from "@/config/pageRegistry";
import { Chip, MUTED, OK, SUBTLE, SectionHeading, WARN, mono } from "./ui";
import { MARKETS } from "@/config/markets";

// ─────────────────────────────────────────────────────────────────────────────
// Pages tab — the landing view of the Control Room: is the site healthy,
// what's live, what's backlog. The site itself as live previews, grouped by
// tier, plus the nav-promised backlog as ghost cards.
//
// PREVIEWS are iframes sandboxed WITHOUT allow-scripts: genuinely current
// (the real deployed page, not a screenshot) and analytics can never fire
// from them — no JS runs. allow-same-origin is granted only so stylesheets
// apply; with scripting disabled the document cannot act on that origin.
// Picker-mode roots render only a skeleton server-side, so their cards
// preview a concrete per-market variant, labelled. What you see is the
// server HTML — live visitors additionally get client-side market resolution.
// ─────────────────────────────────────────────────────────────────────────────

// ── Previews ────────────────────────────────────────────────────────────────
// Registry path → the concrete URL worth looking at. Per-market rows fold
// into their parent card as a "×N markets" badge, N from the market list.
function previewPlan(entries: RegistryEntry[]) {
  const cards: { entry: RegistryEntry; src: string | null; note?: string; variants?: number }[] = [];
  for (const e of entries) {
    if (e.status === "planned") continue;
    if (e.path.includes(":market")) {
      const parent = cards.find((c) => e.path.startsWith(`${c.entry.path}/m/`));
      if (parent) {
        parent.variants = MARKETS.length;
        continue;
      }
    }
    if (e.path === "/admin") {
      cards.push({ entry: e, src: null, note: "this control room" });
      continue;
    }
    if (e.path === "/admin/leads") {
      cards.push({ entry: e, src: null, note: "Leads tab of this control room" });
      continue;
    }
    if (e.path === "/lp/sell") {
      cards.push({ entry: e, src: "/lp/sell/m/atlanta", note: "shown: atlanta variant" });
      continue;
    }
    if (e.path === "/exp") {
      cards.push({ entry: e, src: "/exp/m/atlanta", note: "shown: atlanta variant" });
      continue;
    }
    if (e.path === "/lp/:campaign/confirm") {
      cards.push({ entry: e, src: "/lp/sell/confirm?market=atlanta", note: "shown: sell/atlanta" });
      continue;
    }
    if (e.path === "/") {
      // The homepage is being BUILT at /home-preview; the placeholder at /
      // is not worth a preview. One page, one card.
      cards.push({ entry: e, src: "/home-preview", note: e.note });
      continue;
    }
    cards.push({ entry: e, src: e.path, note: e.note });
  }
  return cards;
}

// The card thumbnail. The iframe is laid out on a virtual viewport 5× the
// card's size and scaled back down by exactly 1/5, so the capture and the
// container agree BY CONSTRUCTION: the page fills the box edge-to-edge at
// any card width, no dead space. At a typical ~300px card that is a
// ~1500×940 desktop viewport — the above-the-fold view. (The previous
// version scaled a fixed 1200×750 capture into a box sized by the grid,
// which matched only at one exact card width and left white bands
// everywhere else.)
function Frame({ src }: { src: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 10",
        overflow: "hidden",
        background: "var(--color-surface-raised)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <iframe
        src={src}
        title={src}
        loading="lazy"
        sandbox="allow-same-origin"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "500%",
          height: "500%",
          border: 0,
          transform: "scale(0.2)",
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function statusChip(e: RegistryEntry) {
  if (e.status === "live") return <Chip text="live" color={OK} />;
  if (e.status === "stub") return <Chip text="stub · renders" color={WARN} />;
  return <Chip text="planned" color={SUBTLE} dashed />;
}

export default function PagesTab() {
  const registry = buildPageRegistry();
  const cards = previewPlan(registry);
  const planned = registry.filter((e) => e.status === "planned");
  const groups: { key: string; label: string }[] = [
    { key: "campaigns", label: "Campaign tier — sell.curbio.com" },
    { key: "site", label: "Site tier — curbio.com (post-cutover)" },
    { key: "internal", label: "Internal" },
  ];

  return (
    <>
      {/* ── the site itself ── */}
      {groups.map((g) => {
        const inGroup = cards.filter((c) => c.entry.group === g.key);
        if (!inGroup.length) return null;
        return (
          <section key={g.key} style={{ marginBottom: "var(--space-8)" }}>
            <SectionHeading>{g.label}</SectionHeading>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: 14,
              }}
            >
              {inGroup.map((c) => (
                <a
                  key={c.entry.path}
                  href={c.src ?? c.entry.path}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--elevation-raised)",
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "var(--color-text)",
                  }}
                >
                  {c.src ? (
                    <Frame src={c.src} />
                  ) : (
                    <div
                      style={{
                        aspectRatio: "16 / 10",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: SUBTLE,
                        fontSize: "var(--text-small)",
                        background: "var(--color-surface)",
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      {c.note ?? c.entry.path}
                    </div>
                  )}
                  <div style={{ padding: "12px 16px 14px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--text-small)",
                          fontWeight: 600,
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {c.entry.title}
                      </span>
                      {statusChip(c.entry)}
                      {c.variants && <Chip text={`×${c.variants} markets`} color={MUTED} />}
                      {c.entry.indexed && <Chip text="indexed" color={WARN} />}
                    </div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 11,
                        color: SUBTLE,
                        marginTop: 5,
                      }}
                    >
                      {c.entry.path}
                    </div>
                    {c.note && c.src && (
                      <div style={{ fontSize: "var(--text-label)", color: SUBTLE, marginTop: 4 }}>
                        {c.note}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        );
      })}

      {/* ── the backlog: promised by the nav, not yet built ── */}
      <section>
        <SectionHeading>Backlog — linked in the nav, not built ({planned.length})</SectionHeading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 10,
          }}
        >
          {planned.map((e) => (
            <div
              key={e.path}
              style={{
                border: "1px dashed var(--color-border-strong)",
                borderRadius: "var(--radius-lg)",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: "var(--text-small)",
                  fontWeight: 600,
                  letterSpacing: "-0.005em",
                  color: "var(--color-text)",
                }}
              >
                {e.title}
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: SUBTLE, marginTop: 4 }}>
                {e.path}
              </div>
              {e.note && (
                <div style={{ fontSize: "var(--text-label)", color: MUTED, marginTop: 6 }}>
                  {e.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
