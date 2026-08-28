import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import { CHANNEL_FUNNEL_ORDER, CHANNEL_LABELS, HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { CHANNEL_COLORS, type Channel } from "@/lib/channels";
import {
  aggregateSnapshot,
  OTHER_MARKETS_KEY,
  qualifiedByMonthChannel,
  SNAPSHOT_LABEL,
  SNAPSHOT_MONTHS,
} from "@/config/appLeadsSnapshot";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { InfoPopover } from "@/app/(site)/admin/_ui/InfoPopover";
import { Meta, Panel } from "@/app/(site)/admin/_ui/primitives";
import { monthsFor, parseAttribution, parseTimeframe, timeframeLabel } from "../timeframe";
import { Sparkline } from "../charts";
import { DASH, DefinitionsInfo, HubPageHeader, NeedsBlock } from "../hubUi";

// ─────────────────────────────────────────────────────────────────────────────
// Channels — one row per channel across all markets: what is producing, what
// has gone quiet, and (once spend lands) what each Qualified costs. Channel
// attribution is last-touch from the snapshot; the first-touch view renders
// em-dashes because its source genuinely doesn't exist.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Channels · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.channels;

export default async function ChannelsPage({
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
  const byMonthChannel = qualifiedByMonthChannel();

  const marketKeys = [...MARKETS.map((m) => m.slug), OTHER_MARKETS_KEY];
  const rows = CHANNEL_FUNNEL_ORDER.map((c) => {
    let qualified = 0;
    let closed = 0;
    let revenue = 0;
    for (const key of marketKeys) {
      const cell = agg.cells[`${key}|${c}`];
      if (!cell) continue;
      qualified += cell.qualified;
      closed += cell.closed;
      revenue += cell.revenue;
    }
    const trend = SNAPSHOT_MONTHS.map((ym) => byMonthChannel[ym]?.[c] ?? 0);
    return { channel: c as Channel, qualified, closed, revenue, trend };
  });
  const totalQ = rows.reduce((s, r) => s + r.qualified, 0);
  const firstTouch = mode === "first";

  return (
    <>
      <HubPageHeader surface={surface} right={<DefinitionsInfo align="right" />} />
      <Panel
        flush
        title="Qualified by channel"
        right={
          <span className="inline-flex items-center gap-1.5">
            <Meta>
              {tfLabel} · {SNAPSHOT_LABEL} ·{" "}
              {firstTouch ? "first touch (unavailable)" : "last touch · direct = unattributed"}
            </Meta>
            <InfoPopover label="How to read this table" align="right">
              {firstTouch ? (
                <p className="m-0">
                  The app&apos;s first-touch fields are empty (verified against its attribution
                  export) — first-touch channel numbers render em-dashes until the contact store
                  exists.
                </p>
              ) : (
                <p className="m-0">
                  Direct is not a channel win — it is the absence of attribution. Cost per
                  Qualified needs the spend store. The trend column spans every snapshot month
                  regardless of the selected timeframe.
                </p>
              )}
            </InfoPopover>
          </span>
        }
      >
        <Table>
          <thead>
            <tr>
              <Th>Channel</Th>
              <Th align="right">Qualified</Th>
              <Th align="right">Share</Th>
              <Th align="right">Closed</Th>
              <Th align="right">Close rate</Th>
              <Th align="right">Revenue</Th>
              <Th align="right">Cost / Qualified</Th>
              <Th>All months</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const zero = r.qualified === 0;
              return (
                <Tr key={r.channel}>
                  <Td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 flex-none rounded-sm"
                        style={{ background: CHANNEL_COLORS[r.channel] }}
                      />
                      {CHANNEL_LABELS[r.channel]}
                    </span>
                  </Td>
                  {firstTouch ? (
                    <>
                      <Td align="right" muted>{DASH}</Td>
                      <Td align="right" muted>{DASH}</Td>
                      <Td align="right" muted>{DASH}</Td>
                      <Td align="right" muted>{DASH}</Td>
                      <Td align="right" muted>{DASH}</Td>
                    </>
                  ) : (
                    <>
                      <Td align="right" muted={zero} className={zero ? "" : "font-semibold"}>
                        {r.qualified}
                      </Td>
                      <Td align="right" muted>
                        {totalQ ? `${Math.round((r.qualified / totalQ) * 100)}%` : DASH}
                      </Td>
                      <Td align="right" muted={!r.closed}>{r.closed}</Td>
                      <Td align="right" muted>
                        {r.qualified ? `${Math.round((r.closed / r.qualified) * 100)}%` : DASH}
                      </Td>
                      <Td align="right" muted={!r.revenue}>
                        {r.revenue ? `$${Math.round(r.revenue).toLocaleString("en-US")}` : "$0"}
                      </Td>
                    </>
                  )}
                  <Td align="right" muted title="needs the spend store">
                    {DASH}
                  </Td>
                  <Td>
                    <Sparkline values={r.trend} width={110} height={20} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
      <NeedsBlock surface={surface} />
    </>
  );
}
