import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import { Meta, MUTED, Panel, Stat, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
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
import { DASH, HubPageHeader, NeedsBlock } from "../hubUi";
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
      <HubPageHeader surface={surface} />

      {/* ── the A/B: two arms side by side ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-4)",
        }}
      >
        {OUTREACH_ARMS.map((arm) => {
          const totals = armTotals(entries, arm.key);
          return (
            <Panel key={arm.key} title={arm.label} right={<Meta>vs. ${COST_PER_MEETING_TARGET_USD} per meeting</Meta>}>
              <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
                <Stat label="mailed" value={totals.mailed === null ? DASH : String(totals.mailed)} tone={SUBTLE} />
                <Stat label="meetings" value={totals.meetings === null ? DASH : String(totals.meetings)} tone={SUBTLE} />
                <Stat label="cost per meeting" value={DASH} tone={SUBTLE} />
              </div>
              {(totals.mailed !== null || totals.meetings !== null) && (
                <div style={{ marginTop: 10 }}>
                  <LoggedTag />
                </div>
              )}
            </Panel>
          );
        })}
      </div>
      <p
        style={{
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-small)",
          color: MUTED,
          margin: "0 0 var(--space-4)",
          maxWidth: 720,
          lineHeight: 1.6,
        }}
      >
        The conversion event is a <strong>meeting</strong>, not a quote — the A/B decides
        which arm books face time, and nothing downstream of the meeting is credited to it.
        Cost per meeting stays a dash until the spend store carries the card cost.
      </p>

      {/* ── per-HSM cadence ── */}
      <Panel
        title="Weekly cadence by HSM"
        right={
          <Meta>
            target: {OUTREACH_WEEKLY_MAILINGS_TARGET} mailings · {OUTREACH_WEEKLY_CALLS_TARGET} calls per week
          </Meta>
        }
      >
        {!result.configured && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: SUBTLE, margin: "0 0 12px" }}>
            Ops store not configured — cadence is read-only.
          </p>
        )}
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
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}
