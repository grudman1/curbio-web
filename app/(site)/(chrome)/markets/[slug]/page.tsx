import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MARKETS, MARKET_BY_SLUG, marketPath } from "@/config/markets";
import { firstNameOf } from "@/lib/markets";
import { routeMetadata } from "@/config/routes";

// ─────────────────────────────────────────────────────────────────────────────
// THE market page. Singular — there is one template and seven rows of data.
//
// Adding market 8 means adding a row to config/markets.ts. This file does not
// change, generateStaticParams picks it up, the nav gains an entry, and the
// sitemap gains a URL. There is no branch on slug anywhere below, and there
// must never be one: per-market special cases are exactly how the WordPress
// site ended up with three slug conventions and a 404.
//
// Content is intentionally thin — Phase 2 builds no marketing pages. What is
// being proven here is that the TEMPLATE is data-driven end to end.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamicParams = false;

export function generateStaticParams() {
  return MARKETS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const market = MARKET_BY_SLUG[slug];
  if (!market) return {};
  return {
    title: `Pre-listing home improvement in ${market.displayName} — Curbio`,
    description: `Curbio's fully managed pre-listing home improvement service in ${market.displayName}, ${market.state}. Repairs, refreshes, and staging with pay-at-closing for qualified sellers.`,
    ...routeMetadata("/markets/:slug"),
    // Canonical must resolve per-market, so it can't come from the static tier
    // helper. Only emitted once the tier is indexed, matching routeMetadata's
    // rule that a noindex page never carries a canonical.
    ...(routeMetadata("/markets/:slug").robots
      ? {}
      : { alternates: { canonical: marketPath(market.slug) } }),
  };
}

export default async function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = MARKET_BY_SLUG[slug];
  if (!market) notFound();

  return (
    <div className="mx-auto max-w-container px-6 pb-16 pt-40">
      <p className="text-label font-black uppercase tracking-[var(--tracking-label)] text-content-muted">
        {market.displayName}
      </p>
      <h1 className="mt-2 font-serif text-h2 font-semibold text-content">
        Pre-listing home improvement in {market.name}
      </h1>

      <dl className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <dt className="text-label font-black uppercase tracking-[var(--tracking-label)] text-content-subtle">
            Slug
          </dt>
          <dd className="mt-1 text-body text-content">{market.slug}</dd>
        </div>
        <div>
          <dt className="text-label font-black uppercase tracking-[var(--tracking-label)] text-content-subtle">
            Coordinates
          </dt>
          <dd className="mt-1 text-body text-content">
            {market.coordinates.lat}, {market.coordinates.lng}
          </dd>
        </div>
        <div>
          <dt className="text-label font-black uppercase tracking-[var(--tracking-label)] text-content-subtle">
            Coverage
          </dt>
          <dd className="mt-1 text-body text-content">
            {market.coverage}
            <span className="block text-micro text-content-muted">
              {market.cities.join(" · ")}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-label font-black uppercase tracking-[var(--tracking-label)] text-content-subtle">
            Home Services Manager
          </dt>
          <dd className="mt-1 text-body text-content">
            {firstNameOf(market.hsm.name) || "—"}
            <span className="block text-micro text-content-muted">
              Full identity resolves live from the operator API per request.
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-label font-black uppercase tracking-[var(--tracking-label)] text-content-subtle">
            Brokerage partners
          </dt>
          <dd className="mt-1 text-body text-content">
            {market.brokerageLogos.length ? market.brokerageLogos.map((b) => b.name).join(", ") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-label font-black uppercase tracking-[var(--tracking-label)] text-content-subtle">
            Previous URLs
          </dt>
          <dd className="mt-1 text-body text-content">
            {market.legacySlugs.length ? market.legacySlugs.join(", ") : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
