import type { Metadata } from "next";
import { readExperimentResults, type ExperimentResult } from "@/lib/adminExperiments";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { PageHeader } from "../../_ui/v2/PageHeader";
import { OpsCard, OpsMetric } from "../../_ui/v2/OpsCard";
import { EmptyState } from "../../_ui/v2/EmptyState";
import { StatusBadge } from "../../_ui/v2/HealthDot";
import { Table, Thead, Th, Tr, Td } from "../../_ui/v2/DataTable";
import { parseTimeframe, timeframeLabel } from "../../_ui/timeframe";

// ─────────────────────────────────────────────────────────────────────────────
// Experiments — the results view for the one active A/B test.
//
// EVERY HONESTY RULE SURVIVES, but none of them is a sentence on the screen
// any more: every caveat is a chip or a title-tooltip on the number it
// qualifies. The claims themselves are unchanged and unweakened: no winner,
// ever. Not "leading", not "up X%". The split is DIRECTIONAL and that is the
// strongest statement anywhere on this screen.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Experiments · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SCAN = 200;
const DASH = "—";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDay(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return DASH;
  const d = new Date(t);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Proportional split bar. A reading aid for the numbers beside it —
 *  deliberately carrying no verdict. Tones are neutral ink, NOT the good/bad
 *  scale: colouring an arm green would be calling a winner. */
function SplitBar({ result }: { result: ExperimentResult }) {
  if (result.tagged === 0) return null;
  return (
    <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-pill" aria-hidden>
      {result.tallies.map((t, i) => (
        <div
          key={t.variant}
          className={i % 2 === 0 ? "bg-content" : "bg-content-subtle"}
          style={{ width: `${Math.max(t.share * 100, t.leads > 0 ? 2 : 0)}%` }}
        />
      ))}
    </div>
  );
}

const NO_DENOMINATOR =
  "No denominator: exposure events go to GA4 and PostHog only — nothing writes them to Redis. The server knows how many leads each variant produced, not how many visitors saw it, so no conversion rate and no significance test can be computed.";

export default async function ExperimentsScreen({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "day");
  const label = timeframeLabel(tf, SNAPSHOT_MONTHS);
  const data = await readExperimentResults(SCAN);

  if (data.status === "unconfigured") {
    return (
      <>
        <PageHeader
          title="Experiments"
          badge={
            <StatusBadge
              status="no lead store"
              tone="neutral"
              title="Upstash is not configured in this environment, so there is no lead store to read results from."
            />
          }
        />
        <EmptyState headline="No lead store" />
      </>
    );
  }

  if (data.status === "error") {
    return (
      <>
        <PageHeader
          title="Experiments"
          badge={
            <StatusBadge
              status="lead store unreadable"
              tone="error"
              title="A read failure, not proof that no experiment data exists."
            />
          }
        />
        <EmptyState headline={data.error} />
      </>
    );
  }

  const r = data.result;

  return (
    <>
      <PageHeader
        title="Experiments"
        badge={
          <>
            <StatusBadge
              status={<span className="font-mono">{r.key}</span>}
              tone="neutral"
              title={`${r.surface} path · started ${formatDay(r.startedAt)}`}
            />
            {r.variance ? (
              <StatusBadge status="running" tone="success" />
            ) : (
              <StatusBadge
                status="No variance"
                tone="error"
                title="No variance — every arm serves identical copy, so this split is noise, not a result. Give a variant different copy in lib/ctaVariant.ts: visitors are already bucketed and every lead is already tagged, so results begin accumulating the moment the copy differs."
              />
            )}
            {r.tagged > 0 && !r.enough && (
              <StatusBadge
                status="not enough data"
                tone="neutral"
                title={`Needs ${r.minPerVariant} leads per arm.`}
              />
            )}
            {r.enough && (
              <StatusBadge status="directional only" tone="warning" title={NO_DENOMINATOR} />
            )}
          </>
        }
        right={<StatusBadge status={label} tone="neutral" />}
      />

      {/* ── the four numbers ── */}
      <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
        <OpsMetric
          label="Tagged leads"
          value={<span title={`Since ${formatDay(r.startedAt)}.`}>{r.tagged}</span>}
        />
        <OpsMetric
          label="Untagged"
          value={
            <span title="Leads carrying no variant — recorded before the experiment started, or submitted from a surface that does not bucket, like the waitlist form. Counted separately and never folded into control.">
              {r.untagged}
            </span>
          }
        />
        <OpsMetric
          label="Scanned"
          value={
            <span
              title={`Last ${SCAN} of leads:v1 — the same scan the Leads screen uses. Counts cover leads submitted on or after ${formatDay(r.startedAt)}${r.firstLead ? `; data present spans ${formatDay(r.firstLead)} to ${formatDay(r.lastLead)}.` : "; no tagged leads in that window yet."}`}
            >
              {r.scanned}
            </span>
          }
        />
        <OpsMetric label="Conversion rate" value={DASH} unwired={{ tooltip: NO_DENOMINATOR }} />
      </div>

      {/* ── the split ── */}
      <OpsCard
        title="Leads by variant"
        titleTooltip={`Directional only, never a winner — ${NO_DENOMINATOR} Needs ${r.minPerVariant} leads per arm.`}
        ruled
      >
        {r.tagged === 0 ? (
          <EmptyState headline="No tagged leads in this window yet" ruled />
        ) : (
          <>
            <Table>
              <Thead>
                <Th>Variant</Th>
                <Th>Copy served</Th>
                <Th align="right">Leads</Th>
                <Th align="right">Share</Th>
              </Thead>
              <tbody>
                {r.tallies.map((t) => (
                  <Tr key={t.variant}>
                    <Td className="font-bold">{t.variant}</Td>
                    <Td muted>{t.copy}</Td>
                    <Td align="right" numeric>
                      {t.leads}
                      {t.leads < r.minPerVariant && (
                        <span
                          className="ml-1.5 font-sans text-ops-micro text-content-subtle"
                          title={`Below ${r.minPerVariant} leads.`}
                        >
                          low
                        </span>
                      )}
                    </Td>
                    <Td align="right" numeric muted>
                      {(t.share * 100).toFixed(1)}%
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-3">
              <SplitBar result={r} />
            </div>
          </>
        )}
      </OpsCard>
    </>
  );
}
