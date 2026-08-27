import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS } from "@/config/markets";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
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
import { Meta, MUTED, Panel, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsNotes, type OpsNote } from "@/lib/opsNotes";
import { NotesPanel } from "../notes/NotesPanel";
import { monthsFor, parseAttribution, parseTimeframe, timeframeLabel, timeframeParam } from "../timeframe";
import { paceRead, paceSentence } from "../pacing";
import { DASH, DefinitionsNote, HubPageHeader, NeedsBlock, PACE_TONE, td, tdDash, th } from "../hubUi";

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
    return <span style={{ fontSize: "var(--text-label)", color: "var(--color-text-subtle)" }}>{DASH}</span>;
  }
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        width: 110,
        height: 8,
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid var(--color-border)",
      }}
    >
      {shares.map((s) => (
        <span
          key={s.channel}
          style={{
            width: `${s.frac * 100}%`,
            background: CHANNEL_COLORS[s.channel as keyof typeof CHANNEL_COLORS],
          }}
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
      <HubPageHeader surface={surface} />
      <Panel
        title={`Markets vs ${target || QUALIFIED_TARGET_PER_MARKET_PER_MONTH} Qualified`}
        right={
          <Meta>
            {tfLabel} · {SNAPSHOT_LABEL} ·{" "}
            {firstTouch ? "first touch (unavailable)" : "mix = last touch"}
          </Meta>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Market</th>
                <th style={{ ...th, textAlign: "right" }}>Qualified</th>
                <th style={{ ...th, textAlign: "right" }}>Target</th>
                <th style={th}>Pace</th>
                <th style={{ ...th, textAlign: "right" }}>Closed</th>
                <th style={{ ...th, textAlign: "right" }}>Close rate</th>
                <th style={{ ...th, textAlign: "right" }}>Revenue</th>
                <th style={th}>Channel mix</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <Link
                      href={`/marketing/report?${linkQuery}`}
                      style={{ color: "var(--color-text)", fontWeight: 600, textDecoration: "none" }}
                      title="Open the Report grid"
                    >
                      {r.label}
                    </Link>
                    {r.sub && (
                      <div style={{ fontSize: "var(--text-label)", color: SUBTLE, marginTop: 1 }}>{r.sub}</div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: r.qualified ? 600 : 400, color: r.qualified ? "var(--color-text)" : SUBTLE, fontVariantNumeric: "tabular-nums" }}>
                    {r.qualified}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                    {r.key === OTHER_MARKETS_KEY ? DASH : target || DASH}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {r.pace ? (
                      <span style={{ fontSize: "var(--text-label)", fontWeight: 700, color: PACE_TONE[r.pace.state] }}>
                        {paceSentence(r.pace)}
                      </span>
                    ) : (
                      <span style={{ fontSize: "var(--text-label)", color: SUBTLE }}>{DASH}</span>
                    )}
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
                  <td style={firstTouch ? tdDash : td}>
                    {firstTouch ? DASH : <MixBar shares={r.mix} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0", lineHeight: 1.6 }}>
          Mix segments use the fixed channel colours ({CHANNEL_LABELS.direct.toLowerCase()} ={" "}
          grey = unattributed). Market names open the Report grid with this timeframe.
        </p>
        <DefinitionsNote />
      </Panel>

      {/* ── notes per market — claimed context beside the measured numbers ── */}
      <div style={{ marginTop: "var(--space-4)" }}>
        <Panel title="Market notes" right={<Meta>logged · author and date on every line</Meta>}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            {MARKETS.map((m) => (
              <div key={m.slug}>
                <div
                  style={{
                    fontFamily: "var(--font-family-sans)",
                    fontSize: "var(--text-small)",
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  {m.name}
                </div>
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
