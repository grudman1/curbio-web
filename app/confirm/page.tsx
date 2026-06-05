import { getOperatorLead } from "@/lib/operator";
import { buildResolvedMarket, canonicalZipForSlug } from "@/lib/markets";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import ConfirmShell from "@/components/ConfirmShell";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    market?: string;
    name?: string;
    email?: string;
    phone?: string;
  }>;
}) {
  const { market: slug, name, email, phone } = await searchParams;
  const campaignMarket = getCampaignMarket(slug);

  // Resolve the live HSM data for this market via the operator API
  const zip = canonicalZipForSlug(campaignMarket.slug);
  const lead = zip ? await getOperatorLead(zip) : null;
  const resolved = buildResolvedMarket(lead);

  const hsm = resolved ?? null;

  return (
    <ConfirmShell
      market={campaignMarket}
      hsm={hsm}
      prefill={{ name, email, phone }}
    />
  );
}
