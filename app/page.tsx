import PageShell from "@/components/PageShell";
import WaitlistShell from "@/components/WaitlistShell";
import { ctaCopyFlag, CTA_COPY, type CtaVariant } from "@/lib/flags";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import { resolveMarket } from "@/lib/resolveMarket";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ market?: string; zip?: string; code?: string; status?: string }>;
}) {
  const params = await searchParams;

  // Resolve the A/B flag once — drives both the form button and any future sticky
  let variant: CtaVariant = "control";
  try { variant = await ctaCopyFlag(); } catch { variant = "control"; }
  const ctaCopy = CTA_COPY[variant];

  // ZIP entry or explicit waitlist: use the full resolver which calls the live
  // operator API and correctly detects out-of-market ZIPs.
  if (params.zip || params.code || params.status === "waitlist") {
    const { market: resolved, source, outZip, geoCity, geoRegion } = await resolveMarket({
      zip: params.zip,
      code: params.code,
      status: params.status,
    });

    // Confirmed out-of-area → show the waitlist page with the ZIP prefilled
    if (source === "out-of-area") {
      return <WaitlistShell outZip={outZip} geoCity={geoCity} geoRegion={geoRegion} />;
    }

    // ZIP matched a served market → show that market's landing page
    if (resolved) {
      const market = getCampaignMarket(resolved.slug);
      return <PageShell market={market} variant={variant} ctaCopy={ctaCopy} />;
    }

    // Operator API timed out: fall through to default below rather than showing
    // a spurious out-of-area screen
  }

  // ?market= campaign slug or default (Atlanta)
  const market = getCampaignMarket(params.market);
  return <PageShell market={market} variant={variant} ctaCopy={ctaCopy} />;
}
