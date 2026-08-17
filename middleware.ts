import { NextResponse, type NextRequest } from "next/server";
import { canonicalSlug } from "./lib/markets";
import { CAMPAIGN_HOSTS, CAMPAIGN_PREFIX, SITE_HOSTS } from "./config/routes";
import { LEGACY_SLUG_REDIRECTS, marketPath } from "./config/markets";
import {
  SESSION_COOKIE,
  SESSION_IDLE_MS,
  SESSION_REISSUE_BELOW_MS,
  openSession,
  sealSession,
  type OpenedSession,
} from "./lib/adminSession";

// Five jobs, all on the edge, in order:
//
// 1. Internal-surface moves: /design-system → 301 /admin/design-system, and
//    /admin/marketing/* → 301 /marketing/* (the Marketing Hub is its own
//    control room now, not a Control Room tab; "monthly" became "executive").
//    One auth gate covers both roots.
//
// 2. /admin AND /marketing GATE. Signed-session auth (see lib/adminSession.ts): middleware
//    verifies the cookie's HMAC + idle expiry, then confirms the session
//    record still exists in Redis — using the READ-ONLY token, so the edge
//    can verify sessions but never mint or revoke one. Passwords are never
//    checked here; that happens in the Node login action. FAILS CLOSED: any
//    missing env var → 404, never open.
//
// 3. CAMPAIGN-HOST ALLOWLIST — the leak fix. sell.curbio.com previously used
//    a rewrite list that mapped /, /m/* and /confirm and let EVERYTHING ELSE
//    fall through, which publicly served /markets/*, /design-system (with no
//    auth at all) and any future site page on the lead domain. Now only
//    explicitly allowlisted paths exist on campaign hosts; everything else
//    404s — unless the request carries a valid ADMIN SESSION, which passes
//    through unchanged. That authed pass-through is what keeps site-tier
//    pages QA-able in production (curbio.com still points at WordPress, so
//    sell.curbio.com is the only production host until cutover) and lets the
//    control room's live previews render them.
//
// 4. Legacy /markets/<old-slug> 301s, derived from config/markets.ts.
//
// 5. Campaign-link rewrite (?market=<slug> → prerendered per-market page) and
//    the stable curbio_vid A/B cookie — unchanged behaviour.

// ── admin session (edge side) ────────────────────────────────────────────────

function adminEnvReady(): boolean {
  // Accounts live in Redis now (lib/adminAuth.ts) — no per-person env var.
  // ADMIN_SESSION_SECRET is the one remaining secret, and it's app-wide (it
  // signs the cookie), not tied to any individual's credentials.
  return !!(
    process.env.ADMIN_SESSION_SECRET &&
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL &&
    process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN
  );
}

/** Does the session record still exist? READ-ONLY token — verification only.
 *  Throws on network failure so the caller fails closed, not open. */
async function sessionRecordExists(sid: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  const res = await fetch(`${url}/get/admin:session:${sid}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`session store returned ${res.status}`);
  const data = (await res.json()) as { result: string | null };
  return data.result != null;
}

/** Full session check: signature + idle expiry + server-side record. Null on
 *  ANY failure, including Redis being unreachable — fail closed. */
async function validSession(req: NextRequest): Promise<OpenedSession | null> {
  if (!adminEnvReady()) return null;
  const opened = await openSession(
    req.cookies.get(SESSION_COOKIE)?.value,
    process.env.ADMIN_SESSION_SECRET as string
  );
  if (!opened) return null;
  try {
    return (await sessionRecordExists(opened.sid)) ? opened : null;
  } catch {
    return null;
  }
}

function notFoundResponse(): NextResponse {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}

// ── campaign host mapping ────────────────────────────────────────────────────

/**
 * Does this host serve sell.curbio.com's campaign tier at the root?
 *
 * FAIL-SAFE unchanged: in production, anything not explicitly a site host is
 * a campaign host — a misconfigured alias must never serve the site
 * placeholder at sell.curbio.com. Preview and development default to the
 * SITE, with campaigns reachable at their physical /lp paths for QA.
 */
function servesCampaignRoot(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  if ((CAMPAIGN_HOSTS as readonly string[]).includes(h)) return true;
  if ((SITE_HOSTS as readonly string[]).includes(h)) return false;
  return process.env.VERCEL_ENV === "production";
}

/**
 * ALLOWLIST for campaign hosts: the public paths that exist there, mapped to
 * their physical routes. Returns null for everything else — which then 404s
 * unless the request holds an admin session.
 *
 *   /            → the sell campaign        (visitor URL never changes)
 *   /m/*         → per-market rewrite targets
 *   /confirm     → post-submit confirmation
 *   /exp*        → PARTNER tier — real path on purpose, indexable at cutover
 *   /lp/*        → physical campaign paths, for QA links
 *
 * This replaced a fall-through rewrite list. The fall-through publicly served
 * every site-tier route that happened to exist — /markets/*, an
 * unauthenticated /design-system — on the lead domain. An allowlist fails
 * closed when Phase 3 adds pages.
 */
function campaignAllowlist(pathname: string): string | null {
  if (pathname === "/") return CAMPAIGN_PREFIX;
  if (pathname === "/m" || pathname.startsWith("/m/")) return `${CAMPAIGN_PREFIX}${pathname}`;
  if (pathname === "/confirm" || pathname.startsWith("/confirm/"))
    return `${CAMPAIGN_PREFIX}${pathname}`;
  if (pathname === "/exp" || pathname.startsWith("/exp/")) return pathname;
  if (pathname === "/lp" || pathname.startsWith("/lp/")) return pathname;
  return null;
}

// Base path (already physical) → its per-market prerendered directory.
const MARKET_REWRITES: Record<string, string> = {
  [CAMPAIGN_PREFIX]: `${CAMPAIGN_PREFIX}/m`,
  "/exp": "/exp/m",
};

export async function middleware(req: NextRequest) {
  const rawPath = req.nextUrl.pathname;
  // Normalize a possible trailing slash (the picker navigates to "/exp/?market=…").
  const pathname = rawPath.length > 1 && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;

  // 1. Internal surfaces consolidated under /admin.
  if (pathname === "/design-system" || pathname.startsWith("/design-system/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/admin/design-system${pathname.slice("/design-system".length)}`;
    return NextResponse.redirect(url, 301);
  }

  // 1b. The Marketing Hub moved out of the Control Room: /admin/marketing/*
  //     301s to /marketing/* so old links keep working. The one renamed
  //     segment: monthly → executive. Must run before the /admin gate below,
  //     because these paths match its prefix.
  if (pathname === "/admin/marketing" || pathname.startsWith("/admin/marketing/")) {
    const rest = pathname.slice("/admin/marketing".length);
    const url = req.nextUrl.clone();
    url.pathname =
      rest === "/monthly" || rest.startsWith("/monthly/")
        ? `/marketing/executive${rest.slice("/monthly".length)}`
        : `/marketing${rest}`;
    return NextResponse.redirect(url, 301);
  }

  // 1c. Executive share route: ONE env-configured token, read-only, no admin
  //     session. Fails closed — env unset means no bypass exists at all. The
  //     page re-validates the token itself; this bypass only skips the login
  //     redirect.
  const shareToken = process.env.MARKETING_EXEC_SHARE_TOKEN;
  if (shareToken && pathname === `/marketing/executive/${shareToken}`) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // 2. /admin and /marketing gate — one session, one password, one place to
  //    revoke. /marketing is the Marketing Hub; it authenticates exactly like
  //    /admin and sends the signed-out to the same login.
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/marketing" ||
    pathname.startsWith("/marketing/")
  ) {
    if (!adminEnvReady()) return notFoundResponse();
    const session = await validSession(req);

    // Login and signup are viewable without a session; both bounce a
    // signed-in visitor back to the Control Room rather than re-prompting.
    if (pathname === "/admin/login" || pathname === "/admin/signup") {
      if (session) return NextResponse.redirect(new URL("/admin", req.url));
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }

    if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));

    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    // Sliding window: reissue when less than half the idle window remains.
    if (session.exp - Date.now() < SESSION_REISSUE_BELOW_MS) {
      res.cookies.set(
        SESSION_COOKIE,
        await sealSession(session.sid, process.env.ADMIN_SESSION_SECRET as string),
        {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: Math.floor(SESSION_IDLE_MS / 1000),
        }
      );
    }
    return res;
  }

  // 3. Campaign-host allowlist.
  const host = req.headers.get("host") ?? "";
  let physical = pathname;
  if (servesCampaignRoot(host)) {
    const mapped = campaignAllowlist(pathname);
    if (mapped === null) {
      // Not a campaign path. Admin session → QA pass-through; public → 404.
      const session = await validSession(req);
      if (!session) return notFoundResponse();
      // physical stays the site-tier pathname, unchanged.
    } else {
      physical = mapped;
    }
  }

  // 4. Legacy market slugs → 301, derived from config/markets.ts legacySlugs.
  //    Runs after the allowlist, so on a campaign host it only fires for
  //    admin-authed requests — the public gets a 404, not a redirect into one.
  const legacyMatch = /^\/markets\/([^/]+)\/?$/.exec(pathname);
  if (legacyMatch) {
    const target = LEGACY_SLUG_REDIRECTS[legacyMatch[1].toLowerCase()];
    if (target) {
      const url = req.nextUrl.clone();
      url.pathname = marketPath(target);
      return NextResponse.redirect(url, 301);
    }
  }

  // 5. ?market= → prerendered per-market page, composed on top of the mapping.
  let res: NextResponse | undefined;
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
    // Stable random id for the cta-copy A/B bucket (lib/ctaVariant.ts).
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
  // This replaced a hardcoded list of public/ directory names, which silently
  // disabled middleware on any route sharing a name with an asset folder —
  // exactly what happened when /markets/ was added. Matching on "has a file
  // extension" is name-independent. Verified: every file under public/ has an
  // extension, and there are no extensionless files there at all.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
