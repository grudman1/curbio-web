"use client";

import { useState } from "react";
import { CHANNEL_COLORS, type Channel } from "@/lib/channels";
import { CHANNEL_FUNNEL_ORDER, CHANNEL_LABELS } from "@/config/marketingHub";
import { MUTED, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { monthShort } from "./timeframe";

// Qualified per month, stacked by channel — the Hub's one tall chart. Hand-
// rolled SVG: bars are rects, the legend is the fixed channel colour map from
// lib/channels.ts, and hovering (or focusing, or tapping) a bar shows that
// month's channel breakdown in the panel beside the chart. No gradients, no
// animation beyond a sub-200ms opacity ease.

export type TrendMonth = {
  ym: string;
  /** channel → Qualified count. Absent channel = zero. */
  byChannel: Partial<Record<Channel, number>>;
  total: number;
};

const CHART_H = 190;
const BAR_GAP = 10;
const AXIS_H = 20;

export function TrendChart({ months }: { months: TrendMonth[] }) {
  const [active, setActive] = useState<string | null>(null);

  if (months.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: MUTED, margin: 0 }}>
        No months with Qualified data yet — this chart fills from the app sync.
      </p>
    );
  }

  const max = Math.max(...months.map((m) => m.total), 1);
  const W = 720;
  const barW = (W - BAR_GAP * (months.length - 1)) / months.length;
  const activeMonth = months.find((m) => m.ym === active) ?? null;

  // Channels that appear anywhere, in funnel order — the legend and stacking
  // order, identical in every chart.
  const present = CHANNEL_FUNNEL_ORDER.filter((c) => months.some((m) => (m.byChannel[c] ?? 0) > 0));

  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 460px", minWidth: 320 }}>
        <svg
          viewBox={`0 0 ${W} ${CHART_H + AXIS_H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          role="img"
          aria-label="Qualified per month, stacked by channel"
        >
          {months.map((m, i) => {
            const x = i * (barW + BAR_GAP);
            const isActive = active === m.ym;
            let y = CHART_H;
            const segs = CHANNEL_FUNNEL_ORDER.flatMap((c) => {
              const v = m.byChannel[c] ?? 0;
              if (v === 0) return [];
              const h = (v / max) * (CHART_H - 24);
              y -= h;
              return [{ c, v, y, h }];
            });
            return (
              <g
                key={m.ym}
                tabIndex={0}
                role="button"
                aria-label={`${monthShort(m.ym)}: ${m.total} Qualified — show breakdown`}
                onMouseEnter={() => setActive(m.ym)}
                onFocus={() => setActive(m.ym)}
                onClick={() => setActive(m.ym)}
                style={{
                  cursor: "pointer",
                  opacity: active === null || isActive ? 1 : 0.55,
                  transition: "opacity 150ms ease-out",
                  outline: "none",
                }}
              >
                {/* hit area */}
                <rect x={x} y={0} width={barW} height={CHART_H} fill="transparent" />
                {segs.map((s) => (
                  <rect key={s.c} x={x} y={s.y} width={barW} height={s.h} fill={CHANNEL_COLORS[s.c]} />
                ))}
                {/* total above the bar */}
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-family-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    fill: "var(--color-text-muted)",
                  }}
                >
                  {m.total}
                </text>
                <text
                  x={x + barW / 2}
                  y={CHART_H + 14}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-family-sans)",
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 400,
                    fill: isActive ? "var(--color-text)" : "var(--color-text-subtle)",
                  }}
                >
                  {monthShort(m.ym)}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke="var(--color-border)" />
        </svg>

        {/* legend — one fixed colour per channel, same order everywhere */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
          {present.map((c) => (
            <span
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-family-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: MUTED,
              }}
            >
              <span
                aria-hidden
                style={{ width: 9, height: 9, borderRadius: 2, background: CHANNEL_COLORS[c], flex: "none" }}
              />
              {CHANNEL_LABELS[c]}
            </span>
          ))}
        </div>
      </div>

      {/* breakdown panel for the hovered / focused month */}
      <div style={{ flex: "0 1 200px", minWidth: 170 }}>
        {activeMonth ? (
          <div>
            <p
              style={{
                fontFamily: "var(--font-family-sans)",
                fontSize: "var(--text-micro)",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: SUBTLE,
                margin: "0 0 8px",
              }}
            >
              {monthShort(activeMonth.ym)} {activeMonth.ym.slice(0, 4)} · {activeMonth.total} Qualified
            </p>
            {CHANNEL_FUNNEL_ORDER.filter((c) => (activeMonth.byChannel[c] ?? 0) > 0).map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "3px 0",
                  fontFamily: "var(--font-family-sans)",
                  fontSize: "var(--text-label)",
                  color: "var(--color-text)",
                }}
              >
                <span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: CHANNEL_COLORS[c], flex: "none" }} />
                <span style={{ flex: 1, color: MUTED }}>{CHANNEL_LABELS[c]}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {activeMonth.byChannel[c]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-label)", color: SUBTLE, margin: 0, lineHeight: 1.6 }}>
            Hover or tap a bar for that month&apos;s channel breakdown.
          </p>
        )}
      </div>
    </div>
  );
}
