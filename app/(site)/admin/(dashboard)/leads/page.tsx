import type { Metadata } from "next";
import { readRecentLeads, maskName, deliveryState, type LeadRow } from "@/lib/adminLeads";
import { Chip, FAIL, MUTED, Meta, OK, Panel, SCAN, SUBTLE, Stat, WARN, eyebrow } from "../ui";

// ─────────────────────────────────────────────────────────────────────────────
// Leads tab — volume / delivery / attribution numbers, the referral values
// actually arriving, and the lead feed.
//
// Honest-data rules carry over unchanged: "unknown" (pre-observability) is
// never conflated with "failed", "untagged" (pre-tag) never with
// "unverified", and every aggregate is labelled as covering the last N leads
// rather than dressed up as all-time analytics. Identities stay masked —
// this page diagnoses DELIVERY and audits ATTRIBUTION; the CRM is the
// contact list.
//
// This stays a thin operational health check — "are leads arriving and
// delivering?" — not analytics. Channel breakdowns and revenue live in the
// marketing dashboard, deliberately not here.
//
// readRecentLeads() is cache()-deduped with the layout's alert-banner read —
// one Redis hit per request between them.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Leads · Control Room — Curbio",
  robots: { index: false, follow: false },
};

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
    else if (d.crmAttempted && !d.crmOk) a.failed++;
    else a.storedOnly++;

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

// "2026-08-07T14:03:22Z" → "Aug 7, 14:03". Server-rendered, so this is UTC
// by construction — same convention the raw feed always used.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const th: React.CSSProperties = {
  ...eyebrow,
  textAlign: "left",
  padding: "0 16px 10px 0",
  borderBottom: "1px solid var(--color-border-strong)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "11px 16px 11px 0",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  verticalAlign: "baseline",
};

export default async function LeadsTab() {
  const leads = await readRecentLeads(SCAN);
  const rows = leads.configured && !leads.error ? leads.rows : [];
  const agg = aggregate(rows);

  return (
    <>
      {/* ── numbers row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-4)",
        }}
      >
        <Panel
          title="Volume"
          right={<Meta>{leads.configured ? `${leads.total} stored` : "no store"}</Meta>}
        >
          <div style={{ display: "flex", gap: 32 }}>
            <Stat label="last 24 h" value={leads.configured ? agg.last24h : "—"} />
            <Stat label="last 7 d" value={leads.configured ? agg.last7d : "—"} />
            <Stat label={`scanned (last ${agg.scanned})`} value={leads.configured ? agg.scanned : "—"} />
          </div>
        </Panel>
        <Panel title="Delivery" right={<Meta>last {agg.scanned} leads</Meta>}>
          <div style={{ display: "flex", gap: 32 }}>
            <Stat label="delivered" value={agg.delivered} tone={OK} />
            <Stat label="CRM failed" value={agg.failed} tone={agg.failed ? FAIL : undefined} />
            <Stat label="pre-observability" value={agg.unknown} tone={SUBTLE} />
          </div>
        </Panel>
        <Panel title="Attribution" right={<Meta>referral source tag</Meta>}>
          <div style={{ display: "flex", gap: 32 }}>
            <Stat label="verified" value={agg.verified} tone={OK} />
            <Stat label="unverified" value={agg.unverified} tone={agg.unverified ? WARN : undefined} />
            <Stat label="untagged (pre-tag)" value={agg.untagged} tone={SUBTLE} />
          </div>
        </Panel>
      </div>

      {/* ── the feed: full-width table, every value shown whole ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel title="Lead feed" right={<Meta>newest 25</Meta>}>
          {!leads.configured ? (
            <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
              Upstash not configured in this environment.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Received</th>
                    <th style={th}>Name</th>
                    <th style={th}>Market</th>
                    <th style={th}>Source</th>
                    <th style={th}>Campaign</th>
                    <th style={{ ...th, paddingRight: 0 }}>Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 25).map(({ lead, delivery }, i) => {
                    const st = deliveryState(delivery);
                    const tone =
                      st.tone === "ok" ? OK : st.tone === "fail" ? FAIL : st.tone === "warn" ? WARN : SUBTLE;
                    return (
                      <tr key={lead.leadId ?? i}>
                        <td style={{ ...td, color: MUTED, whiteSpace: "nowrap" }}>
                          {formatTime(lead.submittedAt)}
                        </td>
                        <td style={{ ...td, fontWeight: 600 }}>{maskName(lead)}</td>
                        <td style={td}>{lead.market || "—"}</td>
                        <td style={td}>{lead.source || "—"}</td>
                        <td style={{ ...td, color: MUTED }}>{lead.utm_campaign || "—"}</td>
                        <td style={{ ...td, paddingRight: 0, whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", gap: 6 }}>
                            <Chip text={st.label} color={tone} />
                            {lead.referralSourceVerified === false && (
                              <Chip text="unverified" color={WARN} />
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* ── attribution detail ── */}
      <div style={{ maxWidth: 720 }}>
        <Panel title="Referral sources arriving" right={<Meta>raw values, last {agg.scanned}</Meta>}>
          {agg.referralValues.length === 0 ? (
            <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
              No referral source data in range.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {agg.referralValues.map((r) => (
                  <tr key={r.value}>
                    <td style={{ ...td, padding: "8px 16px 8px 0", fontWeight: 600 }}>{r.value}</td>
                    <td
                      style={{
                        ...td,
                        padding: "8px 16px 8px 0",
                        textAlign: "right",
                        color: MUTED,
                      }}
                    >
                      {r.count}
                    </td>
                    <td style={{ ...td, padding: "8px 0", textAlign: "right" }}>
                      {r.known ? (
                        <Chip text="known" color={OK} />
                      ) : (
                        <Chip text="unrecognised" color={WARN} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0", lineHeight: 1.5 }}>
            Every value is kept verbatim and tagged, never dropped — this is where the ~40
            go.curbio.com vanity-redirect values become visible before anything is standardised.
          </p>
        </Panel>
      </div>
    </>
  );
}
