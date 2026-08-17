// The Today alerts panel — part of the dashboard, not a page-top
// interruption. Four sources, in order:
//
//   1. CRM delivery failures, last 24 h (the Redis delivery log — the same
//      scan the Control Room banner runs, one implementation in
//      lib/adminLeads.ts). A failure here is a lead that did not reach the
//      CRM.
//   2. A stale snapshot: the Hub's one "sync" today is the one-time app
//      snapshot; when it is more than 7 days old, every number on screen is
//      drifting. (Webhook heartbeats join this list when webhooks exist —
//      alerting on syncs that were never wired would be noise, not honesty.)
//   3. Markets under half pace for the snapshot's current month.
//   4. Channels that produced zero this month after producing last month.
//
// No dismissal: entries age out with their causes. Colour = severity only.

import { readRecentLeads, recentCrmFailures } from "@/lib/adminLeads";
import { MARKETS } from "@/config/markets";
import {
  CHANNEL_LABELS,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "@/config/marketingHub";
import {
  qualifiedByMonthChannel,
  SNAPSHOT_AS_OF,
  SNAPSHOT_MONTHS,
  aggregateSnapshot,
} from "@/config/appLeadsSnapshot";
import { FAIL, Meta, MUTED, Panel, SCAN, SUBTLE, WARN } from "@/app/(site)/admin/(dashboard)/ui";
import { monthLabel, monthShort } from "./timeframe";
import { paceRead } from "./pacing";

export type HubAlert = {
  id: string;
  tone: "fail" | "warn";
  text: string;
  detail?: string;
  time?: string;
};

export async function collectAlerts(): Promise<{
  alerts: HubAlert[];
  /** Lead-store read problem — reported as its own line, never hidden. */
  storeIssue: string | null;
  configured: boolean;
}> {
  const alerts: HubAlert[] = [];

  // 1. CRM delivery failures (newest first — they carry real timestamps).
  const leads = await readRecentLeads(SCAN);
  const configured = leads.configured;
  const storeIssue = leads.configured && leads.error ? leads.error : null;
  if (leads.configured && !leads.error) {
    for (const f of recentCrmFailures(leads.rows)) {
      alerts.push({
        id: `crm-${f.leadId}`,
        tone: "fail",
        time: f.time,
        text: `CRM delivery failed — ${f.summary}`,
        detail: `${f.detail} — the lead did not reach the CRM; it is persisted in Redis and alerted by email.`,
      });
    }
  }

  // 2. Snapshot staleness — the one sync the Hub has today.
  const ageDays = Math.floor((Date.now() - Date.parse(`${SNAPSHOT_AS_OF}T00:00:00Z`)) / 86_400_000);
  if (ageDays > 7) {
    alerts.push({
      id: "snapshot-stale",
      tone: "warn",
      text: `App snapshot is ${ageDays} days old — every Qualified number on these pages has drifted since ${SNAPSHOT_AS_OF}.`,
      detail: "Re-run scripts/import-app-leads.mjs with a fresh Leads Report export.",
    });
  }

  // 3. Markets under half pace, for the snapshot's current month.
  const currentMonth = SNAPSHOT_MONTHS[SNAPSHOT_MONTHS.length - 1];
  if (currentMonth) {
    const agg = aggregateSnapshot(new Set([currentMonth]));
    for (const m of MARKETS) {
      const q = agg.qualifiedByMarketMonth[`${m.slug}|${currentMonth}`] ?? 0;
      const pace = paceRead(q, [currentMonth], SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH);
      if (pace?.state === "risk") {
        alerts.push({
          id: `pace-${m.slug}`,
          tone: "fail",
          text: `${m.name} is under half pace — ${q} Qualified vs ${pace.expected} expected ${pace.coverage}.`,
        });
      }
    }

    // 4. Channels quiet this month that produced last month.
    const prevMonth = SNAPSHOT_MONTHS[SNAPSHOT_MONTHS.length - 2];
    if (prevMonth) {
      const byMonth = qualifiedByMonthChannel();
      const cur = byMonth[currentMonth] ?? {};
      const prev = byMonth[prevMonth] ?? {};
      for (const [channel, prevCount] of Object.entries(prev)) {
        if (channel === "direct") continue; // direct going quiet is progress, not a problem
        if ((prevCount ?? 0) > 0 && !(cur as Record<string, number>)[channel]) {
          alerts.push({
            id: `quiet-${channel}`,
            tone: "warn",
            text: `${CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS]} has produced zero in ${monthShort(currentMonth)} after ${prevCount} in ${monthShort(prevMonth)}.`,
          });
        }
      }
    }
  }

  return { alerts, storeIssue, configured };
}

const TONE: Record<HubAlert["tone"], string> = { fail: FAIL, warn: WARN };

export function AlertsPanel({
  alerts,
  storeIssue,
  configured,
  currentMonthLabel,
}: {
  alerts: HubAlert[];
  storeIssue: string | null;
  configured: boolean;
  currentMonthLabel: string;
}) {
  return (
    <Panel title="Alerts" right={<Meta>CRM last 24 h · pace as of the snapshot</Meta>}>
      {storeIssue && (
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", margin: "0 0 10px", lineHeight: 1.6 }}>
          <strong style={{ color: FAIL }}>Lead store unreadable:</strong> {storeIssue} — an
          admin read failure, not proof the pipeline is down. Check /api/lead logs before
          assuming leads are lost.
        </p>
      )}
      {!configured && (
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: MUTED, margin: "0 0 10px" }}>
          Lead store not configured in this environment — CRM delivery checks are off.
        </p>
      )}
      {alerts.length === 0 ? (
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: MUTED, margin: 0, lineHeight: 1.6 }}>
          Nothing needs attention: no CRM delivery failures in the last 24 h, the snapshot
          is fresh, no market is under half pace in {currentMonthLabel}, and no channel
          has gone quiet.
        </p>
      ) : (
        <div>
          {alerts.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "baseline",
                padding: "7px 0",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: TONE[a.tone],
                  flex: "none",
                  position: "relative",
                  top: -1,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: "var(--color-text)", margin: 0, lineHeight: 1.5 }}>
                  {a.text}
                </p>
                {a.detail && (
                  <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, margin: "2px 0 0", lineHeight: 1.5 }}>
                    {a.detail}
                  </p>
                )}
              </div>
              {a.time && <Meta>{a.time}</Meta>}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
