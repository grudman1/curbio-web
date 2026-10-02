"use client";

import { Fragment, useEffect, useState } from "react";

// Days : hours : minutes : seconds until the drawing — and it ticks.
//
// ── Why it starts as dashes ─────────────────────────────────────────────────
// The page is prerendered, so any number baked into the HTML would be the time
// remaining when the page was BUILT: wrong for every visitor, and a hydration
// mismatch on top. The server therefore renders a stable placeholder — the same
// width as the real digits, so nothing shifts — and the first effect, a frame
// after the page hydrates, swaps in the real value and starts the clock.
//
// ── How it ticks ────────────────────────────────────────────────────────────
// Each tick schedules the next for just after the next whole second on the
// visitor's own clock, rather than "in 1000 ms" from now: an interval drifts,
// and the seconds digit would visibly stutter and skip. It also re-reads the
// clock the moment the tab is shown again (a phone put down and picked up) so
// the numbers are never a stale minute old.
//
// Seconds are rounded UP, so the display reads 00:00:00:00 at the deadline —
// not a second early, which is what rounding down does.
//
// It stops at zero. What the page does THEN — switching to its closed state, no
// reload — is GiveawayShell's job, off the same clock, a quarter of a second
// later; this only has to show 00:00:00:00 until that happens.
//
// role="timer" is implicitly aria-live="off": a screen reader is not told
// about every second, only reads the time when it reaches the element.

const pad = (n: number) => String(n).padStart(2, "0");

const UNITS = [
  ["Days", 86_400],
  ["Hours", 3_600],
  ["Mins", 60],
  ["Secs", 1],
] as const;

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const end = Date.parse(target);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= end) return;
      timer = setTimeout(tick, 1000 - (t % 1000) + 15);
    };
    const wake = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      tick();
    };

    tick();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pageshow", wake);
    };
  }, [target]);

  // Whole seconds, rounded UP: with 0.4 s left it still reads 1, so the display
  // shows 00:00:00:00 at the deadline and not a second before it.
  let remaining = now === null ? null : Math.ceil(Math.max(0, Date.parse(target) - now) / 1000);
  const parts: { label: string; value: string }[] = [];
  for (const [label, size] of UNITS) {
    if (remaining === null) {
      parts.push({ label, value: "––" });
    } else {
      const whole = Math.floor(remaining / size);
      remaining -= whole * size;
      parts.push({ label, value: pad(whole) });
    }
  }

  return (
    <div role="timer" aria-label="Time until the drawing" className="flex w-full max-w-[380px] items-start justify-between">
      {parts.map((p, i) => (
        <Fragment key={p.label}>
          {i > 0 && (
            <span className="font-serif text-[clamp(24px,7vw,34px)] leading-[1.15] text-accent" aria-hidden>
              :
            </span>
          )}
          <div className="flex min-w-[42px] flex-col items-center">
            <span className="font-serif text-[clamp(30px,9vw,44px)] font-semibold leading-none tabular-nums text-content">
              {p.value}
            </span>
            <span className="mt-1.5 font-sans text-micro font-black uppercase tracking-[0.14em] text-content-muted">
              {p.label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
