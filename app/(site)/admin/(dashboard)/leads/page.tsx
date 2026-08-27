import type { Metadata } from "next";
import {
  readRecentLeads,
  maskEmail,
  maskName,
  maskPhone,
  deliveryState,
  piiVisibilityForRole,
  type PiiVisibility,
  type LeadRow,
} from "@/lib/adminLeads";
import { Chip, FAIL, MUTED, Meta, OK, Panel, SCAN, SUBTLE, Stat, WARN } from "../ui";
import { LeadFeedTable, type FeedRow, type FeedDetailSection } from "./LeadFeedTable";
import { readRecentWaitlist } from "@/lib/adminWaitlist";
import { FilterChips } from "../../_ui/FilterChips";
import { readMarketSource } from "@/lib/marketSignals";
import { marketSourceSection } from "./marketSourceSection";
import { currentAdminUser } from "../../_ui/session";
import { WaitlistPanel } from "./WaitlistPanel";

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
  title: "Leads · Ops — Curbio",
  robots: { index: false, follow: false },
};

type Aggregates = {
  scanned: number;
  last24h: number;
  last7d: number;
  delivered: number;
  /** REAL failures only — a lead that should have delivered and didn't. */
  failed: number;
  /** Never going to reach the CRM by design. Off the good/warn/bad ramp. */
  expected: number;
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
    expected: 0,
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
    // One judgement, made in lib/adminLeads.ts, so the tiles, the row chips
    // and the alert banner cannot disagree about what counts as broken.
    const d = row.delivery;
    const st = deliveryState(d, row.lead);
    if (st.tone === "ok") a.delivered++;
    else if (st.tone === "fail") a.failed++;
    else if (st.reason) a.expected++;
    else if (!d) a.unknown++;
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

const td: React.CSSProperties = {
  padding: "8px 16px 8px 0",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  verticalAlign: "baseline",
};

// ── Feed rows, fully prepared server-side ───────────────────────────────────
// Everything the store holds for a lead, formatted to strings HERE so the
// client bundle only ever sees masked identities and display values.
const v = (x: string | number | null | undefined) =>
  x === null || x === undefined || x === "" ? "—" : String(x);
const yn = (x: boolean) => (x ? "yes" : "no");

function detailSections({ lead, delivery }: LeadRow, pii: PiiVisibility): FeedDetailSection[] {
  const verified =
    lead.referralSourceVerified === undefined
      ? "untagged (pre-tag)"
      : lead.referralSourceVerified
        ? "verified"
        : "unverified";
  const detected = [lead.detectedCity, lead.detectedRegion].filter(Boolean).join(", ");
  return [
    {
      title: "Lead",
      fields: [
        { label: "Lead ID", value: v(lead.leadId) },
        { label: "Submitted (UTC)", value: v(lead.submittedAt) },
        // Full name for the owner, masked for everyone else — the list column
        // above stays masked for every role.
        { label: "Name", value: maskName(lead, pii) },
        { label: "Email", value: maskEmail(lead.email, pii) },
        { label: "Phone", value: maskPhone(lead.phone, pii) },
        { label: "ZIP", value: v(lead.zip) },
        { label: "Detected location", value: v(detected) },
        { label: "Variant", value: v(lead.variant) },
      ],
    },
    // WHICH SIGNAL decided the market, and what the others said. For leads
    // written before marketSource was persisted this reports `unknown` rather
    // than inferring — but the disagreement half works retroactively.
    marketSourceSection(readMarketSource(lead)),
    {
      title: "Attribution",
      fields: [
        { label: "Source", value: v(lead.source) },
        { label: "Medium", value: v(lead.medium) },
        { label: "Channel", value: v(lead.channel) },
        { label: "Entry point", value: v(lead.entryPoint) },
        { label: "UTM source", value: v(lead.utm_source) },
        { label: "UTM medium", value: v(lead.utm_medium) },
        { label: "UTM campaign", value: v(lead.utm_campaign) },
        { label: "UTM content", value: v(lead.utm_content) },
        { label: "UTM term", value: v(lead.utm_term) },
        { label: "First-touch channel", value: v(lead.firstTouchChannel) },
        { label: "First-touch campaign", value: v(lead.firstTouchCampaign) },
        { label: "Referral source", value: v(lead.referralSourceId) },
        {
          label: "Referral tag",
          value: verified,
          highlight: lead.referralSourceVerified === false ? ("warn" as const) : undefined,
        },
      ],
    },
    {
      title: "Delivery",
      fields: delivery
        ? [
            { label: "Status", value: deliveryState(delivery, lead).label },
            { label: "Stored in Redis", value: yn(delivery.persistOk) },
            { label: "Alert email attempted", value: yn(delivery.resendAttempted) },
            { label: "Alert email sent", value: yn(delivery.resendOk) },
            { label: "CRM attempted", value: yn(delivery.crmAttempted) },
            { label: "CRM delivered", value: yn(delivery.crmOk) },
            { label: "CRM HTTP status", value: v(delivery.crmStatus) },
            {
              label: "CRM error",
              value: v(delivery.crmError),
              highlight: delivery.crmError ? ("fail" as const) : undefined,
            },
            { label: "Recorded (UTC)", value: v(delivery.recordedAt) },
          ]
        : [
            {
              label: "Status",
              value: "unknown — lead predates delivery observability; no record exists",
            },
          ],
    },
  ];
}

function toFeedRow(row: LeadRow, i: number, pii: PiiVisibility): FeedRow {
  const { lead, delivery } = row;
  const st = deliveryState(delivery, lead);
  return {
    id: lead.leadId ?? `row-${i}`,
    received: formatTime(lead.submittedAt),
    // The LIST stays masked for every role, including owner. Unmasking is
    // scoped to the EXPANDED record — a deliberate act — so a shoulder-surfed
    // screen or an accidental screenshot of the feed still carries nothing.
    name: maskName(lead),
    market: v(lead.market),
    source: v(lead.source),
    campaign: v(lead.utm_campaign),
    deliveryLabel: st.label,
    deliveryTone: st.tone,
    unverified: lead.referralSourceVerified === false,
    detail: detailSections(row, pii),
  };
}

export default async function LeadsTab({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const sp = await searchParams;
  // PII visibility is a ROLE decision, derived from the server session — never
  // a prop, never a query param. A caller that forgets it gets masked output,
  // so the failure mode is closed.
  const me = await currentAdminUser();
  const pii = piiVisibilityForRole(me?.role);
  const [leads, waitlist] = await Promise.all([readRecentLeads(SCAN), readRecentWaitlist(SCAN)]);
  const rows = leads.configured && !leads.error ? leads.rows : [];
  const agg = aggregate(rows);

  // ── WAITLIST LIVES IN TWO STORES, SPLIT BY DATE ────────────────────────────
  //
  // The chip said 1 while the feed showed 3 rows sourced `waitlist`, and the
  // waitlist view showed a fourth entry appearing in neither. Nothing was
  // double-counted — the two stores hold DIFFERENT ERAS of the same thing:
  //
  //   leads:v1        waitlist submissions written BEFORE 2026-08-20, when
  //                   they still went into the lead store and were posted to
  //                   the CRM (where they 404'd — see expectedNonDelivery).
  //   waitlist:leads  every waitlist signup since commit 4169ad8 split them
  //                   out. Authoritative going forward.
  //
  // Neither store alone answers "how many waitlist signups are there", so the
  // chip counts BOTH and the view shows both, with the legacy rows marked.
  // Letting either number stand alone is what produced the disagreement.
  const legacyWaitlistRows = rows.filter((r) => r.lead.source === "waitlist");
  const currentWaitlist =
    waitlist.configured && !waitlist.error ? waitlist.entries : [];
  const waitlistReadable = waitlist.configured && !waitlist.error;
  const leadsReadable = leads.configured && !leads.error;

  // Estimate requests = the lead store MINUS the legacy waitlist strays, so
  // the two chips partition the total instead of overlapping.
  const estimateCount = leadsReadable ? rows.length - legacyWaitlistRows.length : null;
  const waitlistCount =
    waitlistReadable && leadsReadable
      ? currentWaitlist.length + legacyWaitlistRows.length
      : null;
  const allCount =
    estimateCount === null || waitlistCount === null ? null : estimateCount + waitlistCount;

  const filter = sp.f === "waitlist" || sp.f === "estimates" ? sp.f : "all";
  const feedRows =
    filter === "estimates"
      ? rows.filter((r) => r.lead.source !== "waitlist")
      : rows;

  return (
    <>
      <FilterChips
        param="f"
        active={filter}
        options={[
          { key: "all", label: "All", count: allCount },
          { key: "estimates", label: "Estimate requests", count: estimateCount },
          { key: "waitlist", label: "Waitlist", count: waitlistCount },
        ]}
      />

      {filter !== "waitlist" && (<>
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
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <Stat label="delivered" value={agg.delivered} tone={OK} />
            {/* REAL failures only. Counting expected non-delivery here made a
                working system look broken — see expectedNonDelivery(). */}
            <Stat label="CRM failed" value={agg.failed} tone={agg.failed ? FAIL : undefined} />
            <Stat label="not delivered (expected)" value={agg.expected} tone={SUBTLE} />
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
            <>
              <LeadFeedTable rows={feedRows.slice(0, 25).map((r, i) => toFeedRow(r, i, pii))} />
              <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0" }}>
                Click a row for the full record — attribution, detection, and delivery.
                Identities stay masked; the CRM is the contact list.
              </p>
            </>
          )}
        </Panel>
      </div>

      </>)}

      {filter === "waitlist" && (
        <WaitlistPanel
          entries={currentWaitlist}
          legacy={legacyWaitlistRows}
          error={waitlist.configured && waitlist.error ? waitlist.error : null}
          configured={waitlist.configured}
          pii={pii}
        />
      )}

      {filter !== "waitlist" && (<>
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
      </>)}
    </>
  );
}
