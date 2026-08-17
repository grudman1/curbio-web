// ─────────────────────────────────────────────────────────────────────────────
// The Executive review — everything mapped, on one screen, legible to someone
// who has never opened any other page. Projected and read for ten minutes
// once a month, so: nothing on this page requires interaction to be
// understood. No toggles, no drill-downs, no attribution switches — those
// stay in the operator pages.
//
// Server component shared by /marketing/executive (operator chrome, editable
// agenda) and the tokened share route (no sidebar, larger type, read-only).
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
import { Meta, MUTED, Panel, SUBTLE, eyebrow } from "@/app/(site)/admin/(dashboard)/ui";
import { monthLabelFull, monthShort } from "../timeframe";
import { DASH } from "../hubUi";
import { NotesEditor } from "./NotesEditor";

const num: React.CSSProperties = {
  fontFamily: "var(--font-family-serif)",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  lineHeight: 1,
  color: "var(--color-text)",
};

const noteProse: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  margin: 0,
  lineHeight: 1.65,
  whiteSpace: "pre-wrap",
};

function Arrow({ delta }: { delta: number }) {
  const glyph = delta > 0 ? "▲" : delta < 0 ? "▼" : "→";
  const tone = delta > 0 ? "var(--color-state-success)" : delta < 0 ? "var(--color-state-error)" : SUBTLE;
  return (
    <span aria-label={`${delta > 0 ? "up" : delta < 0 ? "down" : "flat"} vs last month`} style={{ color: tone, fontSize: 10 }}>
      {glyph} {delta > 0 ? `+${delta}` : delta}
    </span>
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

  const headlineSize = share ? 40 : 30;

  return (
    <div style={share ? { fontSize: 17 } : undefined}>
      {/* ── 1. the headline — one sentence, no chart above it ── */}
      <section style={{ margin: "0 0 var(--space-8)" }}>
        <p
          style={{
            fontFamily: "var(--font-family-serif)",
            fontSize: headlineSize,
            fontWeight: 600,
            letterSpacing: "var(--tracking-heading)",
            lineHeight: 1.25,
            color: "var(--color-text)",
            margin: 0,
            maxWidth: "26em",
          }}
        >
          In {monthName.split(" ")[0]}, Curbio produced {companyQ} qualified lead
          {companyQ === 1 ? "" : "s"} across {MARKETS.length} markets against a target of{" "}
          {companyTarget}.
        </p>
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 17 : "var(--text-body)", color: MUTED, margin: "14px 0 0" }}>
          <strong style={{ ...num, fontSize: share ? 26 : 22 }}>{companyQ}</strong> of{" "}
          {companyTarget} — {companyTarget - companyQ} short.
          {otherQ > 0 && ` (+${otherQ} in app markets without landing pages, outside the target.)`}
        </p>
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "10px 0 0" }}>
          {monthName} · {SNAPSHOT_LABEL}
        </p>
      </section>

      {/* ── 2. market scorecard — the table the meeting is about ── */}
      <section style={{ margin: "0 0 var(--space-8)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
          <p style={{ ...eyebrow }}>Markets, worst gap first</p>
          <Meta>target {target} each · arrow vs {prevMonth ? monthShort(prevMonth) : "last month"}</Meta>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Market", "Qualified", "Target", "Gap", "Close rate", "Revenue", "vs last"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      fontFamily: "var(--font-family-sans)",
                      fontSize: "var(--text-micro)",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: SUBTLE,
                      textAlign: i === 0 ? "left" : "right",
                      padding: "0 0 8px 16px",
                      paddingLeft: i === 0 ? 0 : 16,
                      borderBottom: "1px solid var(--color-border)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scorecard.map((r) => (
                <tr key={r.name}>
                  <td style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)", fontFamily: "var(--font-family-sans)", fontSize: share ? 16 : "var(--text-small)", fontWeight: 600 }}>
                    {r.name}
                  </td>
                  <td style={{ padding: "10px 0 10px 16px", borderBottom: "1px solid var(--color-border)", textAlign: "right", fontFamily: "var(--font-family-sans)", fontVariantNumeric: "tabular-nums", fontSize: share ? 16 : "var(--text-small)", fontWeight: 700 }}>
                    {r.qualified}
                  </td>
                  <td style={{ padding: "10px 0 10px 16px", borderBottom: "1px solid var(--color-border)", textAlign: "right", fontFamily: "var(--font-family-sans)", fontVariantNumeric: "tabular-nums", fontSize: share ? 15 : "var(--text-small)", color: MUTED }}>
                    {target}
                  </td>
                  <td style={{ padding: "10px 0 10px 16px", borderBottom: "1px solid var(--color-border)", textAlign: "right", fontFamily: "var(--font-family-sans)", fontVariantNumeric: "tabular-nums", fontSize: share ? 16 : "var(--text-small)", fontWeight: 700, color: r.gap > 0 ? "var(--color-state-error)" : "var(--color-state-success)" }}>
                    {r.gap > 0 ? `−${r.gap}` : `+${-r.gap}`}
                  </td>
                  <td style={{ padding: "10px 0 10px 16px", borderBottom: "1px solid var(--color-border)", textAlign: "right", fontFamily: "var(--font-family-sans)", fontVariantNumeric: "tabular-nums", fontSize: share ? 15 : "var(--text-small)", color: MUTED }}>
                    {r.qualified ? `${Math.round((r.closed / r.qualified) * 100)}%` : DASH}
                  </td>
                  <td style={{ padding: "10px 0 10px 16px", borderBottom: "1px solid var(--color-border)", textAlign: "right", fontFamily: "var(--font-family-sans)", fontVariantNumeric: "tabular-nums", fontSize: share ? 15 : "var(--text-small)", color: r.revenue ? "var(--color-text)" : SUBTLE }}>
                    {r.revenue ? `$${Math.round(r.revenue).toLocaleString("en-US")}` : "$0"}
                  </td>
                  <td style={{ padding: "10px 0 10px 16px", borderBottom: "1px solid var(--color-border)", textAlign: "right", fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", whiteSpace: "nowrap" }}>
                    {r.delta === null ? <span style={{ color: SUBTLE }}>{DASH}</span> : <Arrow delta={r.delta} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {otherQ > 0 && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "8px 0 0" }}>
            {OTHER_MARKETS_LABEL}: {otherQ} Qualified — app markets without landing pages,
            no target.
          </p>
        )}
      </section>

      {/* ── 3. what produced them ── */}
      <section style={{ margin: "0 0 var(--space-8)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
          <p style={{ ...eyebrow }}>What produced them</p>
          <Meta>last touch · all app markets · unattributed broken out</Meta>
        </div>
        {totalWithOther === 0 ? (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
            No Qualified leads in {monthName}.
          </p>
        ) : (
          <>
            <div aria-hidden style={{ display: "flex", height: 26, borderRadius: 6, overflow: "hidden", border: "1px solid var(--color-border)" }}>
              {byChannel
                .filter((r) => r.q > 0)
                .map((r) => (
                  <span key={r.channel} title={`${CHANNEL_LABELS[r.channel]}: ${r.q}`} style={{ width: `${(r.q / totalWithOther) * 100}%`, background: CHANNEL_COLORS[r.channel] }} />
                ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8 }}>
              {byChannel
                .filter((r) => r.q > 0)
                .map((r) => (
                  <span key={r.channel} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-family-sans)", fontSize: share ? 13 : 11.5, fontWeight: 600, color: MUTED }}>
                    <span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: CHANNEL_COLORS[r.channel], flex: "none" }} />
                    {r.channel === "direct" ? "Unattributed" : CHANNEL_LABELS[r.channel]} {r.q}
                  </span>
                ))}
            </div>
            <p style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 15 : "var(--text-small)", color: "var(--color-text)", margin: "12px 0 0", lineHeight: 1.6, maxWidth: 700 }}>
              <strong>{Math.round((unattributed / totalWithOther) * 100)}% is unattributed</strong> —
              {" "}{unattributed} of {totalWithOther} arrived with no UTM, no first-touch cookie,
              and no tracked phone number. We do not know what produced them.
            </p>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginTop: 14 }}>
              <div>
                <p style={{ ...eyebrow, marginBottom: 6 }}>Grew most{prevMonth ? ` vs ${monthShort(prevMonth)}` : ""}</p>
                {grew.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0 }}>no attributed channel grew</p>
                ) : (
                  grew.map((g) => (
                    <p key={g.channel} style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 15 : "var(--text-small)", margin: "2px 0", color: "var(--color-text)" }}>
                      {CHANNEL_LABELS[g.channel]} <strong>+{g.delta}</strong> ({g.prevQ} → {g.q})
                    </p>
                  ))
                )}
              </div>
              <div>
                <p style={{ ...eyebrow, marginBottom: 6 }}>Shrank most{prevMonth ? ` vs ${monthShort(prevMonth)}` : ""}</p>
                {shrank.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0 }}>no attributed channel shrank</p>
                ) : (
                  shrank.map((g) => (
                    <p key={g.channel} style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 15 : "var(--text-small)", margin: "2px 0", color: "var(--color-text)" }}>
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
      <section style={{ margin: "0 0 var(--space-8)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
          <p style={{ ...eyebrow }}>Funnel — is it a lead problem or a closing problem</p>
          <Meta>{monthName}{prevMonth ? ` beside ${monthShort(prevMonth)}` : ""} · all app markets</Meta>
        </div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: 8, minWidth: 560 }}>
            {stages.map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: share ? "14px 18px" : "10px 14px", flex: 1, background: "var(--color-surface-raised)" }}>
                  <div style={{ ...num, fontSize: share ? 30 : 24, color: s.cur === null ? SUBTLE : "var(--color-text)" }}>
                    {s.cur ?? DASH}
                  </div>
                  <div style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 13 : "var(--text-label)", color: MUTED, marginTop: 4, whiteSpace: "nowrap" }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 12 : "var(--text-micro)", color: SUBTLE, marginTop: 3 }}>
                    {prevMonth ? `${monthShort(prevMonth)}: ${s.prev ?? DASH}` : ""}
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <div style={{ flex: "none", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 13 : "var(--text-label)", fontWeight: 700, color: "var(--color-text)" }}>
                      {conv(s.cur, stages[i + 1].cur)}
                    </div>
                    <div style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 11 : "var(--text-micro)", color: SUBTLE }}>
                      {prevMonth ? conv(s.prev, stages[i + 1].prev) : ""}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "10px 0 0", lineHeight: 1.6 }}>
          Cumulative reached-at-least counts; Closed = status Won only. Engaged has no
          wired source yet and renders an em-dash, never a zero.
        </p>
      </section>

      {/* ── 5. initiatives ── */}
      <section style={{ margin: "0 0 var(--space-8)" }}>
        <p style={{ ...eyebrow, marginBottom: "var(--space-3)" }}>Initiatives</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
          <Panel title="Partners" right={<Meta>vs ${COST_PER_MEETING_TARGET_USD} per meeting</Meta>}>
            <div style={{ display: "flex", gap: 28 }}>
              <div>
                <div style={{ ...num, fontSize: 26, color: SUBTLE }}>{DASH}</div>
                <div style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, marginTop: 5 }}>meetings booked</div>
              </div>
              <div>
                <div style={{ ...num, fontSize: 26, color: SUBTLE }}>{DASH}</div>
                <div style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, marginTop: 5 }}>cost per meeting</div>
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "10px 0 0", lineHeight: 1.5 }}>
              No on-track read until the meeting log and spend entry exist.
            </p>
          </Panel>
          <Panel title="Events" right={<Meta>vs ${COST_PER_ATTENDEE_TARGET_USD} per attendee</Meta>}>
            <div style={{ display: "flex", gap: 28 }}>
              <div>
                <div style={{ ...num, fontSize: 26, color: SUBTLE }}>{DASH}</div>
                <div style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, marginTop: 5 }}>events held</div>
              </div>
              <div>
                <div style={{ ...num, fontSize: 26, color: SUBTLE }}>{DASH}</div>
                <div style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, marginTop: 5 }}>cost per attendee</div>
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "10px 0 0", lineHeight: 1.5 }}>
              No on-track read until the event log and spend entry exist.
            </p>
          </Panel>
          <Panel title="Outreach" right={<Meta>target {OUTREACH_WEEKLY_MAILINGS_TARGET} mailings · {OUTREACH_WEEKLY_CALLS_TARGET} calls / HSM / wk</Meta>}>
            <div style={{ display: "flex", gap: 28 }}>
              <div>
                <div style={{ ...num, fontSize: 26, color: SUBTLE }}>{DASH}</div>
                <div style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, marginTop: 5 }}>cadence kept</div>
              </div>
              <div>
                <div style={{ ...num, fontSize: 26, color: SUBTLE }}>{DASH}</div>
                <div style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: MUTED, marginTop: 5 }}>meetings booked</div>
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "10px 0 0", lineHeight: 1.5 }}>
              No on-track read until the mailing log exists.
            </p>
          </Panel>
        </div>
      </section>

      {/* ── 6. the agenda: wins · concerns · decisions ── */}
      <section style={{ margin: "0 0 var(--space-8)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
          <p style={{ ...eyebrow }}>Wins · Concerns · Decisions needed</p>
          {notes?.updatedAt && <Meta>written {notes.updatedAt.slice(0, 10)}</Meta>}
        </div>
        {editable ? (
          <NotesEditor month={month} initial={notes} />
        ) : (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            {(
              [
                ["Wins", notes?.wins],
                ["Concerns", notes?.concerns],
                ["Decisions needed", notes?.decisions],
              ] as const
            ).map(([label, text]) => (
              <div key={label}>
                <p style={{ ...eyebrow, marginBottom: 6 }}>{label}</p>
                {text ? (
                  <p style={{ ...noteProse, fontSize: share ? 16 : "var(--text-small)" }}>{text}</p>
                ) : (
                  <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0 }}>
                    Not written for {monthName}.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 7. definitions — always printed, never a tooltip ── */}
      <section>
        <p style={{ ...eyebrow, marginBottom: 8 }}>Definitions</p>
        <p style={{ fontFamily: "var(--font-family-sans)", fontSize: share ? 15 : "var(--text-small)", color: MUTED, margin: 0, lineHeight: 1.7, maxWidth: 700 }}>
          {QUALIFIED_DEFINITION} {ENGAGED_DEFINITION} Engaged is never added into a
          Qualified number, on any screen.
        </p>
      </section>
    </div>
  );
}
