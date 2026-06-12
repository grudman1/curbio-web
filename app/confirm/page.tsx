import { headers } from "next/headers";
import { getOperatorLead } from "@/lib/operator";
import { buildResolvedMarket, canonicalZipForSlug } from "@/lib/markets";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import ConfirmShell from "@/components/ConfirmShell";

export const revalidate = 60;

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
  const [{ market: slug, name, email, phone }, requestHeaders] = await Promise.all([
    searchParams,
    headers(),
  ]);

  // embed_domain is resolved server-side from the request Host header so the
  // Calendly iframe src is included in the SSR HTML. The browser starts
  // fetching calendly.com as soon as the HTML parses — no hydration delay.
  const embedDomain = requestHeaders.get("host") ?? "";

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
      embedDomain={embedDomain}
    />
  );
}
