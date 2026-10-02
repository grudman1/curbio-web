"use client";

import { useEffect, useState } from "react";

// Days : hours : minutes until the drawing.
//
// Renders dashes until it has mounted. The page is prerendered, so any number
// baked into the HTML would be the time remaining when the page was BUILT —
// wrong for every visitor, and a hydration mismatch on top. The first real
// value arrives with the first effect, a frame after paint.
//
// Minutes are the smallest unit, so it re-checks every fifteen seconds rather
// than every one: nobody is watching a seconds hand, and a phone at a booth
// has better things to spend battery on.

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  let remaining = now === null ? null : Math.max(0, Date.parse(target) - now);
  const parts: { label: string; value: string }[] = [];
  for (const [label, size] of [
    ["Days", 86_400_000],
    ["Hours", 3_600_000],
    ["Mins", 60_000],
  ] as const) {
    if (remaining === null) {
      parts.push({ label, value: "––" });
    } else {
      const whole = Math.floor(remaining / size);
      remaining -= whole * size;
      parts.push({ label, value: pad(whole) });
    }
  }

  return (
    <div className="flex items-start gap-1.5" role="timer" aria-label="Time until the drawing">
      {parts.map((p, i) => (
        <div key={p.label} className="flex items-start gap-1.5">
          {i > 0 && (
            <span className="font-serif text-[32px] leading-[1.1] text-accent" aria-hidden>
              :
            </span>
          )}
          <div className="flex min-w-[58px] flex-col items-center">
            <span className="font-serif text-[40px] font-semibold leading-none tabular-nums text-content">{p.value}</span>
            <span className="mt-1.5 font-sans text-micro font-black uppercase tracking-[0.14em] text-content-muted">
              {p.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
