import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import WaitlistShell from "@/components/WaitlistShell";
import { ctaCopyFlag, CTA_COPY, type CtaVariant } from "@/lib/flags";
import { getCampaignMarket, NEUTRAL_MARKET } from "@/lib/campaignMarkets";
import { resolveMarket } from "@/lib/resolveMarket";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ market?: string; zip?: string; code?: string; status?: string; n?: string; e?: string }>;

function PageSkeleton() {
  return (
    <div aria-hidden>
      <header className="lp-header">
        <div className="lp-shell lp-header-inner">
          {/* Real logo — <img> triggers FCP so the browser doesn't wait for
              streamed content. Colored divs don't count as "contentful". */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-white.svg" alt="Curbio" className="lp-header-logo" width={100} height={26} />
          <div style={{ height: 32, width: 140, background: "var(--navy-85)", borderRadius: 999 }} />
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-shell lp-hero-grid">
            <div className="lp-hero-copy">
              <div style={{ height: 14, width: 110, background: "var(--stone)", borderRadius: 4, marginBottom: 18 }} />
              <div style={{ height: 100, width: "85%", background: "var(--stone)", borderRadius: 6, marginBottom: 22 }} />
              <div style={{ height: 3, width: 48, background: "var(--stone)", marginBottom: 22 }} />
              <div style={{ height: 44, width: "65%", background: "var(--stone)", borderRadius: 4 }} />
            </div>
            <div className="lp-hero-form-col">
              <div style={{ height: 420, background: "var(--stone)", borderRadius: 12 }} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

async function MarketResolver({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const prefillName  = (params.n ?? "").trim();
  const prefillEmail = (params.e ?? "").trim();

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

  if (resolved) {
    const market = getCampaignMarket(resolved.slug);
    return <PageShell market={market} crmMarketName={crmMarketName ?? null} variant={variant} ctaCopy={ctaCopy} prefillName={prefillName} prefillEmail={prefillEmail} />;
  }

  return <PageShell market={NEUTRAL_MARKET} crmMarketName={null} neutral variant={variant} ctaCopy={ctaCopy} showPicker prefillName={prefillName} prefillEmail={prefillEmail} />;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MarketResolver searchParams={searchParams} />
    </Suspense>
  );
}
