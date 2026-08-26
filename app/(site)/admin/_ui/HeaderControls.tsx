"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { grainFor } from "@/config/adminNav";
import { monthLabel, parseAttribution, parseTimeframe, timeframeParam, type AttributionMode } from "./timeframe";

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

export function Timeframe({ months }: { months: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const grain = grainFor(pathname);
  const tf = parseTimeframe(searchParams.get("t") ?? undefined, months, grain);

  function set(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Timeframe</span>
      <select
        value={timeframeParam(tf)}
        onChange={(e) => set("t", e.target.value)}
        className="max-w-[168px] cursor-pointer rounded-pill border border-edge bg-surface-raised px-2.5 py-[5px] font-sans text-ops-label font-bold text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {grain === "day" && (
          <optgroup label="Days">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </optgroup>
        )}
        <optgroup label="Months">
          {[...months].reverse().map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
          <option value="3m">Last 3 months</option>
          <option value="12m">Last 12 months</option>
          <option value="ytd">YTD</option>
        </optgroup>
      </select>
    </label>
  );
}

export function AttributionToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = parseAttribution(searchParams.get("a") ?? undefined);

  function set(k: AttributionMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (k === "last") params.delete("a");
    else params.set("a", k);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div role="group" aria-label="Attribution mode" className="inline-flex flex-none overflow-hidden rounded-pill border border-edge">
      {([
        { key: "first", label: "First-touch", short: "First" },
        { key: "last", label: "Last-touch", short: "Last" },
      ] as const).map((o) => {
        const active = o.key === mode;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => set(o.key)}
            className={`cursor-pointer border-0 px-3 py-[5px] font-sans text-ops-label font-bold transition-colors duration-base ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
              active ? "bg-content text-content-on-accent" : "bg-transparent text-content-muted hover:text-content"
            }`}
          >
            <span className="hidden sm:inline">{o.label}</span>
            <span className="sm:hidden">{o.short}</span>
          </button>
        );
      })}
    </div>
  );
}
