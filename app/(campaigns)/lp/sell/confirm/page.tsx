import { cookies, headers } from "next/headers";
import { getOperatorLead } from "@/lib/operator";
import { buildResolvedMarket, canonicalZipForSlug } from "@/lib/markets";
import { getCampaignMarket } from "@/lib/campaignMarkets";
import ConfirmShell from "@/components/ConfirmShell";

// Intentionally dynamic (no revalidate): every render needs the per-visitor
// prefill cookie and the request Host header for Calendly's embed_domain.
// The operator fetch inside still hits its own 120s data cache.

/** Calendly prefill handed off from FormCard via the short-lived, path-scoped
 *  `curbio_confirm_prefill` cookie — PII never travels in the URL, where it
 *  would land in browser history, Vercel request logs, and Clarity session
 *  metadata. ConfirmShell expires the cookie on mount. */
function parsePrefillCookie(raw: string | undefined): { name?: string; email?: string; phone?: string } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
    };
  } catch {
    return {};
  }
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    market?: string;
    name?: string;
    email?: string;
    phone?: string;
    partner?: string;
  }>;
}) {
  const [{ market: slug, name, email, phone, partner }, requestHeaders, cookieStore] =
    await Promise.all([searchParams, headers(), cookies()]);

  // embed_domain is resolved server-side from the request Host header so the
  // Calendly iframe src is included in the SSR HTML. The browser starts
  // fetching calendly.com as soon as the HTML parses — no hydration delay.
  const embedDomain = requestHeaders.get("host") ?? "";

  // Prefill: the cookie is the current handoff. Query params are a defensive
  // fallback ONLY (pre-deploy links, refreshes of old URLs) — when present
  // they still work, and ConfirmShell replaceState-scrubs them from the
  // address bar on mount. A refresh after the cookie expires renders the
  // unprefilled Calendly — acceptable; booking still works.
  const cookiePrefill = parsePrefillCookie(cookieStore.get("curbio_confirm_prefill")?.value);
  const prefill = {
    name: name ?? cookiePrefill.name,
    email: email ?? cookiePrefill.email,
    phone: phone ?? cookiePrefill.phone,
  };

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
      prefill={prefill}
      embedDomain={embedDomain}
      partner={partner}
    />
  );
}
