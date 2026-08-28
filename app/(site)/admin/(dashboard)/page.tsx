import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS } from "@/config/markets";
import {
  SNAPSHOT_AS_OF,
  SNAPSHOT_LABEL,
  SNAPSHOT_MONTHS,
  aggregateSnapshot,
} from "@/config/appLeadsSnapshot";
import { QUALIFIED_TARGET_PER_MARKET_PER_MONTH } from "@/config/marketingHub";
import { paceRead, paceSentence } from "@/app/(site)/marketing/(hub)/pacing";
import { readRecentLeads, recentCrmFailures } from "@/lib/adminLeads";
import { PageHeader } from "../_ui/AppShell";
import { PaceRail, type PaceRow } from "../_ui/PaceRail";
import { Chip, DASH, Eyebrow, Panel, StatusDot } from "../_ui/primitives";
import { InfoPopover } from "../_ui/InfoPopover";
import { EmptyState } from "../_ui/EmptyState";
import { monthsFor, parseTimeframe, timeframeLabel } from "../_ui/timeframe";

// ─────────────────────────────────────────────────────────────────────────────
// TODAY — the executive snapshot. One question: are we OK?
//
// Written for someone with thirty seconds who is not going to click anything.
// That constraint decides everything on this screen:
//
//   • ONE hero number, and it is the one the strategy names — qualified leads
//     against 50 × markets × months. Not views, not form-fills. The doc is
//     explicit: "Volume that doesn't meet that bar is not progress."
//   • The pace rail, worst market first.
//   • What needs attention — and nothing that does not.
//
// NO PAGE CARDS. Those were here because Today was built from the Pages screen;
// they answer "what does the site look like", which is a different question
// asked by a different person on a different screen.
//
// Month-grain: the only qualified-lead source today is the monthly app
// snapshot. A day timeframe coerces, and says so.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Today · Ops — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SCAN = 200;

export default async function TodayScreen({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS, "month");
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const label = timeframeLabel(tf, SNAPSHOT_MONTHS);

  const agg = aggregateSnapshot(new Set(months));
  const perMarketTarget = QUALIFIED_TARGET_PER_MARKET_PER_MONTH * (months.length || 1);

  // Per-market qualified, derived from MARKETS. Nothing assumes a count.
  const rows: PaceRow[] = MARKETS.map((m) => {
    const qualified = months.reduce(
      (sum, ym) => sum + (agg.qualifiedByMarketMonth[`${m.slug}|${ym}`] ?? 0),
      0
    );
    const read = paceRead(qualified, months, SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH);
    return {
      key: m.slug,
      label: m.displayName,
      qualified,
      target: perMarketTarget,
      expected: read?.expected ?? null,
      state: read?.state ?? null,
    };
  });

  const companyQualified = rows.reduce((s, r) => s + (r.qualified ?? 0), 0);
  const companyTarget = perMarketTarget * MARKETS.length;
  const companyRead = paceRead(
    companyQualified,
    months,
    SNAPSHOT_AS_OF,
    QUALIFIED_TARGET_PER_MARKET_PER_MONTH * MARKETS.length
  );

  // ── what needs attention ──
  const underHalf = rows.filter((r) => r.state === "risk");
  const behind = rows.filter((r) => r.state === "behind");

  const leads = await readRecentLeads(SCAN);
  const leadRows = leads.configured && !leads.error ? leads.rows : [];
  const failures = recentCrmFailures(leadRows);
  const storeUnreadable = leads.configured && leads.error ? leads.error : null;

  // Unattributed share — the number the attribution plan exists to shrink.
  const directQualified = Object.entries(agg.cells).reduce(
    (sum, [key, cell]) => (key.split("|")[1] === "direct" ? sum + cell.qualified : sum),
    0
  );
  const unattributed = companyQualified > 0 ? directQualified / companyQualified : null;

  // ATTENTION IS DEDUPED AGAINST THE REST OF THE SCREEN. The pace rail beside
  // this already shows every market's state at a glance, so listing seven
  // "under half pace" rows restates the column next to it — on a screen built
  // for thirty seconds, saying a thing twice costs more than saying it once.
  //
  // So per-market pace collapses to ONE roll-up row, and this list carries
  // what nothing else on the screen shows: store health, delivery, and
  // attribution.
  const attention: { tone: "bad" | "warn"; text: string; href: string }[] = [];

  if (storeUnreadable) {
    attention.push({ tone: "bad", text: `Lead store unreadable — ${storeUnreadable}`, href: "/admin/leads" });
  }
  if (failures.length) {
    attention.push({
      tone: "bad",
      text: `${failures.length} CRM delivery failure${failures.length === 1 ? "" : "s"} in the last 24 h`,
      href: "/admin/leads",
    });
  }
  if (underHalf.length === 1) {
    attention.push({
      tone: "bad",
      text: `${underHalf[0].label} is under half pace — ${underHalf[0].qualified}/${underHalf[0].target}`,
      href: "/admin/markets",
    });
  } else if (underHalf.length > 1) {
    attention.push({
      tone: "bad",
      text: `${underHalf.length} of ${MARKETS.length} markets are under half pace`,
      href: "/admin/markets",
    });
  }
  if (unattributed !== null && unattributed >= 0.5) {
    attention.push({
      tone: "warn",
      text: `${Math.round(unattributed * 100)}% of qualified leads have no known channel`,
      href: "/admin/attribution",
    });
  }
  if (underHalf.length === 0 && behind.length > 0) {
    // Only worth a row when nothing is in actual trouble — otherwise "behind"
    // is a distraction from "under half".
    attention.push({
      tone: "warn",
      text: `${behind.length} market${behind.length === 1 ? " is" : "s are"} behind pace`,
      href: "/admin/markets",
    });
  }

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>Are we OK · {label}</span>
            <Chip tone="unknown">{SNAPSHOT_LABEL}</Chip>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-ops-gap lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex flex-col gap-ops-gap">
          {/* ── THE number. ── */}
          <section className="rounded-lg border border-app-border bg-app-card p-ops-panel shadow-app-card">
            <div className="flex items-center gap-1.5">
              <Eyebrow>Qualified leads · {label}</Eyebrow>
              <InfoPopover label="What qualified means">
                A valid, in-market estimate request the average HSM — not just the best one — can
                work. The target is 50 per market per month. Volume that doesn&apos;t meet that bar
                is not progress.
              </InfoPopover>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-sans text-ops-hero font-bold tabular-nums text-content">
                {companyQualified.toLocaleString("en-US")}
              </span>
              <span className="font-sans text-ops-body tabular-nums text-content-subtle">
                / {companyTarget.toLocaleString("en-US")}
              </span>
              {companyRead && (
                <span
                  className={`font-sans text-ops-body font-bold ${
                    companyRead.delta >= 0 ? "text-tone-good" : companyRead.state === "risk" ? "text-tone-bad" : "text-tone-warn-text"
                  }`}
                >
                  {paceSentence(companyRead)}
                </span>
              )}
            </div>

            <p className="m-0 mt-1.5 font-sans text-ops-label text-content-subtle">
              {MARKETS.length} markets × {QUALIFIED_TARGET_PER_MARKET_PER_MONTH}
              {months.length > 1 ? ` × ${months.length} months` : ""}
              {companyRead ? ` · expected ${companyRead.expected.toLocaleString("en-US")} ${companyRead.coverage}` : ""}
            </p>
          </section>

          {/* ── what needs attention ── */}
          <Panel
            title="Needs attention"
            right={
              <span className="font-sans text-ops-label tabular-nums text-content-subtle">
                {attention.length}
              </span>
            }
          >
            {attention.length === 0 ? (
              <EmptyState headline="Nothing is under half pace, no delivery failures in 24 hours, and attribution is holding." />
            ) : (
              <ul className="m-0 list-none p-0">
                {attention.map((a) => (
                  <li key={a.text} className="border-b border-app-border last:border-b-0">
                    <Link
                      href={a.href}
                      className="flex h-ops-row items-center gap-2.5 font-sans text-ops-table text-content no-underline hover:text-content-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                    >
                      <StatusDot tone={a.tone} />
                      <span className="min-w-0 flex-1 truncate">{a.text}</span>
                      <span aria-hidden className="flex-none text-content-subtle">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* ── the pace rail ── */}
        <Panel
          title="Pace by market"
          right={
            <span className="inline-flex items-center gap-1.5">
              <InfoPopover label="How pace is computed" align="right">
                Expected-to-date scales by how much of the timeframe actually has data — day 14 of
                31 expects 45% of the month&apos;s target, not 100%. Comparing day-14 data against a
                full-month expectation would manufacture a deficit.
              </InfoPopover>
              <span className="font-sans text-ops-label tabular-nums text-content-subtle">
                {MARKETS.length}
              </span>
            </span>
          }
        >
          <PaceRail rows={rows} note="the hairline is where we should be by now" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {([["good", "On pace"], ["warn", "Behind"], ["bad", "Under half"], ["unknown", "No data"]] as const).map(
              ([tone, text]) => (
                <span key={text} className="inline-flex items-center gap-1.5">
                  <StatusDot tone={tone} />
                  <span className="font-sans text-ops-micro text-content-subtle">{text}</span>
                </span>
              )
            )}
          </div>
        </Panel>
      </div>

      {/* Unattributed share — stated even when healthy, because it only ever
          improves if someone is looking at it. */}
      <div className="mt-ops-gap grid grid-cols-1 gap-ops-gap sm:grid-cols-3">
        <Panel title="Unattributed share">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-sans text-ops-metric font-semibold tabular-nums ${
                unattributed === null ? "text-content-subtle" : unattributed >= 0.5 ? "text-tone-warn-text" : "text-content"
              }`}
            >
              {unattributed === null ? DASH : `${Math.round(unattributed * 100)}%`}
            </span>
            <span className="font-sans text-ops-label text-content-subtle">of qualified</span>
          </div>
        </Panel>
        <Panel title="Delivery failures · 24 h">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-sans text-ops-metric font-semibold tabular-nums ${
                storeUnreadable ? "text-content-subtle" : failures.length ? "text-tone-bad" : "text-content"
              }`}
            >
              {storeUnreadable ? DASH : failures.length}
            </span>
            <span className="font-sans text-ops-label text-content-subtle">
              {storeUnreadable ? "store unreadable" : `of last ${SCAN} scanned`}
            </span>
          </div>
        </Panel>
        <Panel title="Markets on pace">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-ops-metric font-semibold tabular-nums text-content">
              {rows.filter((r) => r.state === "on").length}
              <span className="text-content-subtle">/{MARKETS.length}</span>
            </span>
          </div>
        </Panel>
      </div>
    </>
  );
}
