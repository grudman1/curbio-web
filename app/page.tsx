import { resolveMarket } from "@/lib/resolveMarket";
import PageShell from "@/components/PageShell";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ market?: string; zip?: string; code?: string }>;

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { market, source } = await resolveMarket({
    market: params.market,
    zip: params.zip,
    code: params.code,
  });

  return <PageShell market={market} source={source} />;
}
