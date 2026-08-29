"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel } from "@/lib/channels";
import { CHANNEL_INK } from "./channelViz";

// The attributed-channel table. Sortable on every column, each row a
// click-through to that channel's own screen.
//
// ROWS ARE ATTRIBUTED CHANNELS ONLY. `direct` — the absence of attribution —
// is not a row here, because a grey bar sitting in a ranked list of channels
// reads as a channel that is winning. The header's count states the split
// ("11 attributed of 56 qualified"), which is a measurement rather than a
// caption, and the stacked chart above already shows unattributed at its true
// size. Nothing on this card explains that in a sentence.

export type ChannelRow = {
  channel: Channel;
  label: string;
  href: string;
  qualified: number;
  /** vs the prior period, same day-of-month cut. null = no prior period. */
  delta: number | null;
  meetings: number;
  proposals: number;
};

type SortKey = "label" | "qualified" | "delta" | "meetings" | "proposals";

function columns(deltaLabel: string): { key: SortKey; label: string; align: "left" | "right" }[] {
  return [
    { key: "label", label: "Channel", align: "left" },
    { key: "qualified", label: "Qualified", align: "right" },
    // Names the month it compares against, so the column head carries the
    // comparison and no caption has to.
    { key: "delta", label: deltaLabel, align: "right" },
    { key: "meetings", label: "Meetings", align: "right" },
    { key: "proposals", label: "Proposals", align: "right" },
  ];
}

const GRID = "grid grid-cols-[1.6fr_.7fr_.8fr_.8fr_.8fr] items-center gap-2";

export function ChannelsTable({
  rows,
  title,
  meta,
  deltaLabel,
}: {
  rows: ChannelRow[];
  title: string;
  meta: string;
  /** "vs Jul" — the prior period this table's delta column measures. */
  deltaLabel: string;
}) {
  const router = useRouter();
  const COLUMNS = columns(deltaLabel);
  const [sort, setSort] = useState<SortKey>("qualified");
  const [dir, setDir] = useState<-1 | 1>(-1);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      if (sort === "label") return a.label.localeCompare(b.label) * -dir;
      // A null delta has no position on a numeric axis; park it last in both
      // directions rather than letting it sort as zero, which would claim
      // "no change" about a period we cannot compare.
      if (sort === "delta") {
        if (a.delta === null && b.delta === null) return 0;
        if (a.delta === null) return 1;
        if (b.delta === null) return -1;
        return (a.delta - b.delta) * dir;
      }
      return (a[sort] - b[sort]) * dir;
    });
    return copy;
  }, [rows, sort, dir]);

  function toggle(key: SortKey) {
    if (key === sort) setDir((d) => (d === -1 ? 1 : -1));
    else {
      setSort(key);
      setDir(-1);
    }
  }

  return (
    <section className="overflow-hidden rounded-ui2-card border border-ui2-border bg-ui2-card shadow-ui2-card">
      <div className="flex items-baseline justify-between gap-3 px-5 pb-2.5 pt-3.5">
        <h2 className="m-0 font-ui2 text-ui2-section font-bold text-ui2-text">{title}</h2>
        <span className="font-ui2 text-ui2-caption tabular-nums text-ui2-gray-400">{meta}</span>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 border-t border-ui2-divider px-5 py-6 text-center font-ui2 text-[length:var(--ui2-text-row)] text-ui2-text-muted">
          No leads carried a known channel in this window.
        </p>
      ) : (
        <>
          <div className={`${GRID} px-5 pb-2`}>
            {COLUMNS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => toggle(c.key)}
                // Sort state rides in the accessible NAME, not aria-sort:
                // aria-sort is only meaningful on a columnheader, and these
                // rows are a click-through list rather than an ARIA grid, so
                // scaffolding table roles around them to host one attribute
                // would describe a structure that isn't there. The arrow
                // glyph is aria-hidden and this label says the same thing.
                aria-label={
                  sort === c.key
                    ? `${c.label}, sorted ${dir === -1 ? "descending" : "ascending"}. Activate to reverse.`
                    : `Sort by ${c.label}`
                }
                className={`cursor-pointer border-0 bg-transparent p-0 font-ui2 text-ui2-eyebrow font-extrabold uppercase tracking-[0.08em] transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui2-accent ${
                  c.align === "right" ? "text-right" : "text-left"
                } ${sort === c.key ? "text-ui2-text" : "text-ui2-gray-400 hover:text-ui2-text-muted"}`}
              >
                {c.label}
                {sort === c.key && <span aria-hidden>{dir === -1 ? " ↓" : " ↑"}</span>}
              </button>
            ))}
          </div>

          {sorted.map((r) => (
            <div
              key={r.channel}
              role="link"
              tabIndex={0}
              onClick={() => router.push(r.href)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(r.href);
                }
              }}
              className={`${GRID} cursor-pointer border-t border-ui2-divider px-5 py-2.5 font-ui2 text-ui2-body transition-colors duration-fast ease-out hover:bg-ui2-well focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ui2-accent`}
            >
              <span className="flex min-w-0 items-center gap-2.5 font-semibold text-ui2-text">
                <span
                  className="h-[9px] w-[9px] flex-none rounded-[var(--ui2-radius-sm)]"
                  style={{ background: CHANNEL_INK[r.channel] }}
                  aria-hidden
                />
                <span className="truncate">{r.label}</span>
              </span>
              <span className="text-right font-bold tabular-nums text-ui2-text">{r.qualified}</span>
              <span
                className={`text-right font-bold tabular-nums ${
                  r.delta === null
                    ? "text-ui2-gray-400"
                    : r.delta > 0
                      ? "text-ui2-green"
                      : r.delta < 0
                        ? "text-ui2-red"
                        : "text-ui2-gray-400"
                }`}
              >
                {r.delta === null ? "—" : `${r.delta > 0 ? "+" : r.delta < 0 ? "−" : ""}${Math.abs(r.delta)}`}
              </span>
              <span className="text-right tabular-nums text-ui2-text-muted">{r.meetings}</span>
              <span className="text-right tabular-nums text-ui2-text-muted">{r.proposals}</span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
