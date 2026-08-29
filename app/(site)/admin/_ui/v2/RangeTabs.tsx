"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// A card-level range switcher — the pill-in-a-tray control TailAdmin puts on
// its Analytics chart.
//
// It writes the SAME `?t=` param the header's timeframe control reads, so the
// two are one piece of state rather than two that can disagree. Putting it on
// the card as well as in the header is not duplication: the header answers
// "what window is this whole screen on", and this answers it again at the
// moment you are looking at the chart, which is where the question actually
// occurs to you.
//
// `replace`, not `push` — flipping a range should not grow browser history,
// and every screen state stays a shareable URL.

export function RangeTabs({
  options,
  current,
}: {
  options: { value: string; label: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function select(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("t", value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  return (
    <div className="ops-seg" role="group" aria-label="Range">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="ops-seg-btn"
          aria-pressed={o.value === current}
          onClick={() => select(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
