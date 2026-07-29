import type { Metadata } from "next";
import { readRecentLeads, maskName, deliveryState, type LeadRow } from "@/lib/adminLeads";
import { buildPageRegistry, type RegistryEntry } from "@/config/pageRegistry";

// ─────────────────────────────────────────────────────────────────────────────
// /admin — the control room. CONCEPT SCREEN, first reviewable piece.
//
// One dense screen, designed to be left open on a second monitor:
//   1. an alert strip that is silent when healthy and impossible to miss when
//      the CRM rejects a lead
//   2. the numbers that answer "is anything wrong" in one glance
//   3. the attribution question this page uniquely answers: what raw
//      referralSourceId values are actually arriving, verified vs not
//   4. the lead feed, compact
//   5. the site itself — live, script-less previews of every page that exists,
//      and ghost cards for every page the nav promises but the app lacks
//
// PREVIEWS are sandboxed iframes with NO scripts (sandbox=""). Three reasons:
//   - genuinely current: it is the real deployed page, not a screenshot
//   - no analytics pollution: GA4/PostHog/Clarity never boot, so admin visits
//     can't inflate pageviews on the pages being previewed
//   - cheap: no JS executes in any of them; CSS+images only, lazy-loaded
// Consequence: picker-mode roots (/lp/sell, /exp) render only their skeleton
// server-side, so their cards preview a CONCRETE per-market variant, labelled.
// Truthfulness note: what you see is the server HTML — for picker pages the
// live visitor additionally gets client-side market resolution on top.
//
// Auth is still HTTP Basic in this piece; the login system is the next piece.
// Reads stay on the READ-ONLY Upstash credential via lib/adminLeads.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Control room — Curbio",
  robots: { index: false, follow: false },
};

// Dark theme built from the navy primitives — the one place the marketing
// palette is used at night strength. Internal surface; deliberately not the
// marketing site's look.
const C = {
  bg: "var(--navy)",
  panel: "var(--navy-95)",
  edge: "var(--navy-85)",
  text: "#ffffff",
  dim: "var(--navy-15)",
  faint: "var(--navy-30)",
  amber: "var(--amber)",
  ok: "#4caf7d",
  fail: "var(--error)",
};

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

// How many recent leads feed the aggregates. Labelled everywhere it is shown —
// these are "last N" numbers, not all-time analytics.
const SCAN = 200;

type Aggregates = {
  scanned: number;
  last24h: number;
  last7d: number;
  delivered: number;
  failed: number;
  storedOnly: number;
  unknown: number;
  verified: number;
  unverified: number;
  untagged: number;
  failures: LeadRow[];
  referralValues: { value: string; count: number; known: boolean }[];
};

function aggregate(rows: LeadRow[]): Aggregates {
  const now = Date.now();
  const DAY = 86_400_000;
  const a: Aggregates = {
    scanned: rows.length,
    last24h: 0,
    last7d: 0,
    delivered: 0,
    failed: 0,
    storedOnly: 0,
    unknown: 0,
    verified: 0,
    unverified: 0,
    untagged: 0,
    failures: [],
    referralValues: [],
  };
  const refs = new Map<string, { count: number; known: boolean }>();

  for (const row of rows) {
    const t = row.lead.submittedAt ? Date.parse(row.lead.submittedAt) : NaN;
    if (Number.isFinite(t)) {
      if (now - t < DAY) a.last24h++;
      if (now - t < 7 * DAY) a.last7d++;
    }
    const d = row.delivery;
    if (!d) a.unknown++;
    else if (d.crmAttempted && d.crmOk) a.delivered++;
    else if (d.crmAttempted && !d.crmOk) {
      a.failed++;
      a.failures.push(row);
    } else a.storedOnly++;

    const v = row.lead.referralSourceVerified;
    if (v === undefined) a.untagged++;
    else if (v) a.verified++;
    else a.unverified++;

    const rid = row.lead.referralSourceId;
    if (rid) {
      const cur = refs.get(rid) ?? { count: 0, known: row.lead.referralSourceVerified === true };
      cur.count++;
      refs.set(rid, cur);
    }
  }
  a.referralValues = [...refs.entries()]
    .map(([value, { count, known }]) => ({ value, count, known }))
    .sort((x, y) => y.count - x.count);
  return a;
}

// ── Previews ────────────────────────────────────────────────────────────────
// Registry path → the concrete URL worth looking at. Per-market rows fold into
// their parent card (as a "×7 markets" badge) instead of printing seven
// near-identical thumbnails per campaign.
function previewPlan(entries: RegistryEntry[]) {
  const cards: {
    entry: RegistryEntry;
    src: string | null;
    note?: string;
    variants?: number;
  }[] = [];
  for (const e of entries) {
    if (e.status === "planned") continue;
    if (e.path.includes(":market")) {
      const parent = cards.find((c) => e.path.startsWith(`${c.entry.path}/m/`));
      if (parent) {
        parent.variants = 7;
        continue;
      }
    }
    if (e.path === "/admin") {
      cards.push({ entry: e, src: null, note: "this page" });
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
    cards.push({ entry: e, src: e.path });
  }
  return cards;
}

function Frame({ src }: { src: string }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 10",
        overflow: "hidden",
        background: "#fff",
        position: "relative",
      }}
    >
      {/* sandbox WITHOUT allow-scripts: no JS ever runs, so GA4/PostHog/
          Clarity can never fire from a preview. allow-same-origin only lets
          the document keep its origin so stylesheets/fonts apply normally —
          with scripting disabled it cannot act on that origin. */}
      <iframe
        src={src}
        title={src}
        loading="lazy"
        sandbox="allow-same-origin"
        style={{
          width: 1200,
          height: 750,
          border: 0,
          transform: "scale(0.2333)",
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function Chip({ text, color, dashed = false }: { text: string; color: string; dashed?: boolean }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color,
        border: `1px ${dashed ? "dashed" : "solid"} ${color}`,
        borderRadius: 999,
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function statusChip(e: RegistryEntry) {
  // "draft" in the registry means the template renders publicly but its
  // marketing content is not written — surfaced here as "stub" because a page
  // you can visit is not a draft in any useful sense.
  if (e.status === "live") return <Chip text="live" color={C.ok} />;
  if (e.status === "draft") return <Chip text="stub · renders" color={C.amber} />;
  return <Chip text="planned" color={C.faint} dashed />;
}

function Panel({
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
        background: C.panel,
        border: `1px solid ${C.edge}`,
        borderRadius: 10,
        padding: 16,
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
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.dim,
            margin: 0,
          }}
        >
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 600, color: tone ?? C.text, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default async function AdminPage() {
  const leads = await readRecentLeads(SCAN);
  const rows = leads.configured && !leads.error ? leads.rows : [];
  const agg = aggregate(rows);
  const registry = buildPageRegistry();
  const cards = previewPlan(registry);
  const planned = registry.filter((e) => e.status === "planned");
  const groups: { key: string; label: string }[] = [
    { key: "campaigns", label: "Campaign tier — sell.curbio.com" },
    { key: "site", label: "Site tier — curbio.com (post-cutover)" },
    { key: "internal", label: "Internal" },
  ];
  const renderedAt = new Date().toISOString().replace("T", " ").replace(/\..*/, " UTC");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-sans)" }}>
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 28px 96px" }}>
        {/* ── top bar ── */}
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {/* Explicit color: globals.css paints every h1 navy, which is
              invisible on this navy surface. */}
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600, margin: 0, color: C.text }}>
            Control room
          </h1>
          <span style={{ fontFamily: mono, fontSize: 12, color: C.faint }}>
            build {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"} ·{" "}
            {process.env.VERCEL_ENV ?? "dev"} · rendered {renderedAt}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.faint }}>
            read-only · identities masked
          </span>
        </header>

        {/* ── alert strip: silent when healthy, loud when not ── */}
        {leads.configured && leads.error ? (
          <div
            style={{
              background: "rgba(226,75,74,0.15)",
              border: `1px solid ${C.fail}`,
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            <strong style={{ color: C.fail }}>Lead store unreadable:</strong> {leads.error} — this is
            an admin read failure, not proof the pipeline is down. Check /api/lead logs before
            assuming leads are lost.
          </div>
        ) : agg.failed > 0 ? (
          <div
            style={{
              background: "rgba(226,75,74,0.15)",
              border: `2px solid ${C.fail}`,
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: C.fail, marginBottom: 8 }}>
              ⚠ {agg.failed} CRM rejection{agg.failed > 1 ? "s" : ""} in the last {agg.scanned} leads
            </div>
            {agg.failures.slice(0, 5).map(({ lead, delivery }, i) => (
              <div key={lead.leadId ?? i} style={{ fontFamily: mono, fontSize: 12, color: C.dim, padding: "2px 0" }}>
                {lead.submittedAt?.slice(0, 16).replace("T", " ")} · {lead.market ?? "?"} ·{" "}
                {lead.source ?? "?"} · HTTP {delivery?.crmStatus ?? "?"} — {delivery?.crmError ?? "no body"}
              </div>
            ))}
            <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>
              Every one is persisted in Redis and alerted by email — recoverable, not lost.
            </div>
          </div>
        ) : null}

        {/* ── numbers row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 12 }}>
          <Panel title="Volume" right={<span style={{ fontSize: 11, color: C.faint }}>{leads.configured ? `${leads.total} stored` : "no store"}</span>}>
            <div style={{ display: "flex", gap: 28 }}>
              <Stat label="last 24 h" value={leads.configured ? agg.last24h : "—"} />
              <Stat label="last 7 d" value={leads.configured ? agg.last7d : "—"} />
              <Stat label={`scanned (last ${agg.scanned})`} value={leads.configured ? agg.scanned : "—"} />
            </div>
          </Panel>
          <Panel title="Delivery" right={<span style={{ fontSize: 11, color: C.faint }}>last {agg.scanned} leads</span>}>
            <div style={{ display: "flex", gap: 28 }}>
              <Stat label="delivered" value={agg.delivered} tone={C.ok} />
              <Stat label="CRM failed" value={agg.failed} tone={agg.failed ? C.fail : C.text} />
              <Stat label="pre-observability" value={agg.unknown} tone={C.faint} />
            </div>
          </Panel>
          <Panel title="Attribution" right={<span style={{ fontSize: 11, color: C.faint }}>referral source tag</span>}>
            <div style={{ display: "flex", gap: 28 }}>
              <Stat label="verified" value={agg.verified} tone={C.ok} />
              <Stat label="unverified" value={agg.unverified} tone={agg.unverified ? C.amber : C.text} />
              <Stat label="untagged (pre-tag)" value={agg.untagged} tone={C.faint} />
            </div>
          </Panel>
        </div>

        {/* ── attribution detail + feed ── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 2fr) minmax(420px, 3fr)", gap: 12, marginBottom: 24 }}>
          <Panel title="Referral sources arriving" right={<span style={{ fontSize: 11, color: C.faint }}>raw values, last {agg.scanned}</span>}>
            {agg.referralValues.length === 0 ? (
              <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>No referral source data in range.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {agg.referralValues.map((r) => (
                    <tr key={r.value}>
                      <td style={{ padding: "5px 0", fontFamily: mono, fontSize: 13, color: C.text }}>{r.value}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: mono, fontSize: 13, color: C.dim }}>
                        {r.count}
                      </td>
                      <td style={{ padding: "5px 0", textAlign: "right" }}>
                        {r.known ? <Chip text="known" color={C.ok} /> : <Chip text="unrecognised" color={C.amber} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ fontSize: 11, color: C.faint, margin: "10px 0 0" }}>
              Every value is kept verbatim and tagged, never dropped — this list is how the ~40
              go.curbio.com vanity-redirect values become visible before anything is standardised.
            </p>
          </Panel>

          <Panel title="Lead feed" right={<span style={{ fontSize: 11, color: C.faint }}>newest 25</span>}>
            {!leads.configured ? (
              <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>Upstash not configured in this environment.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {rows.slice(0, 25).map(({ lead, delivery }, i) => {
                  const st = deliveryState(delivery);
                  const tone = st.tone === "ok" ? C.ok : st.tone === "fail" ? C.fail : st.tone === "warn" ? C.amber : C.faint;
                  return (
                    <div
                      key={lead.leadId ?? i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "110px 110px 1fr auto auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom: `1px solid ${C.edge}`,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontFamily: mono, fontSize: 12, color: C.faint }}>
                        {lead.submittedAt?.slice(5, 16).replace("T", " ") ?? "—"}
                      </span>
                      <span style={{ color: C.dim }}>{maskName(lead)}</span>
                      <span style={{ color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.market ?? "—"} · {lead.source ?? "—"}
                        {lead.utm_campaign ? ` · ${lead.utm_campaign}` : ""}
                      </span>
                      <Chip text={st.label} color={tone} />
                      {lead.referralSourceVerified === false ? (
                        <Chip text="unverified" color={C.amber} />
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* ── the site itself ── */}
        {groups.map((g) => {
          const inGroup = cards.filter((c) => c.entry.group === g.key);
          if (!inGroup.length) return null;
          return (
            <section key={g.key} style={{ marginBottom: 28 }}>
              <h2
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: C.dim,
                  margin: "0 0 10px",
                }}
              >
                {g.label}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {inGroup.map((c) => (
                  <a
                    key={c.entry.path}
                    href={c.src ?? c.entry.path}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                      background: C.panel,
                      border: `1px solid ${C.edge}`,
                      borderRadius: 10,
                      overflow: "hidden",
                      textDecoration: "none",
                      color: C.text,
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
                          color: C.faint,
                          fontSize: 13,
                        }}
                      >
                        {c.note ?? c.entry.path}
                      </div>
                    )}
                    <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: mono, fontSize: 12.5 }}>{c.entry.path}</span>
                      {statusChip(c.entry)}
                      {c.variants && <Chip text={`×${c.variants} markets`} color={C.dim} />}
                      {c.entry.indexed && <Chip text="indexed" color={C.amber} />}
                      {c.note && c.src && (
                        <span style={{ fontSize: 10.5, color: C.faint, width: "100%" }}>{c.note}</span>
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
          <h2
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.dim,
              margin: "0 0 10px",
            }}
          >
            Backlog — linked in the nav, not built ({planned.length})
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {planned.map((e) => (
              <div
                key={e.path}
                style={{
                  border: `1px dashed ${C.edge}`,
                  borderRadius: 10,
                  padding: "14px 14px",
                  color: C.faint,
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 12.5, color: C.dim }}>{e.path}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{e.title}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
