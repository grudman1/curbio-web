"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { grainFor } from "@/config/adminNav";
import { InfoPopover } from "./InfoPopover";
import { Icon } from "./Icon";
import { SegmentedControl } from "./SegmentedControl";
import {
  monthLabel,
  monthShort,
  parseAttribution,
  parseTimeframe,
  timeframeLabel,
  timeframeParam,
  type AttributionMode,
} from "./timeframe";

// The controls that govern EVERY screen: timeframe and attribution mode. They
// live in the header, never on a page — one timeframe on screen at a time.
// Both write to the URL with replace(), so flipping them never grows history
// and every screen state is a shareable link.
//
// The timeframe control RENDERS THE OPTIONS VALID FOR THE CURRENT SCREEN.
// A month-grain screen does not offer 7d, because it cannot answer at that
// resolution — offering it and then quietly coercing would be the kind of
// silent wrongness this codebase avoids. Arriving with ?t=7d from a day-grain
// screen still coerces (the URL is shareable and must not break), and the
// screen says so in one line.

const DAY_PRESETS = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
] as const;

const RANGE_PRESETS = [
  { key: "3m", label: "Last 3 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "ytd", label: "Year to date" },
] as const;

export function Timeframe({ months }: { months: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const grain = grainFor(pathname);
  const tf = parseTimeframe(searchParams.get("t") ?? undefined, months, grain);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Viewport coordinates for the portalled panel. Null until measured, so the
  // panel never paints at 0,0 for a frame before it is positioned.
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);

  const current = timeframeParam(tf);

  // ── Why this is a PORTAL and not an absolutely-positioned child ───────────
  // The trigger lives inside the header's control strip, which is
  // `overflow-x-auto` so the controls can scroll on narrow screens. Per CSS,
  // a non-visible overflow on one axis forces the other axis to compute to
  // `auto` too — so that strip clipped the dropdown VERTICALLY, and the panel
  // opened into a hidden region. It was rendering correctly the whole time and
  // simply could not be seen. No z-index could fix that; only leaving the
  // clipping container can. The panel therefore renders into document.body
  // with fixed coordinates measured from the trigger.
  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const W = 248;
    setAt({
      top: r.bottom + 6,
      // Keep the panel on screen when the trigger sits near the right edge.
      left: Math.max(8, Math.min(r.left, window.innerWidth - W - 8)),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      // The panel is no longer a DOM descendant of the trigger, so an
      // outside-click test has to consider both.
      if (!rootRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    // Fixed coordinates go stale when the page moves underneath them.
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // Focus moves into the panel on open so it is reachable from the keyboard,
  // and returns to the trigger on close (handled at each close site).
  useEffect(() => {
    if (open && at) popRef.current?.querySelector("button")?.focus();
  }, [open, at]);

  function set(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("t", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
    btnRef.current?.focus();
  }

  // Months grouped by year, newest year first, for the grid.
  const byYear = new Map<string, string[]>();
  for (const m of months) {
    const y = m.slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), m]);
  }
  const years = [...byYear.keys()].sort().reverse();

  const option = (key: string, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => set(key)}
      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border-0 px-2.5 py-1.5 text-left font-sans text-ops-body transition-colors duration-fast ease-out ${
        current === key ? "bg-app-well font-semibold text-content" : "bg-transparent text-content-muted hover:bg-app-well hover:text-content"
      }`}
    >
      {label}
      {current === key && <Icon name="check" size={12} className="flex-none text-content" />}
    </button>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
        className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-nav3-border bg-app-card px-2.5 py-2 font-sans text-[13px] font-medium text-nav3-hover-text transition-colors duration-fast ease-out hover:bg-app-well focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <Icon name="calendar" size={13} className="text-nav3-gray-400" />
        {timeframeLabel(tf, months)}
        <Icon name="chevron-down" size={11} className="text-nav3-gray-400" />
      </button>

      {open && at !== null &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Select timeframe"
            style={{ position: "fixed", top: at.top, left: at.left, zIndex: 200 }}
            className="w-[248px] rounded-lg border border-app-border bg-app-card p-1.5 shadow-app-pop motion-safe:animate-[pop-in_120ms_var(--easing-out)] motion-reduce:animate-none">
          {grain === "day" && (
            <>
              {DAY_PRESETS.map((p) => option(p.key, p.label))}
              <div className="mx-1 my-1.5 border-t border-app-border" />
            </>
          )}

          {years.map((y) => (
            <div key={y} className="px-1 pb-1.5 pt-1">
              <p className="m-0 mb-1 px-1.5 font-sans text-ops-micro font-bold uppercase text-content-subtle">{y}</p>
              <div className="grid grid-cols-4 gap-1">
                {byYear.get(y)!.map((m) => (
                  <button
                    key={m}
                    type="button"
                    title={monthLabel(m)}
                    onClick={() => set(m)}
                    className={`cursor-pointer rounded-md border-0 px-0 py-1.5 text-center font-sans text-ops-label transition-colors duration-fast ease-out ${
                      current === m
                        ? "bg-brand font-bold text-content-inverse"
                        : "bg-transparent font-semibold text-content-muted hover:bg-app-well hover:text-content"
                    }`}
                  >
                    {monthShort(m)}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mx-1 my-1.5 border-t border-app-border" />
          {RANGE_PRESETS.map((p) => option(p.key, p.label))}
          </div>,
          document.body
        )}
    </div>
  );
}

// First-touch vs last-touch is an ANALYSIS control, not a global one. Only two
// screens can answer differently depending on it, so only those two show it —
// on Home (a briefing) it was a knob with nothing to turn.
const ATTRIBUTION_SCREENS = ["/admin/performance", "/admin/attribution"];

export function AttributionToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = parseAttribution(searchParams.get("a") ?? undefined);

  if (!ATTRIBUTION_SCREENS.some((p) => pathname.startsWith(p))) return null;

  function set(k: AttributionMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (k === "last") params.delete("a");
    else params.set("a", k);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <span className="inline-flex flex-none items-center gap-1.5">
      <SegmentedControl
        label="Attribution mode"
        value={mode}
        onChange={set}
        options={[
          { key: "first", label: "First-touch", shortLabel: "First" },
          { key: "last", label: "Last-touch", shortLabel: "Last" },
        ]}
      />
      {/* The first-vs-last explanation lives HERE — on the control that raises
          the question — rather than as a paragraph on every screen that happens
          to show attributed numbers. */}
      <InfoPopover label="First-touch vs last-touch" align="right">
        <p className="m-0 mb-2">
          <strong className="font-bold text-content">Last touch</strong> credits the channel of the
          final visit before the event — the channel that closed.
        </p>
        <p className="m-0 mb-2">
          <strong className="font-bold text-content">First touch</strong> credits the channel that
          introduced the contact — the channel that opened.
        </p>
        <p className="m-0">
          They disagree whenever one channel opens a relationship and another closes it. The app&apos;s
          first-touch fields are empty today, so first-touch views render em-dashes rather than
          guesses.
        </p>
      </InfoPopover>
    </span>
  );
}
