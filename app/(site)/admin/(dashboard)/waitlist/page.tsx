import type { Metadata } from "next";
import { countsByState, maskEmail, maskName, readRecentWaitlist, type WaitlistEntry } from "@/lib/adminWaitlist";
import { PageHeader } from "../../_ui/v2/PageHeader";
import { OpsCard, OpsMetric } from "../../_ui/v2/OpsCard";
import { EmptyState } from "../../_ui/v2/EmptyState";
import { StatusBadge } from "../../_ui/v2/HealthDot";
import { Table, Thead, Th, Tr, Td } from "../../_ui/v2/DataTable";

// ─────────────────────────────────────────────────────────────────────────────
// Waitlist — out-of-area signups, the expansion-demand signal.
//
// These never reach the CRM (app/api/lead/route.ts skips postToCrm() for
// source: "waitlist" entirely — there is no market to route them to), so
// this page is the only place they're visible at all. State breakdown, not a
// delivery/attribution audit like the Leads tab. Identities stay masked —
// same reasoning as Leads. Every caveat is a tooltip, never a caption.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Waitlist · Ops — Curbio",
  robots: { index: false, follow: false },
};

const SCAN = 200;
const DASH = "—";

// "2026-08-07T14:03:22Z" → "Aug 7, 14:03" — same convention as the Leads tab.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatTime(iso: string | undefined): string {
  if (!iso) return DASH;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return DASH;
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const v = (x: string | null | undefined) => (x ? x : DASH);

function detected(e: WaitlistEntry): string {
  return [e.detectedCity, e.detectedRegion].filter(Boolean).join(", ") || DASH;
}

export default async function WaitlistTab() {
  const result = await readRecentWaitlist(SCAN);
  const configured = result.configured;
  const entries = configured && !result.error ? result.entries : [];
  const byState = countsByState(entries);
  const now = Date.now();
  const DAY = 86_400_000;
  const last24h = entries.filter((e) => {
    const t = e.submittedAt ? Date.parse(e.submittedAt) : NaN;
    return Number.isFinite(t) && now - t < DAY;
  }).length;

  const NO_STORE = { tooltip: "Upstash is not configured in this environment." };

  return (
    <>
      <PageHeader
        title="Waitlist"
        badge={
          configured ? (
            <StatusBadge
              status={`${result.total} stored`}
              tone="neutral"
              title="Out-of-area signups never reach the CRM — this page is the only place they are visible."
            />
          ) : undefined
        }
      />

      <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
        <OpsMetric
          label="Last 24 h"
          value={configured ? last24h : DASH}
          unwired={configured ? undefined : NO_STORE}
        />
        <OpsMetric
          label="Scanned"
          value={
            configured ? (
              <span title={`Newest ${entries.length} of the waitlist store.`}>{entries.length}</span>
            ) : (
              DASH
            )
          }
          unwired={configured ? undefined : NO_STORE}
        />
        <OpsMetric
          label="States"
          value={
            configured ? (
              <span title="Distinct states across the scanned signups — where expansion demand is clustering.">
                {byState.length}
              </span>
            ) : (
              DASH
            )
          }
          unwired={configured ? undefined : NO_STORE}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-ops-gap lg:grid-cols-[1.6fr_1fr]">
        <OpsCard
          title="Signups"
          titleTooltip="Identities stay masked — for spotting demand clusters, not for looking someone up."
          control={
            <span className="ops-subtle ops-tnum">newest {Math.min(entries.length, 50)}</span>
          }
          ruled
        >
          {!configured ? (
            <EmptyState headline="No store" />
          ) : entries.length === 0 ? (
            <EmptyState headline="No signups yet" />
          ) : (
            <Table>
              <Thead>
                <Th>Date</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>ZIP</Th>
                <Th>Detected</Th>
                <Th>First-touch channel</Th>
              </Thead>
              <tbody>
                {entries.slice(0, 50).map((e, i) => (
                  <Tr key={e.leadId ?? `row-${i}`}>
                    <Td muted>{formatTime(e.submittedAt)}</Td>
                    <Td className="font-bold">{maskName(e)}</Td>
                    <Td>{maskEmail(e.email)}</Td>
                    <Td>{v(e.zip)}</Td>
                    <Td>{detected(e)}</Td>
                    <Td muted>{v(e.firstTouchChannel)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </OpsCard>

        <OpsCard
          title="By state"
          titleTooltip={"“Unknown” means Vercel's geo header was absent for that submission — not a state Curbio serves."}
          ruled
        >
          {byState.length === 0 ? (
            <EmptyState headline={configured ? "No signups yet" : "No store"} />
          ) : (
            <Table>
              <tbody>
                {byState.map((row) => (
                  <Tr key={row.state}>
                    <Td className="font-bold">{row.state}</Td>
                    <Td align="right" numeric muted>
                      {row.count}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </OpsCard>
      </div>
    </>
  );
}
