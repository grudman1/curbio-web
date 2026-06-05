import PageShell from "@/components/PageShell";
import { ctaCopyFlag, CTA_COPY, type CtaVariant } from "@/lib/flags";
import { getCampaignMarket } from "@/lib/campaignMarkets";

// Reads the visitor cookie (cta-copy flag) and ?market= at request time.
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const { market: marketParam } = await searchParams;
  const market = getCampaignMarket(marketParam);

  // Evaluate the A/B flag ONCE so the form button and sticky bar match.
  let variant: CtaVariant = "control";
  try {
    variant = await ctaCopyFlag();
  } catch {
    variant = "control";
  }
  const ctaCopy = CTA_COPY[variant];

  return <PageShell market={market} variant={variant} ctaCopy={ctaCopy} />;
}
