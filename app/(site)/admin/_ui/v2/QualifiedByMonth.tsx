"use client";

import { useState } from "react";
import type { Channel } from "@/lib/channels";
import { CHANNEL_INK } from "./channelViz";

// Qualified per month, stacked by attribution, with the focused month's
// breakdown beside it.
//
// HOVER *AND* CLICK set the focus, and the columns are real <button>s, so the
// breakdown is reachable by keyboard and on touch — where hover does not
// exist — without a second affordance. Nothing tells the reader to hover: the
// bars respond, and the panel is already populated with the latest month on
// arrival, so the interaction is discovered by using it rather than by
// reading an instruction.
//
// The legend carries the channel names. That is the whole explanation budget
// for this chart — a caption saying which band is which would be repeating
// the legend in prose.

export type TrendMonth = {
  ym: string;
  /** Axis label — "Aug". */
  label: string;
  /** Heading for the breakdown panel when this column is focused —
   *  "August 2026". Precomputed on the server: this is a Client Component, so
   *  a formatter FUNCTION cannot cross the boundary, and every label it would
   *  have produced is known at render time anyway. */
  breakdownTitle: string;
  byChannel: Partial<Record<Channel, number>>;
  total: number;
};

/** A channel and the name to print for it. Same reason as above — the label
 *  arrives as data, not as a `labelFor` callback. */
export type ChannelLegend = { channel: Channel; label: string };

const CHART_H = 200;

export function QualifiedByMonth({
  months,
  channels,
}: {
  months: TrendMonth[];
  /** Channels present anywhere in the series, in stacking + legend order. */
  channels: ChannelLegend[];
}) {
  const last = months.length - 1;
  const [focus, setFocus] = useState(last);

  if (months.length === 0) return null;

  const active = months[Math.min(focus, last)] ?? months[last];
  const max = Math.max(...months.map((m) => m.total), 1);

  return (
    <div className="mt-3.5 flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-end gap-2.5 border-b border-ui2-border" style={{ height: CHART_H }}>
          {months.map((m, i) => {
            const isActive = i === (focus > last ? last : focus);
            return (
              <button
                key={m.ym}
                type="button"
                onMouseEnter={() => setFocus(i)}
                onFocus={() => setFocus(i)}
                onClick={() => setFocus(i)}
                aria-label={`${m.label}: ${m.total} qualified`}
                aria-pressed={isActive}
                className="flex h-full flex-1 cursor-pointer flex-col justify-end border-0 bg-transparent p-0 transition-opacity duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui2-accent"
                style={{ opacity: isActive ? 1 : 0.62 }}
              >
                <span className="pb-1 text-center font-ui2 text-ui2-eyebrow font-bold tabular-nums text-ui2-text-muted">
                  {m.total}
                </span>
                <span
                  className="flex flex-col-reverse overflow-hidden rounded-t-ui2-sm"
                  style={{ height: `${(m.total / max) * 100}%` }}
                >
                  {channels.map(({ channel }) => {
                    const v = m.byChannel[channel] ?? 0;
                    if (v === 0) return null;
                    return (
                      <span
                        key={channel}
                        style={{
                          height: `${(v / m.total) * 100}%`,
                          background: CHANNEL_INK[channel],
                        }}
                      />
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-1.5 flex gap-2.5">
          {months.map((m, i) => (
            <div
              key={m.ym}
              className={`flex-1 text-center font-ui2 text-ui2-eyebrow tabular-nums ${
                i === (focus > last ? last : focus)
                  ? "font-bold text-ui2-text"
                  : "text-ui2-gray-400"
              }`}
            >
              {m.label}
            </div>
          ))}
        </div>

        <ul className="m-0 mt-3.5 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0">
          {channels.map(({ channel, label }) => (
            <li
              key={channel}
              className="inline-flex items-center gap-1.5 font-ui2 text-[11.5px] font-semibold text-ui2-text-muted"
            >
              <Swatch channel={channel} />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-[200px] flex-none border-l border-ui2-divider pl-5">
        <div className="font-ui2 text-ui2-eyebrow font-extrabold uppercase tracking-[0.1em] text-ui2-gray-400">
          {active.breakdownTitle}
        </div>
        <ul className="m-0 mt-1 list-none p-0" aria-live="polite">
          {channels
            .map(({ channel, label }) => ({ channel, label, v: active.byChannel[channel] ?? 0 }))
            .filter((r) => r.v > 0)
            .sort((a, b) => b.v - a.v)
            .map(({ channel, label, v }) => (
              <li key={channel} className="flex items-center gap-2 py-[5px] font-ui2 text-[12.5px]">
                <Swatch channel={channel} />
                <span className="min-w-0 flex-1 truncate text-ui2-text-muted">{label}</span>
                <span className="font-bold tabular-nums text-ui2-text">{v}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

function Swatch({ channel }: { channel: Channel }) {
  return (
    <span
      className="h-[9px] w-[9px] flex-none rounded-[var(--ui2-radius-sm)]"
      style={{ background: CHANNEL_INK[channel] }}
      aria-hidden
    />
  );
}
