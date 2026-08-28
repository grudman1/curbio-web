import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS } from "@/config/markets";
import {
  CHANNEL_FUNNEL_ORDER,
  HUB_SURFACE_BY_SLUG,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
} from "@/config/marketingHub";
import { CHANNEL_COLORS } from "@/lib/channels";
import {
  aggregateSnapshot,
  OTHER_MARKETS_KEY,
  OTHER_MARKETS_LABEL,
  SNAPSHOT_AS_OF,
  SNAPSHOT_LABEL,
  SNAPSHOT_MONTHS,
} from "@/config/appLeadsSnapshot";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { Meta, Panel } from "@/app/(site)/admin/_ui/primitives";
import { PACE_TONE, TONE_TEXT } from "@/app/(site)/admin/_ui/tone";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsNotes, type OpsNote } from "@/lib/opsNotes";
import { NotesPanel } from "../notes/NotesPanel";
import { monthsFor, parseAttribution, parseTimeframe, timeframeLabel, timeframeParam } from "../timeframe";
import { paceRead, paceSentence } from "../pacing";
import { DASH, DefinitionsInfo, HubPageHeader, NeedsBlock } from "../hubUi";

// ─────────────────────────────────────────────────────────────────────────────
// Markets — one row per market: trajectory against the target, close rate,
// revenue, and the channel mix that produced it. The mix bar is last-touch
// from the snapshot; on first touch it renders as unavailable, honestly.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Markets · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.markets;

/** Tiny horizontal stacked bar of channel shares — the same fixed colours as
 *  every other chart, no labels (the Report grid is one click away). */
function MixBar({ shares }: { shares: { channel: string; frac: number }[] }) {
  if (shares.length === 0) {
    return <span className="font-sans text-ops-label text-content-subtle">{DASH}</span>;
  }
  return (
    <span aria-hidden className="inline-flex h-2 w-[110px] overflow-hidden rounded-pill border border-app-border">
      {shares.map((s) => (
        <span
          key={s.channel}
          style={{ width: `${s.frac * 100}%`, background: CHANNEL_COLORS[s.channel as keyof typeof CHANNEL_COLORS] }}
        />
      ))}
    </span>
  );
}

export const dynamic = "force-dynamic";

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS);
  const mode = parseAttribution(sp.a);
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const tfLabel = timeframeLabel(tf, SNAPSHOT_MONTHS);
  const agg = aggregateSnapshot(new Set(months));
  const target = QUALIFIED_TARGET_PER_MARKET_PER_MONTH * months.length;
  const firstTouch = mode === "first";
  const linkQuery = `t=${timeframeParam(tf)}${firstTouch ? "&a=first" : ""}`;

  // Notes hang off market slugs — one read for the whole screen, grouped
  // below, rather than a fetch per market panel.
  const [notesResult, session] = await Promise.all([readOpsNotes(), ownerSession()]);
  const isOwner = !!session;
  const notesByMarket = new Map<string, OpsNote[]>();
  if (notesResult.configured) {
    for (const n of notesResult.records) {
      if (n.archived || n.subjectType !== "market") continue;
      notesByMarket.set(n.subjectId, [...(notesByMarket.get(n.subjectId) ?? []), n]);
    }
    for (const list of notesByMarket.values()) list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const rowKeys: { key: string; label: string; sub?: string }[] = MARKETS.map((m) => ({
    key: m.slug,
    label: m.name,
    sub: m.hsm.name,
  }));
  if (agg.marketKeys.includes(OTHER_MARKETS_KEY)) {
    rowKeys.push({ key: OTHER_MARKETS_KEY, label: OTHER_MARKETS_LABEL, sub: "no landing pages · no target" });
  }

  const rows = rowKeys.map((r) => {
    let qualified = 0;
    let closed = 0;
    let revenue = 0;
    const mix: { channel: string; frac: number }[] = [];
    for (const c of CHANNEL_FUNNEL_ORDER) {
      const cell = agg.cells[`${r.key}|${c}`];
      if (!cell) continue;
      qualified += cell.qualified;
      closed += cell.closed;
      revenue += cell.revenue;
      if (cell.qualified > 0) mix.push({ channel: c, frac: cell.qualified });
    }
    for (const m of mix) m.frac = qualified ? m.frac / qualified : 0;
    const pace =
      r.key === OTHER_MARKETS_KEY
        ? null
        : paceRead(qualified, months, SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH);
    return { ...r, qualified, closed, revenue, mix, pace };
  });

  return (
    <>
      <HubPageHeader surface={surface} right={<DefinitionsInfo align="right" />} />
      <Panel
        flush
        title={`Markets vs ${target || QUALIFIED_TARGET_PER_MARKET_PER_MONTH} Qualified`}
        right={
          <Meta>
            {tfLabel} · {SNAPSHOT_LABEL} · {firstTouch ? "first touch (unavailable)" : "mix = last touch"}
          </Meta>
        }
      >
        <Table>
          <thead>
            <tr>
              <Th>Market</Th>
              <Th align="right">Qualified</Th>
              <Th align="right">Target</Th>
              <Th>Pace</Th>
              <Th align="right">Closed</Th>
              <Th align="right">Close rate</Th>
              <Th align="right">Revenue</Th>
              <Th>Channel mix</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.key}>
                <Td className="whitespace-nowrap">
                  <Link
                    href={`/marketing/report?${linkQuery}`}
                    title="Open the Funnel grid with this timeframe"
                    className="font-semibold text-content no-underline hover:underline"
                  >
                    {r.label}
                  </Link>
                  {r.sub && <div className="mt-px font-sans text-ops-label text-content-subtle">{r.sub}</div>}
                </Td>
                <Td align="right" className={r.qualified ? "font-semibold" : ""} muted={!r.qualified}>
                  {r.qualified}
                </Td>
                <Td align="right" muted>
                  {r.key === OTHER_MARKETS_KEY ? DASH : target || DASH}
                </Td>
                <Td className="whitespace-nowrap">
                  {r.pace ? (
                    <span className={`font-sans text-ops-label font-bold ${TONE_TEXT[PACE_TONE[r.pace.state]]}`}>
                      {paceSentence(r.pace)}
                    </span>
                  ) : (
                    <span className="font-sans text-ops-label text-content-subtle">{DASH}</span>
                  )}
                </Td>
                <Td align="right" muted={!r.closed}>
                  {r.closed}
                </Td>
                <Td align="right" muted>
                  {r.qualified ? `${Math.round((r.closed / r.qualified) * 100)}%` : DASH}
                </Td>
                <Td align="right" muted={!r.revenue}>
                  {r.revenue ? `$${Math.round(r.revenue).toLocaleString("en-US")}` : "$0"}
                </Td>
                <Td muted={firstTouch}>{firstTouch ? DASH : <MixBar shares={r.mix} />}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      {/* ── notes per market — claimed context beside the measured numbers ── */}
      <div className="mt-ops-gap">
        <Panel title="Market notes" right={<Meta>logged · author and date on every line</Meta>}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            {MARKETS.map((m) => (
              <div key={m.slug}>
                <div className="mb-1.5 font-sans text-ops-body font-bold text-content">{m.name}</div>
                <NotesPanel
                  subjectType="market"
                  subjectId={m.slug}
                  notes={notesByMarket.get(m.slug) ?? []}
                  isOwner={isOwner && notesResult.configured}
                  revalidate="/marketing/markets"
                  emptyHint="No notes yet."
                />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <NeedsBlock surface={surface} />
    </>
  );
}
