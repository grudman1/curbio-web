"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MARKETS, marketPath, type Market } from "@/config/markets";

/**
 * Market indicator / selector SLOT.
 *
 * Wired, deliberately minimal. Phase 3 owns the real behaviour — ZIP entry,
 * geo resolution, and persistence across pages, all of which already exist in
 * campaign form under components/useMarketResolution.ts and should be lifted
 * rather than rewritten.
 *
 * What this does today: derives the current market from the URL and links to
 * the market index. What it deliberately does NOT do: guess a market from IP
 * geo. The campaign side learned that the hard way — see the "never geo"
 * comment in useMarketResolution.ts — and silently showing someone the wrong
 * market is worse than showing none.
 *
 * Every entry comes from MARKETS. There is no market list in this file.
 */
export function MarketIndicator() {
  const pathname = usePathname();
  const current: Market | undefined = MARKETS.find((m) => pathname.startsWith(marketPath(m.slug)));

  return (
    <Link
      href="/markets"
      className="inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-edge-inverse px-3 text-micro font-bold uppercase tracking-[var(--tracking-label)] text-brand-subtle transition-colors duration-fast ease-out hover:border-edge-accent hover:text-content-inverse"
    >
      {current ? current.displayName : "Choose your market"}
    </Link>
  );
}
