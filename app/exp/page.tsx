import { Suspense } from "react";
import type { Metadata } from "next";
import ExpShell from "@/components/ExpShell";
import WaitlistShell from "@/components/WaitlistShell";
import { ctaCopyFlag, CTA_COPY } from "@/lib/flags";
import { getCampaignMarket, NEUTRAL_MARKET } from "@/lib/campaignMarkets";
import { resolveMarket } from "@/lib/resolveMarket";
import type { CtaVariant } from "@/lib/flags";

// Noindex until DNS cutover and go.curbio.com/exp redirect are verified.
export const metadata: Metadata = {
  title: "Curbio for eXp Realty — Pre-listing Home Improvement",
  description:
    "Curbio is the preferred pre-listing home improvement partner for eXp Realty agents. " +
    "Repairs, refreshes, and staging — fully managed, with pay-at-closing for qualified sellers.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  market?: string;
  zip?: string;
  code?: string;
  status?: string;
  referral_source_id?: string;
}>;

function ExpPageSkeleton() {
  return (
    <div aria-hidden>
      <header className="lp-header">
        <div className="lp-shell lp-header-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="exp-header-logos">
            <img src="/logo/curbio-white.svg" alt="Curbio" className="lp-header-logo" width={100} height={26} />
            <div style={{ width: 1, height: 22, background: "var(--navy-85)" }} />
            <div style={{ height: 20, width: 120, background: "var(--navy-85)", borderRadius: 3 }} />
          </div>
          <div style={{ height: 32, width: 140, background: "var(--navy-85)", borderRadius: 999 }} />
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-shell lp-hero-grid">
            <div className="lp-hero-copy">
              <div style={{ height: 14, width: 160, background: "var(--stone)", borderRadius: 4, marginBottom: 18 }} />
              <div style={{ height: 100, width: "85%", background: "var(--stone)", borderRadius: 6, marginBottom: 22 }} />
              <div style={{ height: 44, width: "65%", background: "var(--stone)", borderRadius: 4 }} />
            </div>
            <div className="lp-hero-form-col">
              <div style={{ height: 480, background: "var(--stone)", borderRadius: 12 }} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

async function ExpMarketResolver({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  let variant: CtaVariant = "control";
  try { variant = await ctaCopyFlag(); } catch { variant = "control"; }
  const ctaCopy = CTA_COPY[variant];

  const { market: resolved, source, outZip, geoCity, geoRegion, crmMarketName } = await resolveMarket({
    market: params.market,
    zip: params.zip,
    code: params.code,
    status: params.status,
  });

  if (source === "out-of-area") {
    return <WaitlistShell outZip={outZip} geoCity={geoCity} geoRegion={geoRegion} />;
  }

  // Market resolved (or neutral) — render the eXp shell.
  // NEUTRAL_MARKET is used when geo/zip resolution is ambiguous; the form still works.
  const market = resolved ? getCampaignMarket(resolved.slug) : NEUTRAL_MARKET;

  return (
    <ExpShell
      market={market}
      crmMarketName={crmMarketName ?? null}
      neutral={!resolved}
      showPicker={source === "geo-neutral" || source === "neutral"}
      variant={variant}
      ctaCopy={ctaCopy}
    />
  );
}

export default function ExpPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<ExpPageSkeleton />}>
      <ExpMarketResolver searchParams={searchParams} />
    </Suspense>
  );
}
