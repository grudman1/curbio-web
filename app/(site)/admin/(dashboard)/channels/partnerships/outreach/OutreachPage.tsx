import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import { DASH } from "@/app/(site)/admin/_ui/primitives";
import {
  COST_PER_MEETING_TARGET_USD,
  HUB_SURFACE_BY_SLUG,
  OUTREACH_ARMS,
  OUTREACH_WEEKLY_CALLS_TARGET,
  OUTREACH_WEEKLY_MAILINGS_TARGET,
} from "@/config/marketingHub";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsOutreach, weekStart, type OutreachEntry } from "@/lib/opsOutreach";
import { LoggedTag } from "@/app/(site)/admin/_ui/Logged";
import { OpsCard } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { SurfaceHeader, SurfaceHealth } from "@/app/(site)/admin/_ui/v2/SurfaceHeader";
import { HealthDot } from "@/app/(site)/admin/_ui/v2/HealthDot";
import { StatusBadge } from "@/app/(site)/admin/_ui/v2/HealthDot";
import { CadenceTable } from "./CadenceTable";

export const metadata: Metadata = {
  title: "Outreach · Marketing — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const surface = HUB_SURFACE_BY_SLUG.outreach;

/** The last 12 week-starts, newest first — the range the cadence picker
 *  offers. Weeks are Mondays (lib/opsOutreach.ts) so every entry snaps to
 *  the same boundary. */
function recentWeeks(count = 12): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    out.push(weekStart(d));
  }
  return out;
}

/** Arm totals across every logged week — the A/B's actual scoreboard.
 *  Cost per meeting stays a dash: it needs the spend store's card cost, and
 *  a cost we do not have must never render as a number we do. */
function armTotals(entries: OutreachEntry[], arm: string) {
  const rows = entries.filter((e) => e.arm === arm);
  const sum = (pick: (e: OutreachEntry) => number | null) =>
    rows.reduce<number | null>((acc, e) => {
      const v = pick(e);
      if (v === null) return acc;
      return (acc ?? 0) + v;
    }, null);
  return { mailed: sum((e) => e.mailingsSent), meetings: sum((e) => e.meetingsBooked) };
}

/** label → number, nothing else. An unwired stat carries the hollow dot and
 *  its tooltip says what would wire it — never a caption. */
function ArmStat({
  label,
  value,
  logged,
  unwired,
}: {
  label: string;
  value: number | null;
  logged?: boolean;
  unwired?: string;
}) {
  return (
    <div className="min-w-[86px]">
      <div className="flex items-center gap-2">
        <span className="ops-metric-label">{label}</span>
        {unwired && <HealthDot tooltip={unwired} />}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`ops-tnum text-[20px] font-semibold ${value === null ? "ops-muted" : ""}`}>
          {value === null ? DASH : value.toLocaleString("en-US")}
        </span>
        {logged && value !== null && <LoggedTag />}
      </div>
    </div>
  );
}

export default async function OutreachPage() {
  const [result, session] = await Promise.all([readOpsOutreach(), ownerSession()]);
  const isOwner = !!session;

  const all: OutreachEntry[] = result.configured ? result.records : [];
  const entries = all.filter((e) => !e.archived);
  const archived = all.filter((e) => e.archived);

  // Unique HSMs, derived from config/markets.ts — never written down again.
  const hsmMarkets = new Map<string, string[]>();
  for (const m of MARKETS) {
    hsmMarkets.set(m.hsm.name, [...(hsmMarkets.get(m.hsm.name) ?? []), m.name]);
  }
  const hsms = [...hsmMarkets.entries()].map(([name, covers]) => ({ name, covers: covers.join(" · ") }));

  const weeks = recentWeeks();

  return (
    <>
      <SurfaceHeader surface={surface} />

      {/* ── the A/B: two arms side by side ── */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:mb-6 md:grid-cols-2 md:gap-6">
        {OUTREACH_ARMS.map((arm) => {
          const totals = armTotals(entries, arm.key);
          return (
            <OpsCard
              key={arm.key}
              title={arm.label}
              titleTooltip="The conversion event is a meeting, not a quote — the A/B decides which arm books face time, and nothing downstream of the meeting is credited to it."
              control={
                <StatusBadge
                  status={`$${COST_PER_MEETING_TARGET_USD} / meeting`}
                  tone="neutral"
                  title={`Target: $${COST_PER_MEETING_TARGET_USD} cost per meeting`}
                />
              }
            >
              <div className="flex items-start gap-8">
                <ArmStat label="Mailed" value={totals.mailed} logged />
                <ArmStat label="Meetings" value={totals.meetings} logged />
                <ArmStat
                  label="Cost per meeting"
                  value={null}
                  unwired="Not wired — needs the spend store's card cost."
                />
              </div>
            </OpsCard>
          );
        })}
      </div>

      {/* ── per-HSM cadence ── */}
      <OpsCard
        title="Weekly cadence by HSM"
        control={
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge
              status={`${OUTREACH_WEEKLY_MAILINGS_TARGET} mailings / wk`}
              tone="neutral"
              title={`Target: ${OUTREACH_WEEKLY_MAILINGS_TARGET} mailings per HSM per week`}
            />
            <StatusBadge
              status={`${OUTREACH_WEEKLY_CALLS_TARGET} calls / wk`}
              tone="neutral"
              title={`Target: ${OUTREACH_WEEKLY_CALLS_TARGET} calls per HSM per week`}
            />
            {!result.configured && (
              <StatusBadge
                status="read-only"
                tone="neutral"
                title="Ops store not configured — cadence is read-only."
              />
            )}
          </span>
        }
      >
        <CadenceTable
          hsms={hsms}
          entries={entries}
          archived={archived}
          weekOf={weeks[0]}
          weeks={weeks}
          mailingsTarget={OUTREACH_WEEKLY_MAILINGS_TARGET}
          callsTarget={OUTREACH_WEEKLY_CALLS_TARGET}
          isOwner={isOwner && result.configured}
        />
      </OpsCard>

      <SurfaceHealth surface={surface} />
    </>
  );
}
