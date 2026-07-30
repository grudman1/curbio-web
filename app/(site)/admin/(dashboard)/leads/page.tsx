import type { Metadata } from "next";
import { readRecentLeads, maskName, deliveryState, type LeadRow } from "@/lib/adminLeads";
import { Chip, FAIL, MUTED, Meta, OK, Panel, SCAN, SUBTLE, Stat, WARN, mono } from "../ui";

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

// One labelled attribution value: a micro caps label with the value beside
// it, so "Atlanta" visibly SAYS market instead of occupying position two of
// an unlabelled delimited string.
function Labeled({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <span style={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: 5 }}>
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: SUBTLE,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        title={value || undefined}
        style={{
          color: MUTED,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value || "—"}
      </span>
    </span>
  );
}

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
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Panel
          title="Volume"
          right={<Meta>{leads.configured ? `${leads.total} stored` : "no store"}</Meta>}
        >
          <div style={{ display: "flex", gap: 30 }}>
            <Stat label="last 24 h" value={leads.configured ? agg.last24h : "—"} />
            <Stat label="last 7 d" value={leads.configured ? agg.last7d : "—"} />
            <Stat label={`scanned (last ${agg.scanned})`} value={leads.configured ? agg.scanned : "—"} />
          </div>
        </Panel>
        <Panel title="Delivery" right={<Meta>last {agg.scanned} leads</Meta>}>
          <div style={{ display: "flex", gap: 30 }}>
            <Stat label="delivered" value={agg.delivered} tone={OK} />
            <Stat label="CRM failed" value={agg.failed} tone={agg.failed ? FAIL : undefined} />
            <Stat label="pre-observability" value={agg.unknown} tone={SUBTLE} />
          </div>
        </Panel>
        <Panel title="Attribution" right={<Meta>referral source tag</Meta>}>
          <div style={{ display: "flex", gap: 30 }}>
            <Stat label="verified" value={agg.verified} tone={OK} />
            <Stat label="unverified" value={agg.unverified} tone={agg.unverified ? WARN : undefined} />
            <Stat label="untagged (pre-tag)" value={agg.untagged} tone={SUBTLE} />
          </div>
        </Panel>
      </div>

      {/* ── attribution detail + feed ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 2fr) minmax(420px, 3fr)",
          gap: 12,
        }}
      >
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
                    <td style={{ padding: "6px 0", fontFamily: mono, fontSize: 13 }}>{r.value}</td>
                    <td
                      style={{
                        padding: "6px 8px",
                        textAlign: "right",
                        fontFamily: mono,
                        fontSize: 13,
                        color: MUTED,
                      }}
                    >
                      {r.count}
                    </td>
                    <td style={{ padding: "6px 0", textAlign: "right" }}>
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
          <p style={{ fontSize: "var(--text-micro)", color: SUBTLE, margin: "10px 0 0" }}>
            Every value is kept verbatim and tagged, never dropped — this is where the ~40
            go.curbio.com vanity-redirect values become visible before anything is standardised.
          </p>
        </Panel>

        <Panel title="Lead feed" right={<Meta>newest 25</Meta>}>
          {!leads.configured ? (
            <p style={{ fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
              Upstash not configured in this environment.
            </p>
          ) : (
            <div>
              {rows.slice(0, 25).map(({ lead, delivery }, i) => {
                const st = deliveryState(delivery);
                const tone =
                  st.tone === "ok" ? OK : st.tone === "fail" ? FAIL : st.tone === "warn" ? WARN : SUBTLE;
                return (
                  <div
                    key={lead.leadId ?? i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "104px 110px minmax(0, 1fr) auto auto",
                      gap: 10,
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--color-border)",
                      fontSize: "var(--text-small)",
                    }}
                  >
                    <span style={{ fontFamily: mono, fontSize: 12, color: SUBTLE }}>
                      {lead.submittedAt?.slice(5, 16).replace("T", " ") ?? "—"}
                    </span>
                    <span style={{ color: MUTED }}>{maskName(lead)}</span>
                    <span
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(110px, 1fr) minmax(90px, 0.8fr) minmax(96px, 1.6fr)",
                        gap: 12,
                        alignItems: "baseline",
                        minWidth: 0,
                      }}
                    >
                      <Labeled label="Market" value={lead.market} />
                      <Labeled label="Source" value={lead.source} />
                      <Labeled label="Campaign" value={lead.utm_campaign} />
                    </span>
                    <Chip text={st.label} color={tone} />
                    {lead.referralSourceVerified === false ? (
                      <Chip text="unverified" color={WARN} />
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
    </>
  );
}
