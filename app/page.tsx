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

  // Always run the full resolver:
  //   ?market=      → canonical zip → live operator API   (priority 1)
  //   ?zip=/?code=  → live operator API                   (priority 2)
  //   ?status=waitlist → waitlist view                    (priority 0)
  //   no params     → Vercel IP geo → nearest market      (priority 3)
  //   geo miss      → "none" → show market-chooser modal  (priority 4)
  const { market: resolved, source, outZip, geoCity, geoRegion } = await resolveMarket({
    market: params.market,
    zip: params.zip,
    code: params.code,
    status: params.status,
  });

  // Confirmed out-of-area → show the waitlist page with the ZIP prefilled
  if (source === "out-of-area") {
    return <WaitlistShell outZip={outZip} geoCity={geoCity} geoRegion={geoRegion} />;
  }

  // Resolved via param, zip, or geo → show that market's landing page
  if (resolved) {
    const market = getCampaignMarket(resolved.slug);
    return <PageShell market={market} variant={variant} ctaCopy={ctaCopy} />;
  }

  // source === "none": geo couldn't place the visitor → open the market picker
  // immediately so they can choose their area. Use Atlanta as a neutral
  // backdrop (it's behind the modal and won't be seen until they pick).
  const fallback = getCampaignMarket("atlanta");
  return <PageShell market={fallback} variant={variant} ctaCopy={ctaCopy} showPicker />;
}
