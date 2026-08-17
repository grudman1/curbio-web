"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  monthLabel,
  parseAttribution,
  parseTimeframe,
  timeframeParam,
  type AttributionMode,
} from "./timeframe";

// The two controls that govern every Hub screen at once: the timeframe and
// the attribution mode. They live in the layout header — one timeframe on
// screen at a time, never a per-page override. Both write to the URL
// (?t=…&a=…) with replace(), so flipping them never grows history and every
// screen state is a shareable link.

/** Small segmented control — the Report grid's pattern, shared. */
export function Seg<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "inline-flex",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-pill)",
        overflow: "hidden",
        flex: "none",
      }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            style={{
              fontFamily: "var(--font-family-sans)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.02em",
              padding: "5px 12px",
              border: 0,
              cursor: "pointer",
              background: active ? "var(--color-text)" : "transparent",
              color: active ? "var(--color-surface-raised, #fff)" : "var(--color-text-muted)",
              transition: "background var(--duration-base) ease-out",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function HubControls({ months }: { /** Ascending "YYYY-MM" with data. */ months: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tf = parseTimeframe(searchParams.get("t") ?? undefined, months);
  const mode = parseAttribution(searchParams.get("a") ?? undefined);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const monthOptions = [...months].reverse();

  return (
    <>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-family-sans)",
            fontSize: "var(--text-micro)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-text-subtle)",
          }}
        >
          Timeframe
        </span>
        <select
          value={timeframeParam(tf)}
          onChange={(e) => setParam("t", e.target.value)}
          style={{
            fontFamily: "var(--font-family-sans)",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-pill)",
            padding: "5px 10px",
            background: "var(--color-surface-raised)",
            cursor: "pointer",
            maxWidth: 170,
          }}
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
          <option value="3m">Last 3 months</option>
          <option value="12m">Last 12 months</option>
          <option value="ytd">YTD</option>
        </select>
      </label>
      <Seg<AttributionMode>
        label="Attribution"
        options={[
          { key: "last", label: "Last touch" },
          { key: "first", label: "First touch" },
        ]}
        value={mode}
        onChange={(k) => setParam("a", k === "last" ? null : k)}
      />
    </>
  );
}
