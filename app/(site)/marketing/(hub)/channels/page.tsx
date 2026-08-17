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
import { Meta, MUTED, Panel, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { monthsFor, parseAttribution, parseTimeframe, timeframeLabel } from "../timeframe";
import { Sparkline } from "../charts";
import { DASH, DefinitionsNote, HubPageHeader, NeedsBlock, td, tdDash, th } from "../hubUi";

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
      <HubPageHeader surface={surface} />
      <Panel
        title="Qualified by channel"
        right={
          <Meta>
            {tfLabel} · {SNAPSHOT_LABEL} ·{" "}
            {firstTouch ? "first touch (unavailable)" : "last touch · direct = unattributed"}
          </Meta>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Channel</th>
                <th style={{ ...th, textAlign: "right" }}>Qualified</th>
                <th style={{ ...th, textAlign: "right" }}>Share</th>
                <th style={{ ...th, textAlign: "right" }}>Closed</th>
                <th style={{ ...th, textAlign: "right" }}>Close rate</th>
                <th style={{ ...th, textAlign: "right" }}>Revenue</th>
                <th style={{ ...th, textAlign: "right" }}>Cost / Qualified</th>
                <th style={th}>All months</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const zero = r.qualified === 0;
                return (
                  <tr key={r.channel}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                        <span
                          aria-hidden
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: CHANNEL_COLORS[r.channel],
                            flex: "none",
                          }}
                        />
                        {CHANNEL_LABELS[r.channel]}
                      </span>
                    </td>
                    {firstTouch ? (
                      <>
                        <td style={{ ...tdDash, textAlign: "right" }}>{DASH}</td>
                        <td style={{ ...tdDash, textAlign: "right" }}>{DASH}</td>
                        <td style={{ ...tdDash, textAlign: "right" }}>{DASH}</td>
                        <td style={{ ...tdDash, textAlign: "right" }}>{DASH}</td>
                        <td style={{ ...tdDash, textAlign: "right" }}>{DASH}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ ...td, textAlign: "right", fontWeight: zero ? 400 : 600, color: zero ? SUBTLE : "var(--color-text)", fontVariantNumeric: "tabular-nums" }}>
                          {r.qualified}
                        </td>
                        <td style={{ ...td, textAlign: "right", color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                          {totalQ ? `${Math.round((r.qualified / totalQ) * 100)}%` : DASH}
                        </td>
                        <td style={{ ...td, textAlign: "right", color: r.closed ? "var(--color-text)" : SUBTLE, fontVariantNumeric: "tabular-nums" }}>
                          {r.closed}
                        </td>
                        <td style={{ ...td, textAlign: "right", color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                          {r.qualified ? `${Math.round((r.closed / r.qualified) * 100)}%` : DASH}
                        </td>
                        <td style={{ ...td, textAlign: "right", color: r.revenue ? "var(--color-text)" : SUBTLE, fontVariantNumeric: "tabular-nums" }}>
                          {r.revenue ? `$${Math.round(r.revenue).toLocaleString("en-US")}` : "$0"}
                        </td>
                      </>
                    )}
                    <td style={{ ...tdDash, textAlign: "right" }} title="needs the spend store">
                      {DASH}
                    </td>
                    <td style={td}>
                      <Sparkline values={r.trend} width={110} height={20} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0", lineHeight: 1.6 }}>
          {firstTouch
            ? "The app's first-touch fields are empty (verified against its attribution export) — first-touch channel numbers render em-dashes until the contact store exists."
            : "Direct is not a channel win — it is the absence of attribution. Cost per Qualified needs the spend store. The trend column spans every snapshot month regardless of the selected timeframe."}
        </p>
        <DefinitionsNote />
      </Panel>
      <NeedsBlock surface={surface} />
    </>
  );
}
