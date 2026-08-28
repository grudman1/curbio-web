import type { Metadata } from "next";
import { readExperimentResults, type ExperimentResult } from "@/lib/adminExperiments";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { PageHeader } from "../../_ui/AppShell";
import { Chip, DASH, Eyebrow, Panel } from "../../_ui/primitives";
import { Disclosure } from "../../_ui/Disclosure";
import { EmptyState } from "../../_ui/EmptyState";
import { InfoPopover } from "../../_ui/InfoPopover";
import { StatCard } from "../../_ui/StatCard";
import { parseTimeframe, timeframeLabel } from "../../_ui/timeframe";

// ─────────────────────────────────────────────────────────────────────────────
// Experiments — the results view for the one active A/B test.
//
// EVERY HONESTY RULE FROM THE PREVIOUS VERSION SURVIVES. What changed is that
// they are now UI affordances rather than ~200 words of body copy:
//
//   no variance          →  a chip, plus one line, fix behind an InfoPopover
//   last-N scan window   →  the ⓘ on the scanned tile
//   not enough data      →  a chip on the split panel
//   no conversion rate   →  one line + a collapsed "Why this number?"
//   no significance test →  same disclosure
//   four serif numbers   →  StatCards
//
// The claims themselves are unchanged and unweakened: no winner, ever. Not
// "leading", not "up X%". The split is DIRECTIONAL and that is the strongest
// statement anywhere on this screen.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Experiments · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SCAN = 200;

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
        <PageHeader title="Experiments" />
        <EmptyState headline="Upstash isn't configured in this environment, so there's no lead store to read results from." />
      </>
    );
  }

  if (data.status === "error") {
    return (
      <>
        <PageHeader title="Experiments" subtitle={<Chip tone="bad">lead store unreadable</Chip>} />
        <EmptyState headline={`${data.error} — this is a read failure, not proof that no experiment data exists.`} />
      </>
    );
  }

  const r = data.result;
  const belowMin = r.tallies.filter((t) => t.leads < r.minPerVariant);

  return (
    <>
      <PageHeader
        title="Experiments"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="font-mono">{r.key}</span>
            <span>· {r.surface} path · started {formatDay(r.startedAt)} · {label}</span>
          </span>
        }
        right={
          <>
            {r.variance ? <Chip tone="good">running</Chip> : <Chip tone="bad">no variance</Chip>}
            {r.tagged > 0 && !r.enough && <Chip tone="unknown">not enough data</Chip>}
            {r.enough && <Chip tone="warn">directional only</Chip>}
          </>
        }
      />

      {/* ── the red essay, now one line ── */}
      {!r.variance && (
        <p className="mb-ops-gap flex items-center gap-1.5 rounded-md border border-tone-bad/40 bg-tone-bad/[0.06] px-3 py-2 font-sans text-ops-body font-semibold text-tone-bad">
          No variance — every arm serves identical copy, so this split is noise, not a result.
          <InfoPopover label="How to start the test">
            Give a variant different copy in <code className="font-mono">lib/ctaVariant.ts</code>. Visitors
            are already being bucketed and every lead below is already tagged, so results begin
            accumulating the moment the copy differs.
          </InfoPopover>
        </p>
      )}

      {/* ── the four serif numbers, now tiles ── */}
      <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
        <StatCard label="Tagged leads" value={r.tagged} note={`since ${formatDay(r.startedAt)}`} />
        <StatCard
          label="Untagged"
          value={r.untagged}
          note="never folded into control"
          info="Leads carrying no variant — recorded before the experiment started, or submitted from a surface that does not bucket, like the waitlist form. They are counted separately and never folded into control."
        />
        <StatCard
          label="Scanned"
          value={r.scanned}
          note={`last ${SCAN} of leads:v1`}
          info={
            <>
              Reading <strong className="font-bold text-content">leads:v1</strong>, the same last-{SCAN} scan
              the Leads screen uses. Counts cover leads submitted on or after {formatDay(r.startedAt)}
              {r.firstLead ? <> — data present spans {formatDay(r.firstLead)} to {formatDay(r.lastLead)}.</> : <> — no tagged leads in that window yet.</>}
            </>
          }
        />
        <StatCard
          label="Conversion rate"
          value={null}
          note="no denominator"
          info="Exposure events go to GA4 and PostHog only — nothing writes them to Redis. The server knows how many leads each variant produced, but not how many visitors saw it."
        />
      </div>

      <div className="grid grid-cols-1 gap-ops-gap lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* ── the split ── */}
        <Panel
          title="Leads by variant"
          right={
            belowMin.length > 0 ? (
              <span className="font-sans text-ops-label tabular-nums text-content-subtle">
                needs {r.minPerVariant}/arm
              </span>
            ) : undefined
          }
        >
          {r.tagged === 0 ? (
            <EmptyState headline="No leads carrying a variant in this window yet — an empty result, not a zero result." />
          ) : (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Variant", "Copy served", "Leads", "Share"].map((h, i) => (
                      <th
                        key={h}
                        className={`h-ops-row-head border-b border-app-border-strong pr-4 align-bottom ${i > 1 ? "text-right" : "text-left"} last:pr-0`}
                      >
                        <Eyebrow>{h}</Eyebrow>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.tallies.map((t) => (
                    <tr key={t.variant} className="h-ops-row">
                      <td className="border-b border-app-border pr-4 font-sans text-ops-table font-bold text-content">
                        {t.variant}
                      </td>
                      <td className="border-b border-app-border pr-4 font-sans text-ops-table text-content-muted">
                        {t.copy}
                      </td>
                      <td className="border-b border-app-border pr-4 text-right font-sans text-ops-table tabular-nums text-content">
                        {t.leads}
                        {t.leads < r.minPerVariant && (
                          <span className="ml-1.5 font-sans text-ops-micro text-content-subtle">low</span>
                        )}
                      </td>
                      <td className="border-b border-app-border text-right font-sans text-ops-table tabular-nums text-content-muted">
                        {(t.share * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3">
                <SplitBar result={r} />
              </div>
            </>
          )}
        </Panel>

        {/* ── what this measurement cannot do ── */}
        <Panel title="What this can't tell you">
          <p className="m-0 mb-1 font-sans text-ops-body text-content">
            No conversion rate — exposure events aren&apos;t stored.
          </p>
          <p className="m-0 mb-3 font-sans text-ops-body text-content">
            No winner, at any sample size.
          </p>

          <Disclosure>
            <p>
              A rate needs a denominator. Exposure events (<code>page_view</code>,{" "}
              <code>form_start</code>) are sent to GA4 and PostHog only — <code>lib/events.ts</code>{" "}
              fans out to those two vendors and nothing writes them to Redis. The server knows how
              many leads each variant produced, not how many visitors each was shown.
            </p>
            <p>
              For the same reason no significance test is computed. The one test available without a
              denominator — asking whether the lead split differs from 50/50 — assumes both arms
              received equal exposure, which is exactly what is not measured (djb2-mod-2 over random
              ids is approximately balanced, never guaranteed). A p-value on that assumption would
              dress an assumption up as evidence.
            </p>
            <p>
              <strong className="font-bold text-content">To get real rates:</strong> persist{" "}
              <code>form_start</code> / page-view counts by variant server-side, or read exposure
              from PostHog and join on variant. Either gives a denominator, and a proper
              two-proportion test becomes possible.
            </p>
          </Disclosure>
        </Panel>
      </div>
    </>
  );
}
