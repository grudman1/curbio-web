import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS, marketPath } from "@/config/markets";
import { routeMetadata } from "@/config/routes";
import { assertMarketListIsCoherent } from "@/config/markets.guard";

// Runs at BUILD time (this page is prerendered), so a market added to one list
// and not the other fails CI rather than surfacing as a 404 months later.
assertMarketListIsCoherent();

// Market index. Renders MARKETS — no list here either.
export const metadata: Metadata = {
  title: "Markets — Curbio",
  description: "Where Curbio operates.",
  ...routeMetadata("/markets"),
};

export default function MarketsIndex() {
  return (
    <div className="mx-auto max-w-container px-6 pb-16 pt-40">
      <h1 className="font-serif text-h2 font-semibold text-content">Markets</h1>
      <p className="mt-4 max-w-[60ch] text-body text-content-muted">
        {MARKETS.length} markets. This list is the single source — nav entries,
        market pages, sitemap URLs, and the legacy-slug redirects are all
        derived from it.
      </p>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETS.map((m) => (
          <li key={m.slug}>
            <Link
              href={marketPath(m.slug)}
              className="flex min-h-[44px] flex-col justify-center rounded-lg border border-edge bg-surface-raised p-6 shadow-raised transition-shadow duration-base ease-out hover:shadow-card"
            >
              <span className="font-serif text-h4 font-semibold text-content">{m.displayName}</span>
              <span className="text-micro font-bold uppercase tracking-[var(--tracking-label)] text-content-muted">
                {m.state}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
