import { MARKETS } from "@/config/markets";

export type MarketSearchRecord = {
  slug: string;
  label: string;
  aliases: readonly string[];
};

export const MARKET_SEARCH_RECORDS: MarketSearchRecord[] = MARKETS.map((market) => ({
  slug: market.slug,
  label: market.displayName,
  aliases: [
    market.slug,
    market.slug.replace(/-/g, " "),
    market.name,
    market.displayName,
    ...market.legacySlugs,
    ...market.searchAliases,
  ],
}));

export function normalizeMarketInput(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function exactMarketMatch(value: string): MarketSearchRecord | null {
  const normalized = normalizeMarketInput(value);
  if (!normalized) return null;
  return (
    MARKET_SEARCH_RECORDS.find((market) =>
      market.aliases.some((alias) => normalizeMarketInput(alias) === normalized)
    ) ?? null
  );
}

export function matchingMarkets(value: string, limit = 5): MarketSearchRecord[] {
  const normalized = normalizeMarketInput(value);
  if (!normalized) return [];
  return MARKET_SEARCH_RECORDS.filter((market) =>
    market.aliases.some((alias) => normalizeMarketInput(alias).includes(normalized))
  ).slice(0, limit);
}

export type FallbackClassification =
  | { kind: "zip"; zip: string }
  | { kind: "market"; slug: string }
  | { kind: "unknown" };

export function classifyFreeText(value: string): FallbackClassification {
  const normalized = normalizeMarketInput(value);
  const directZip = normalized.match(/^(\d{5})(?:-\d{4})?$/);
  if (directZip) return { kind: "zip", zip: directZip[1] };

  // A pasted street address is useful only when it contains a ZIP. The ZIP
  // enters the established operator path; the address itself stays private.
  if (/^\d+\s+\S+/.test(normalized)) {
    const embeddedZip = normalized.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (embeddedZip) return { kind: "zip", zip: embeddedZip[1] };
  }

  const market = exactMarketMatch(normalized);
  return market ? { kind: "market", slug: market.slug } : { kind: "unknown" };
}
