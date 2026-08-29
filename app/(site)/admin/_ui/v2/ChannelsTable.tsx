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
    <section className="ops-card overflow-hidden">
      <div className="ops-card-head">
        <h2 className="ops-card-title">{title}</h2>
        <span className="ops-card-meta">{meta}</span>
      </div>

      {rows.length === 0 ? (
        <p
          className="ops-muted m-0 border-t px-5 py-8 text-center text-[14px]"
          style={{ borderColor: "var(--ops-divider)" }}
        >
          No leads carried a known channel in this window.
        </p>
      ) : (
        <>
          <div className={`${GRID} px-5 pb-2`} style={{ borderColor: "var(--ops-divider)" }}>
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
                className={`ops-th ops-th--${c.align} w-full cursor-pointer border-0 bg-transparent p-0 transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                style={{ color: sort === c.key ? "var(--ops-text)" : undefined }}
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
              className={`${GRID} ops-tbody-row ops-tbody-row--link border-t px-5 py-3 text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]`}
              style={{ borderColor: "var(--ops-divider)" }}
            >
              <span className="flex min-w-0 items-center gap-2.5 font-semibold" style={{ color: "var(--ops-text)" }}>
                <span className="ops-swatch" style={{ background: CHANNEL_INK[r.channel] }} aria-hidden />
                <span className="truncate">{r.label}</span>
              </span>
              <span className="ops-num font-semibold" style={{ color: "var(--ops-text)" }}>{r.qualified}</span>
              <span
                className="ops-num font-semibold"
                style={{
                  color:
                    r.delta === null || r.delta === 0
                      ? "var(--ops-text-subtle)"
                      : r.delta > 0
                        ? "var(--ops-success-700)"
                        : "var(--ops-error-700)",
                }}
              >
                {r.delta === null ? "—" : `${r.delta > 0 ? "+" : r.delta < 0 ? "−" : ""}${Math.abs(r.delta)}`}
              </span>
              <span className="ops-num ops-muted">{r.meetings}</span>
              <span className="ops-num ops-muted">{r.proposals}</span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
