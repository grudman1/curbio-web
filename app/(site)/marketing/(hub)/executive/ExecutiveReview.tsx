// ─────────────────────────────────────────────────────────────────────────────
// The Executive review — everything mapped, on one screen, legible to someone
// who has never opened any other page. Projected and read for ten minutes
// once a month, so: nothing on this page requires interaction to be
// understood. No toggles, no drill-downs, no attribution switches — those
// stay in the operator pages.
//
// Server component shared by the operator route (editable agenda) and the
// tokened share route (no sidebar, larger type, read-only). The share view
// keeps its definitions PRINTED — a projected document cannot rely on hover.
// ─────────────────────────────────────────────────────────────────────────────

import { MARKETS } from "@/config/markets";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  COST_PER_ATTENDEE_TARGET_USD,
  COST_PER_MEETING_TARGET_USD,
  ENGAGED_DEFINITION,
  OUTREACH_WEEKLY_CALLS_TARGET,
  OUTREACH_WEEKLY_MAILINGS_TARGET,
  QUALIFIED_DEFINITION,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "@/config/marketingHub";
import { CHANNEL_COLORS, type Channel } from "@/lib/channels";
import {
  aggregateSnapshot,
  funnelCounts,
  OTHER_MARKETS_KEY,
  OTHER_MARKETS_LABEL,
  SNAPSHOT_LABEL,
  SNAPSHOT_MONTHS,
} from "@/config/appLeadsSnapshot";
import type { ExecNotes } from "@/lib/marketingExecNotes";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { DASH, Eyebrow, Meta, Panel } from "@/app/(site)/admin/_ui/primitives";
import { monthLabelFull, monthShort } from "../timeframe";
import { NotesEditor } from "./NotesEditor";

function Arrow({ delta }: { delta: number }) {
  const glyph = delta > 0 ? "▲" : delta < 0 ? "▼" : "→";
  const tone = delta > 0 ? "text-tone-good" : delta < 0 ? "text-tone-bad" : "text-content-subtle";
  return (
    <span aria-label={`${delta > 0 ? "up" : delta < 0 ? "down" : "flat"} vs last month`} className={`${tone} text-[10px] font-bold tabular-nums`}>
      {glyph} {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

function SectionHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
      <Eyebrow>{label}</Eyebrow>
      {right}
    </div>
  );
}

function DashStat({ label }: { label: string }) {
  return (
    <div>
      <div className="font-sans text-[26px] font-semibold leading-none tabular-nums text-content-subtle">{DASH}</div>
      <div className="mt-1.5 font-sans text-ops-label text-content-muted">{label}</div>
    </div>
  );
}

export function ExecutiveReview({
  month,
  notes,
  editable,
  share = false,
}: {
  /** "2026-08" — a month the snapshot has data for. */
  month: string;
  notes: ExecNotes | null;
  /** Operator view: the agenda is editable. Share view: read-only prose. */
  editable: boolean;
  /** Share view: larger type, built to be projected. */
  share?: boolean;
}) {
  const monthName = monthLabelFull(month);
  const prevMonth = SNAPSHOT_MONTHS[SNAPSHOT_MONTHS.indexOf(month) - 1] as string | undefined;

  const agg = aggregateSnapshot(new Set([month]));
  const prevAgg = prevMonth ? aggregateSnapshot(new Set([prevMonth])) : null;

  // ── per-market scorecard, sorted by gap, worst first ──────────────────────
  const target = QUALIFIED_TARGET_PER_MARKET_PER_MONTH;
  const scorecard = MARKETS.map((m) => {
    let qualified = 0;
    let closed = 0;
    let revenue = 0;
    for (const c of CHANNEL_FUNNEL_ORDER) {
      const cell = agg.cells[`${m.slug}|${c}`];
      if (!cell) continue;
      qualified += cell.qualified;
      closed += cell.closed;
      revenue += cell.revenue;
    }
    const prevQ = prevAgg ? (prevAgg.qualifiedByMarketMonth[`${m.slug}|${prevMonth}`] ?? 0) : null;
    return {
      name: m.name,
      qualified,
      closed,
      revenue,
      gap: target - qualified,
      delta: prevQ === null ? null : qualified - prevQ,
    };
  }).sort((a, b) => b.gap - a.gap);

  const companyQ = scorecard.reduce((s, r) => s + r.qualified, 0);
  const companyTarget = target * MARKETS.length;
  const otherQ = agg.qualifiedByMarketMonth[`${OTHER_MARKETS_KEY}|${month}`] ?? 0;

  // ── channel contribution ──────────────────────────────────────────────────
  const byChannel = CHANNEL_FUNNEL_ORDER.map((c) => {
    let q = 0;
    for (const key of Object.keys(agg.cells)) {
      if (key.endsWith(`|${c}`)) q += agg.cells[key].qualified;
    }
    let prevQ = 0;
    if (prevAgg) {
      for (const key of Object.keys(prevAgg.cells)) {
        if (key.endsWith(`|${c}`)) prevQ += prevAgg.cells[key].qualified;
      }
    }
    return { channel: c as Channel, q, prevQ };
  });
  const totalWithOther = byChannel.reduce((s, r) => s + r.q, 0);
  const unattributed = byChannel.find((r) => r.channel === "direct")?.q ?? 0;
  const movers = byChannel
    .filter((r) => r.channel !== "direct")
    .map((r) => ({ ...r, delta: r.q - r.prevQ }))
    .filter((r) => r.delta !== 0)
    .sort((a, b) => b.delta - a.delta);
  const grew = movers.filter((m) => m.delta > 0).slice(0, 3);
  const shrank = movers.filter((m) => m.delta < 0).slice(-3).reverse();

  // ── funnel, this month vs last ────────────────────────────────────────────
  const funnel = funnelCounts(new Set([month]));
  const prevFunnel = prevMonth ? funnelCounts(new Set([prevMonth])) : null;
  const stages = [
    { label: "Engaged", cur: null as number | null, prev: null as number | null },
    { label: "Qualified", cur: funnel[0], prev: prevFunnel?.[0] ?? null },
    { label: "Meeting", cur: funnel[2], prev: prevFunnel?.[2] ?? null },
    { label: "Proposal", cur: funnel[4], prev: prevFunnel?.[4] ?? null },
    { label: "Closed", cur: funnel[5], prev: prevFunnel?.[5] ?? null },
  ];
  const conv = (from: number | null, to: number | null) =>
    from === null || to === null || from === 0 ? DASH : `${Math.round((to / from) * 100)}%`;

  return (
    <div className={share ? "text-[17px]" : undefined}>
      {/* ── 1. the headline — one sentence, no chart above it ── */}
      <section className="mb-8">
        <p
          className={`m-0 max-w-[30em] font-sans font-bold leading-[1.25] text-content ${
            share ? "text-[36px]" : "text-[26px]"
          }`}
        >
          In {monthName.split(" ")[0]}, Curbio produced {companyQ} qualified lead
          {companyQ === 1 ? "" : "s"} across {MARKETS.length} markets against a target of{" "}
          {companyTarget}.
        </p>
        <p className={`m-0 mt-3.5 font-sans text-content-muted ${share ? "text-[17px]" : "text-body"}`}>
          <strong className={`font-semibold tabular-nums text-content ${share ? "text-[26px]" : "text-[22px]"}`}>
            {companyQ}
          </strong>{" "}
          of {companyTarget} — {companyTarget - companyQ} short.
          {otherQ > 0 && ` (+${otherQ} in app markets without landing pages, outside the target.)`}
        </p>
        <p className="m-0 mt-2.5 font-sans text-ops-label text-content-subtle">
          {monthName} · {SNAPSHOT_LABEL}
        </p>
      </section>

      {/* ── 2. market scorecard — the table the meeting is about ── */}
      <section className="mb-8">
        <SectionHead
          label="Markets, worst gap first"
          right={<Meta>target {target} each · arrow vs {prevMonth ? monthShort(prevMonth) : "last month"}</Meta>}
        />
        <Panel flush>
          <Table>
            <thead>
              <tr>
                <Th>Market</Th>
                <Th align="right">Qualified</Th>
                <Th align="right">Target</Th>
                <Th align="right">Gap</Th>
                <Th align="right">Close rate</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">vs last</Th>
              </tr>
            </thead>
            <tbody>
              {scorecard.map((r) => (
                <Tr key={r.name}>
                  <Td className={`font-semibold ${share ? "text-[16px]" : ""}`}>{r.name}</Td>
                  <Td align="right" className="font-bold">{r.qualified}</Td>
                  <Td align="right" muted>{target}</Td>
                  <Td align="right" className={`font-bold ${r.gap > 0 ? "text-tone-bad" : "text-tone-good"}`}>
                    {r.gap > 0 ? `−${r.gap}` : `+${-r.gap}`}
                  </Td>
                  <Td align="right" muted>{r.qualified ? `${Math.round((r.closed / r.qualified) * 100)}%` : DASH}</Td>
                  <Td align="right" muted={!r.revenue}>
                    {r.revenue ? `$${Math.round(r.revenue).toLocaleString("en-US")}` : "$0"}
                  </Td>
                  <Td align="right" className="whitespace-nowrap">
                    {r.delta === null ? <span className="text-content-subtle">{DASH}</span> : <Arrow delta={r.delta} />}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        {otherQ > 0 && (
          <p className="m-0 mt-2 font-sans text-ops-label text-content-subtle">
            {OTHER_MARKETS_LABEL}: {otherQ} Qualified — app markets without landing pages, no target.
          </p>
        )}
      </section>

      {/* ── 3. what produced them ── */}
      <section className="mb-8">
        <SectionHead label="What produced them" right={<Meta>last touch · all app markets · unattributed broken out</Meta>} />
        {totalWithOther === 0 ? (
          <p className="m-0 font-sans text-ops-body text-content-muted">No Qualified leads in {monthName}.</p>
        ) : (
          <>
            <div aria-hidden className="flex h-[26px] overflow-hidden rounded-md border border-app-border">
              {byChannel
                .filter((r) => r.q > 0)
                .map((r) => (
                  <span
                    key={r.channel}
                    title={`${CHANNEL_LABELS[r.channel]}: ${r.q}`}
                    style={{ width: `${(r.q / totalWithOther) * 100}%`, background: CHANNEL_COLORS[r.channel] }}
                  />
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {byChannel
                .filter((r) => r.q > 0)
                .map((r) => (
                  <span
                    key={r.channel}
                    className={`inline-flex items-center gap-1.5 font-sans font-semibold text-content-muted ${share ? "text-[13px]" : "text-[11.5px]"}`}
                  >
                    <span aria-hidden className="h-[9px] w-[9px] flex-none rounded-sm" style={{ background: CHANNEL_COLORS[r.channel] }} />
                    {r.channel === "direct" ? "Unattributed" : CHANNEL_LABELS[r.channel]} {r.q}
                  </span>
                ))}
            </div>
            <p className={`m-0 mt-3 max-w-[700px] font-sans leading-[1.6] text-content ${share ? "text-[15px]" : "text-ops-body"}`}>
              <strong>{Math.round((unattributed / totalWithOther) * 100)}% is unattributed</strong> — {unattributed} of{" "}
              {totalWithOther} arrived with no UTM, no first-touch cookie, and no tracked phone number. We do not know
              what produced them.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-10">
              <div>
                <Eyebrow className="mb-1.5 block">Grew most{prevMonth ? ` vs ${monthShort(prevMonth)}` : ""}</Eyebrow>
                {grew.length === 0 ? (
                  <p className="m-0 font-sans text-ops-label text-content-subtle">no attributed channel grew</p>
                ) : (
                  grew.map((g) => (
                    <p key={g.channel} className={`my-0.5 font-sans text-content ${share ? "text-[15px]" : "text-ops-body"}`}>
                      {CHANNEL_LABELS[g.channel]} <strong>+{g.delta}</strong> ({g.prevQ} → {g.q})
                    </p>
                  ))
                )}
              </div>
              <div>
                <Eyebrow className="mb-1.5 block">Shrank most{prevMonth ? ` vs ${monthShort(prevMonth)}` : ""}</Eyebrow>
                {shrank.length === 0 ? (
                  <p className="m-0 font-sans text-ops-label text-content-subtle">no attributed channel shrank</p>
                ) : (
                  shrank.map((g) => (
                    <p key={g.channel} className={`my-0.5 font-sans text-content ${share ? "text-[15px]" : "text-ops-body"}`}>
                      {CHANNEL_LABELS[g.channel]} <strong>{g.delta}</strong> ({g.prevQ} → {g.q})
                    </p>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── 4. the funnel — lead problem or closing problem ── */}
      <section className="mb-8">
        <SectionHead
          label="Funnel — is it a lead problem or a closing problem"
          right={<Meta>{monthName}{prevMonth ? ` beside ${monthShort(prevMonth)}` : ""} · all app markets</Meta>}
        />
        <div className="overflow-x-auto">
          <div className="flex min-w-[560px] items-stretch gap-2">
            {stages.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-center gap-2">
                <div className={`flex-1 rounded-lg border border-app-border bg-app-card shadow-app-card ${share ? "px-4 py-3.5" : "px-3.5 py-2.5"}`}>
                  <div
                    className={`font-sans font-semibold leading-none tabular-nums ${share ? "text-[30px]" : "text-[24px]"} ${
                      s.cur === null ? "text-content-subtle" : "text-content"
                    }`}
                  >
                    {s.cur ?? DASH}
                  </div>
                  <div className={`mt-1 whitespace-nowrap font-sans text-content-muted ${share ? "text-[13px]" : "text-ops-label"}`}>
                    {s.label}
                  </div>
                  <div className={`mt-0.5 font-sans text-content-subtle ${share ? "text-[12px]" : "text-ops-micro"}`}>
                    {prevMonth ? `${monthShort(prevMonth)}: ${s.prev ?? DASH}` : ""}
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <div className="flex-none text-center">
                    <div className={`font-sans font-bold text-content ${share ? "text-[13px]" : "text-ops-label"}`}>
                      {conv(s.cur, stages[i + 1].cur)}
                    </div>
                    <div className={`font-sans text-content-subtle ${share ? "text-[11px]" : "text-ops-micro"}`}>
                      {prevMonth ? conv(s.prev, stages[i + 1].prev) : ""}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="m-0 mt-2.5 font-sans text-ops-label leading-[1.6] text-content-subtle">
          Cumulative reached-at-least counts; Closed = status Won only. Engaged has no wired source yet and renders an
          em-dash, never a zero.
        </p>
      </section>

      {/* ── 5. initiatives ── */}
      <section className="mb-8">
        <SectionHead label="Initiatives" />
        <div className="grid grid-cols-1 gap-ops-gap md:grid-cols-3">
          <Panel title="Partners" right={<Meta>vs ${COST_PER_MEETING_TARGET_USD} per meeting</Meta>}>
            <div className="flex gap-7">
              <DashStat label="meetings booked" />
              <DashStat label="cost per meeting" />
            </div>
            <p className="m-0 mt-2.5 font-sans text-ops-label leading-[1.5] text-content-subtle">
              No on-track read until the meeting log and spend entry exist.
            </p>
          </Panel>
          <Panel title="Events" right={<Meta>vs ${COST_PER_ATTENDEE_TARGET_USD} per attendee</Meta>}>
            <div className="flex gap-7">
              <DashStat label="events held" />
              <DashStat label="cost per attendee" />
            </div>
            <p className="m-0 mt-2.5 font-sans text-ops-label leading-[1.5] text-content-subtle">
              No on-track read until the event log and spend entry exist.
            </p>
          </Panel>
          <Panel
            title="Outreach"
            right={<Meta>target {OUTREACH_WEEKLY_MAILINGS_TARGET} mailings · {OUTREACH_WEEKLY_CALLS_TARGET} calls / HSM / wk</Meta>}
          >
            <div className="flex gap-7">
              <DashStat label="cadence kept" />
              <DashStat label="meetings booked" />
            </div>
            <p className="m-0 mt-2.5 font-sans text-ops-label leading-[1.5] text-content-subtle">
              No on-track read until the mailing log exists.
            </p>
          </Panel>
        </div>
      </section>

      {/* ── 6. the agenda: wins · concerns · decisions ── */}
      <section className="mb-8">
        <SectionHead
          label="Wins · Concerns · Decisions needed"
          right={notes?.updatedAt ? <Meta>written {notes.updatedAt.slice(0, 10)}</Meta> : undefined}
        />
        {editable ? (
          <NotesEditor month={month} initial={notes} />
        ) : (
          <div className="grid gap-4">
            {(
              [
                ["Wins", notes?.wins],
                ["Concerns", notes?.concerns],
                ["Decisions needed", notes?.decisions],
              ] as const
            ).map(([label, text]) => (
              <div key={label}>
                <Eyebrow className="mb-1.5 block">{label}</Eyebrow>
                {text ? (
                  <p className={`m-0 whitespace-pre-wrap font-sans leading-[1.65] text-content ${share ? "text-[16px]" : "text-ops-body"}`}>
                    {text}
                  </p>
                ) : (
                  <p className="m-0 font-sans text-ops-label text-content-subtle">Not written for {monthName}.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 7. definitions — printed on the projected share view, where nobody
             can hover an ⓘ. The operator view carries them in the header. ── */}
      {share && (
        <section>
          <Eyebrow className="mb-2 block">Definitions</Eyebrow>
          <p className="m-0 max-w-[700px] font-sans text-[15px] leading-[1.7] text-content-muted">
            {QUALIFIED_DEFINITION} {ENGAGED_DEFINITION} Engaged is never added into a Qualified number, on any screen.
          </p>
        </section>
      )}
    </div>
  );
}
