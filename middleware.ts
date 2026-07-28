import { NextResponse, type NextRequest } from "next/server";
import { canonicalSlug } from "./lib/markets";
import { CAMPAIGN_HOSTS, CAMPAIGN_PREFIX, SITE_HOSTS } from "./config/routes";
import { LEGACY_SLUG_REDIRECTS, marketPath } from "./config/markets";

// Three jobs, all on the edge:
//
// 1. HOSTNAME → TIER. sell.curbio.com's paths are mapped onto the campaign
//    tier's physical prefix (/lp/sell). REWRITE, not redirect — the address
//    bar keeps sell.curbio.com/, so nothing visitor-visible changes and
//    captureAttribution() still reads the original URL. Partner paths (/exp)
//    are NOT mapped: they already live at the path they keep on curbio.com,
//    which is what makes them indexable. See config/routes.ts.
//
// 2. Campaign-link rewrite: ?market=<slug> → the prerendered per-market page,
//    composed ON TOP of (1). sell.curbio.com/?market=atlanta becomes
//    /lp/sell/m/atlanta; /exp?market=atlanta becomes /exp/m/atlanta. The
//    targets are prerendered, so campaign traffic is served from the CDN edge
//    instead of invoking a serverless function. Unrecognized slugs are NOT
//    rewritten: the prerendered base page renders neutral for them (never
//    geo — see components/useMarketResolution.ts).
//
// 3. Assigns a stable anonymous visitor id used to bucket the cta-copy A/B
//    test (see lib/ctaVariant.ts). Set once, read on every subsequent request
//    so a visitor keeps the same variant across reloads and email sends.

/** Public path → physical path, for hosts that serve the campaign tier.
 *  Longest prefix first so /m/... is matched before the "/" catch-all. */
const CAMPAIGN_PATH_MAP: { from: string; to: string }[] = [
  { from: "/m", to: `${CAMPAIGN_PREFIX}/m` },
  { from: "/confirm", to: `${CAMPAIGN_PREFIX}/confirm` },
  { from: "/", to: CAMPAIGN_PREFIX },
];

/** Paths that stay put on a campaign host — the partner tier lives in the site
 *  group at its real path and must never be pushed behind /lp/. */
const TIER_EXEMPT_PREFIXES = ["/exp", "/api", "/_next", "/admin", "/design-system"];

// Base path (already physical) → its per-market prerendered directory.
const MARKET_REWRITES: Record<string, string> = {
  [CAMPAIGN_PREFIX]: `${CAMPAIGN_PREFIX}/m`,
  "/exp": "/exp/m",
};

/**
 * Does this host serve sell.curbio.com's campaign tier at the root?
 *
 * FAIL-SAFE: in production, anything that is not explicitly a site host is
 * treated as a campaign host. A misconfigured or newly-added production alias
 * must never silently start serving the site placeholder at sell.curbio.com —
 * that would be a total lead-flow outage, and the failure mode of guessing
 * wrong in the other direction (a site host briefly serving campaigns) is
 * merely wrong, not revenue-ending.
 *
 * Preview and development default to the SITE, with campaigns reachable at
 * their physical /lp/sell paths — previews have no sell.curbio.com hostname,
 * so path access is the only way to QA both tiers on one deployment.
 */
function servesCampaignRoot(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  if ((CAMPAIGN_HOSTS as readonly string[]).includes(h)) return true;
  if ((SITE_HOSTS as readonly string[]).includes(h)) return false;
  return process.env.VERCEL_ENV === "production";
}

function toPhysicalPath(pathname: string): string {
  if (TIER_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return pathname;
  }
  for (const { from, to } of CAMPAIGN_PATH_MAP) {
    if (from === "/") {
      if (pathname === "/") return to;
      continue;
    }
    if (pathname === from) return to;
    if (pathname.startsWith(`${from}/`)) return `${to}${pathname.slice(from.length)}`;
  }
  return pathname;
}


/**
 * /admin gate — a single shared secret, not a user system.
 *
 * HTTP Basic, so the browser supplies the native prompt and there is no login
 * page, no session, no cookie and no logout to get wrong. Any username is
 * accepted; only the password is checked, against ADMIN_SECRET.
 *
 * FAIL CLOSED: with no ADMIN_SECRET configured the route 404s rather than
 * opening. An admin surface that becomes public when an env var is missing is
 * worse than one that is unreachable.
 *
 * This runs in MIDDLEWARE, which is why /admin can be a plain server component
 * that reads Redis directly instead of needing an API route — the middleware
 * matcher deliberately excludes /api, so an admin API route would have to
 * re-implement this check itself. Not having one is the safer shape.
 */
function adminResponse(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return new NextResponse("Not found", { status: 404 });
  }

  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    let supplied = "";
    try {
      supplied = atob(encoded).split(":").slice(1).join(":");
    } catch {
      supplied = "";
    }
    if (timingSafeEqual(supplied, secret)) return null; // authorised
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Curbio admin", charset="UTF-8"',
      // Belt and braces alongside the page's own noindex metadata.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/** Constant-time compare so a wrong secret cannot be found byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  let res: NextResponse | undefined;

  // Normalize a possible trailing slash (the picker navigates to "/exp/?market=…").
  const rawPath = req.nextUrl.pathname;
  const pathname = rawPath.length > 1 && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;

  // 0a. /admin gate — before anything else, so no admin path is ever routed,
  //     rewritten or served without the secret.
  if (rawPath === "/admin" || rawPath.startsWith("/admin/")) {
    const denied = adminResponse(req);
    if (denied) return denied;
  }

  // 0b. Legacy market slugs → 301 to the current slug. Derived from each
  //    market's `legacySlugs` in config/markets.ts, so renaming a market and
  //    recording the old spelling is all it takes to keep inbound links and
  //    index entries alive. The WordPress site accrued three slug conventions
  //    plus a 404 and a redirect-to-nothing precisely because this was manual.
  //    A REDIRECT, not a rewrite: the old URL should stop existing.
  const legacyMatch = /^\/markets\/([^/]+)\/?$/.exec(req.nextUrl.pathname);
  if (legacyMatch) {
    const target = LEGACY_SLUG_REDIRECTS[legacyMatch[1].toLowerCase()];
    if (target) {
      const url = req.nextUrl.clone();
      url.pathname = marketPath(target);
      return NextResponse.redirect(url, 301);
    }
  }

  // 1. Host → physical path.
  const host = req.headers.get("host") ?? "";
  const physical = servesCampaignRoot(host) ? toPhysicalPath(pathname) : pathname;

  // 2. ?market= → prerendered per-market page, composed on top of (1).
  const marketBase = MARKET_REWRITES[physical];
  let dest: string | null = null;
  if (marketBase) {
    const slug = canonicalSlug(req.nextUrl.searchParams.get("market"));
    if (slug) dest = `${marketBase}/${slug}`;
  }
  if (!dest && physical !== rawPath) dest = physical;

  if (dest) {
    const url = req.nextUrl.clone();
    url.pathname = dest;
    // Only the ?market= rewrite drops the query string (it has been consumed
    // into the path); a plain tier rewrite must preserve ?zip=, ?status=,
    // ?n=/?e= prefill and every utm_* param exactly as they arrived.
    if (marketBase && dest !== physical) url.search = "";
    res = NextResponse.rewrite(url);
  }
  res ??= NextResponse.next();

  if (!req.cookies.get("curbio_vid")) {
    // Stable random id. crypto.randomUUID is available on the Edge runtime.
    const id = crypto.randomUUID();
    res.cookies.set("curbio_vid", id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });
  }
  return res;
}

export const config = {
  // Run on PAGES only; skip the API and anything with a file extension.
  //
  // This replaced a hardcoded list of public/ directory names
  // (logo|hsm|sold|proof|markets|hero), which was a latent trap: the moment a
  // real route shared a name with an asset folder, middleware silently stopped
  // running on it. That is exactly what happened when /markets/ was added —
  // the legacy-slug redirects 404'd because `markets` was an exclusion.
  //
  // Matching on "has a file extension" is name-independent, so it cannot
  // collide with a future route. Verified safe: every file under public/ has
  // an extension, and there are no extensionless files there at all.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
