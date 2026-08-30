import type { WaitlistEntry } from "@/lib/adminWaitlist";
import { deliveryState, maskEmail, maskName, type LeadRow, type PiiVisibility } from "@/lib/adminLeads";
import { readMarketSource } from "@/lib/marketSignals";
import { OpsCard } from "../../_ui/v2/OpsCard";
import { EmptyState } from "../../_ui/v2/EmptyState";
import { StatusBadge } from "../../_ui/v2/HealthDot";
import { LeadFeedTable, type FeedRow } from "./LeadFeedTable";
import { marketSourceSection } from "./marketSourceSection";

// ─────────────────────────────────────────────────────────────────────────────
// The waitlist, across BOTH stores it lives in.
//
//   waitlist:leads  every signup since 2026-08-20 (commit 4169ad8), when the
//                   lead route split them out. Authoritative going forward.
//   leads:v1        signups written BEFORE that date, when they still went to
//                   the lead store and were posted to the CRM — where they
//                   404'd, because a waitlist entry has no market to match.
//
// Neither store alone answers "how many waitlist signups are there", which is
// why the chip disagreed with the feed. Both render here, the legacy rows
// marked, and rows EXPAND the same way lead-feed rows do — a waitlist row is
// still a record with an attribution story and a delivery outcome.
// ─────────────────────────────────────────────────────────────────────────────

const v = (x: unknown) => (x === null || x === undefined || x === "" ? "—" : String(x));

function entryToFeedRow(e: WaitlistEntry, i: number, pii: PiiVisibility): FeedRow {
  const asLead = {
    ...e,
    market: null,
    source: "waitlist",
  };
  const ms = readMarketSource(asLead);
  return {
    id: e.leadId ?? `wl-${i}`,
    received: e.submittedAt ? e.submittedAt.slice(5, 16).replace("T", " ") : "—",
    name: maskName(asLead),
    market: "—",
    source: "waitlist",
    campaign: v(e.utm_campaign ?? e.firstTouchCampaign),
    deliveryLabel: "not delivered (expected)",
    deliveryTone: "unknown",
    deliveryTitle: "Out of area — no market to route to, so the CRM has nothing to match.",
    unverified: false,
    detail: [
      {
        title: "Lead",
        fields: [
          { label: "Name", value: maskName(asLead, pii) },
          { label: "Email", value: maskEmail(e.email, pii) },
          { label: "ZIP", value: v(e.zip) },
          { label: "Submitted", value: v(e.submittedAt) },
          { label: "Store", value: "waitlist:leads" },
        ],
      },
      marketSourceSection(ms),
      {
        title: "Attribution",
        fields: [
          { label: "utm_source", value: v(e.utm_source) },
          { label: "utm_medium", value: v(e.utm_medium) },
          { label: "utm_campaign", value: v(e.utm_campaign) },
          { label: "First touch channel", value: v(e.firstTouchChannel) },
          { label: "First touch campaign", value: v(e.firstTouchCampaign) },
        ],
      },
      {
        title: "Delivery",
        fields: [
          { label: "Status", value: "not delivered (expected)" },
          { label: "Why", value: "out of area — not sent since 2026-08-20" },
          { label: "CRM attempted", value: "no" },
        ],
      },
    ],
  };
}

function legacyToFeedRow(row: LeadRow, i: number, pii: PiiVisibility): FeedRow {
  const { lead, delivery } = row;
  const st = deliveryState(delivery, lead);
  const ms = readMarketSource(lead);
  return {
    id: lead.leadId ?? `wl-legacy-${i}`,
    received: lead.submittedAt ? lead.submittedAt.slice(5, 16).replace("T", " ") : "—",
    name: maskName(lead),
    market: v(lead.market),
    source: "waitlist (legacy)",
    campaign: v(lead.utm_campaign ?? lead.firstTouchCampaign),
    deliveryLabel: st.label,
    deliveryTone: st.tone,
    deliveryTitle: st.reason ?? undefined,
    unverified: lead.referralSourceVerified === false,
    detail: [
      {
        title: "Lead",
        fields: [
          { label: "Name", value: maskName(lead, pii) },
          { label: "Email", value: maskEmail(lead.email, pii) },
          { label: "ZIP", value: v(lead.zip) },
          { label: "Submitted", value: v(lead.submittedAt) },
          { label: "Store", value: "leads:v1 — predates the 2026-08-20 split" },
        ],
      },
      marketSourceSection(ms),
      {
        title: "Delivery",
        fields: [
          { label: "Status", value: st.label },
          { label: "CRM attempted", value: delivery?.crmAttempted ? "yes" : "no" },
          { label: "CRM HTTP status", value: v(delivery?.crmStatus) },
          ...(st.reason ? [{ label: "Why", value: st.reason }] : []),
        ],
      },
    ],
  };
}

export function WaitlistPanel({
  entries,
  legacy,
  error,
  configured,
  pii = "masked",
}: {
  entries: WaitlistEntry[];
  legacy: LeadRow[];
  error: string | null;
  configured: boolean;
  pii?: PiiVisibility;
}) {
  if (!configured) {
    return <EmptyState headline="Upstash not configured in this environment." />;
  }
  if (error) {
    // A read failure, not proof the waitlist is empty — the error is the value.
    return <EmptyState headline={`Waitlist store unreadable — ${error}`} />;
  }

  const rows = [
    ...entries.map((e, i) => entryToFeedRow(e, i, pii)),
    ...legacy.map((r, i) => legacyToFeedRow(r, i, pii)),
  ];

  if (rows.length === 0) {
    return <EmptyState headline="No out-of-area signups yet." />;
  }

  return (
    <OpsCard
      title="Waitlist"
      titleTooltip="Out-of-area signups, kept out of the CRM entirely — expansion demand, not leads. Entries from 2026-08-20 onward live in waitlist:leads; older ones are still in leads:v1 and are marked legacy."
      control={
        <span className="inline-flex items-center gap-1.5">
          {legacy.length > 0 && <StatusBadge status={`${legacy.length} legacy`} tone="neutral" />}
          <span className="ops-subtle ops-tnum">{rows.length}</span>
        </span>
      }
      ruled
    >
      <LeadFeedTable rows={rows} />
    </OpsCard>
  );
}
