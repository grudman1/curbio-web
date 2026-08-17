// The honest panel. One prominent number — the share of this timeframe's
// Qualified leads with no known channel — labeled plainly, with a 6-month
// line showing whether it is falling. Shrinking this number is the actual
// job; the panel exists to keep it visible every time the page loads.
//
// Server component: pure numbers in, SVG out. Used by Today (compact) and by
// the Attribution health page (detailed, with the raw-source breakdown).

import Link from "next/link";
import {
  aggregateSnapshot,
  directShareByMonth,
  directSourceBreakdown,
  SNAPSHOT_LABEL,
} from "@/config/appLeadsSnapshot";
import { CHANNEL_COLORS } from "@/lib/channels";
import { Meta, MUTED, Panel, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { monthShort } from "./timeframe";
import { DASH, td, th } from "./hubUi";

/** 6-month line of the unattributed share, 0–100% fixed scale so month-to-
 *  month movement reads against the whole range, not a zoomed drama. */
function ShareLine({ points }: { points: { ym: string; share: number }[] }) {
  if (points.length === 0) return null;
  const W = 340;
  const H = 96;
  const padX = 16;
  const padTop = 18;
  const padBottom = 20;
  const step = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const y = (share: number) => padTop + (1 - share) * (H - padTop - padBottom);
  const coords = points.map((p, i) => [padX + i * step, y(p.share)] as const);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 420, height: "auto", display: "block" }} role="img"
      aria-label={`Unattributed share by month: ${points.map((p) => `${monthShort(p.ym)} ${Math.round(p.share * 100)}%`).join(", ")}`}
    >
      {/* 0% and 100% reference lines */}
      <line x1={padX} y1={y(0)} x2={W - padX} y2={y(0)} stroke="var(--color-border)" />
      <line x1={padX} y1={y(1)} x2={W - padX} y2={y(1)} stroke="var(--color-border)" strokeDasharray="2 4" />
      <polyline
        points={coords.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")}
        fill="none"
        stroke={CHANNEL_COLORS.direct}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map(([px, py], i) => (
        <g key={points[i].ym}>
          <circle cx={px} cy={py} r="2.5" fill={CHANNEL_COLORS.direct} />
          <text x={px} y={py - 7} textAnchor="middle" style={{ fontFamily: "var(--font-family-sans)", fontSize: 10.5, fontWeight: 700, fill: "var(--color-text-muted)" }}>
            {Math.round(points[i].share * 100)}%
          </text>
          <text x={px} y={H - 6} textAnchor="middle" style={{ fontFamily: "var(--font-family-sans)", fontSize: 10.5, fill: "var(--color-text-subtle)" }}>
            {monthShort(points[i].ym)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function AttributionHealthPanel({
  months,
  tfLabel,
  detailed = false,
}: {
  /** The header timeframe's months. */
  months: string[];
  tfLabel: string;
  /** True on the Attribution health page: adds the raw-source breakdown. */
  detailed?: boolean;
}) {
  const monthSet = new Set(months);
  const agg = aggregateSnapshot(monthSet);

  // Every cell belongs to exactly one market × channel; sum once.
  let direct = 0;
  let total = 0;
  for (const [cellKey, cell] of Object.entries(agg.cells)) {
    total += cell.qualified;
    if (cellKey.endsWith("|direct")) direct += cell.qualified;
  }
  const share = total > 0 ? direct / total : null;

  const line = directShareByMonth()
    .slice(-6)
    .map(({ ym, direct: d, total: t }) => ({ ym, share: t ? d / t : 0 }));

  const sources = detailed ? directSourceBreakdown(monthSet) : [];

  return (
    <Panel
      title="Attribution health"
      right={
        <Meta>
          {tfLabel} · {SNAPSHOT_LABEL}
        </Meta>
      }
    >
      <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "0 1 300px", minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-family-serif)",
                fontVariantNumeric: "tabular-nums",
                fontSize: 52,
                fontWeight: 600,
                lineHeight: 1,
                color: "var(--color-text)",
              }}
            >
              {share === null ? DASH : `${Math.round(share * 100)}%`}
            </span>
            <span style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: MUTED }}>
              {share === null ? "no Qualified in this timeframe" : `${direct} of ${total} Qualified`}
            </span>
          </div>
          <p
            style={{
              fontFamily: "var(--font-family-sans)",
              fontSize: "var(--text-small)",
              color: "var(--color-text)",
              margin: "12px 0 0",
              lineHeight: 1.6,
              maxWidth: 340,
            }}
          >
            <strong>Unattributed.</strong> These leads arrived with no UTM, no first-touch
            cookie, and no tracked phone number. We do not know what produced them.
          </p>
          {!detailed && (
            <p style={{ margin: "10px 0 0" }}>
              <Link
                href="/marketing/attribution"
                style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", fontWeight: 700, color: "var(--color-text-muted)" }}
              >
                What the app recorded instead →
              </Link>
            </p>
          )}
        </div>
        <div style={{ flex: "1 1 300px", minWidth: 260, maxWidth: 440 }}>
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-micro)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, margin: "0 0 6px" }}>
            Unattributed share, last {line.length} months
          </p>
          <ShareLine points={line} />
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "6px 0 0", lineHeight: 1.5 }}>
            Shrinking this line is the job. It falls when links carry UTMs, printed
            assets point at tracked redirects, and phone leads get tracked numbers.
          </p>
        </div>
      </div>

      {detailed && (
        <div style={{ marginTop: "var(--space-5)" }}>
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-micro)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: SUBTLE, margin: "0 0 8px" }}>
            What the app recorded for these leads
          </p>
          <div style={{ overflowX: "auto", maxWidth: 560 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Raw referral source</th>
                  <th style={{ ...th, textAlign: "right" }}>Leads</th>
                  <th style={th}>What would attribute it</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source}>
                    <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{s.source}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {s.count}
                    </td>
                    <td style={{ ...td, color: MUTED }}>
                      {/^phone/i.test(s.source)
                        ? "a tracked phone number per market / event"
                        : s.source === "(blank)"
                          ? "a form that records its source"
                          : /curbio\.com|landing page|lp/i.test(s.source)
                            ? "UTMs on the link that brought them"
                            : "a documented source mapping (see Links registry)"}
                    </td>
                  </tr>
                ))}
                {sources.length === 0 && (
                  <tr>
                    <td style={{ ...td, color: SUBTLE }} colSpan={3}>
                      No unattributed leads in this timeframe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: "12px 0 0", lineHeight: 1.6 }}>
            These strings say where the form was, not what brought the visitor — which is
            why they map to direct instead of a channel (the conservative rule in
            config/appLeadsSnapshot.ts).
          </p>
        </div>
      )}
    </Panel>
  );
}
