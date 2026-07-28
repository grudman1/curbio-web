// ─────────────────────────────────────────────────────────────────────────────
// THE TIER MAP — one object, three consumers.
//
//   1. middleware.ts      host + public path → internal App Router path
//   2. routeMetadata()    robots + canonical for every page in the tier
//   3. CUTOVER_REDIRECTS  the 301 set when curbio.com moves off WordPress
//
// Written once here so those three can never drift apart. In particular:
// indexability and canonical are DERIVED TOGETHER from `indexed` (see
// routeMetadata) — flipping a tier to indexed:true simultaneously removes the
// noindex and adds the canonical. It is deliberately impossible to do one
// without the other, because doing exactly that on a duplicate-content
// rewrite target is invisible until it costs rankings.
//
// ── The three tiers ──────────────────────────────────────────────────────────
//
//   campaign  Disposable, never indexed. Email/ad landing pages. Lives behind
//             the /lp/ prefix so the prefix itself marks the tier.
//   partner   Indexable, earns inbound links, long-lived. eXp is the first of
//             ~50. Lives at a real path in the site group — NOT behind /lp/.
//   site      The curbio.com website proper.
//
// ── Why campaigns are physically prefixed and partners are not ───────────────
//
// Route groups do not add URL segments, so app/(site)/page.tsx and
// app/(campaigns)/page.tsx would both resolve to "/" and fail the build. Only
// one group can own the root. The site owns it; campaigns are physically
// prefixed and the middleware maps sell.curbio.com's paths onto that prefix.
// Partner pages need no mapping at all — /exp is already the path it will
// keep on curbio.com, which is exactly why it can be indexed.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";

/** Origin everything consolidates onto. Canonicals and metadataBase resolve
 *  against this, NOT against whatever host served the request — a canonical
 *  that varies by host is not a canonical. */
export const SITE_ORIGIN = "https://curbio.com";

/** Hosts whose paths get mapped onto the campaign prefix. go.curbio.com is
 *  deliberately absent: it is a separate platform being retired and will be a
 *  redirect SOURCE, never a rewrite host. */
export const CAMPAIGN_HOSTS = ["sell.curbio.com"] as const;

/** Hosts that serve the site group at its real paths. */
export const SITE_HOSTS = ["curbio.com", "www.curbio.com"] as const;

/** Physical prefix for the campaign tier. Public URLs never show it. */
export const CAMPAIGN_PREFIX = "/lp/sell";

export type Tier = "campaign" | "partner";

export type RouteEntry = {
  /** Path as visitors see it on sell.curbio.com today. `:market` is dynamic. */
  publicPath: string;
  /** Physical path in the App Router. */
  internalPath: string;
  /** Path on curbio.com after cutover — the 301 destination. */
  cutoverPath: string;
  tier: Tier;
  group: "campaigns" | "site";
  /**
   * Indexable TODAY.
   *
   * campaign — permanently false. These are disposable and must never compete
   *   with the real site for the same queries.
   * partner  — false until DNS cutover, then true. Flipping this one field
   *   removes the noindex AND emits the canonical, together (routeMetadata).
   */
  indexed: boolean;
  /**
   * Where this page's canonical points once indexed. Defaults to cutoverPath.
   * Set explicitly when several paths render the same content and must
   * consolidate onto one — the per-market partner pages are rewrite targets
   * for the parent and would otherwise compete with it.
   */
  canonicalPath?: string;
};

export const ROUTES: RouteEntry[] = [
  // ── campaign tier — never indexed, always prefixed ──
  {
    publicPath: "/",
    internalPath: `${CAMPAIGN_PREFIX}`,
    cutoverPath: "/sell",
    tier: "campaign",
    group: "campaigns",
    indexed: false,
  },
  {
    publicPath: "/m/:market",
    internalPath: `${CAMPAIGN_PREFIX}/m/:market`,
    cutoverPath: "/sell/m/:market",
    tier: "campaign",
    group: "campaigns",
    indexed: false,
  },
  {
    publicPath: "/confirm",
    internalPath: `${CAMPAIGN_PREFIX}/confirm`,
    cutoverPath: "/sell/confirm",
    tier: "campaign",
    group: "campaigns",
    indexed: false,
  },

  // ── partner tier — real paths, indexable at cutover ──
  {
    publicPath: "/exp",
    internalPath: "/exp",
    cutoverPath: "/exp",
    tier: "partner",
    group: "site",
    indexed: false, // ← flip at cutover; canonical follows automatically
  },
  {
    publicPath: "/exp/m/:market",
    internalPath: "/exp/m/:market",
    cutoverPath: "/exp/m/:market",
    tier: "partner",
    group: "site",
    indexed: false, // ← flip at cutover, together with /exp
    // Rewrite targets for /exp?market=… — same content as the parent. Without
    // this they would compete with /exp the moment indexing is switched on.
    canonicalPath: "/exp",
  },
];

const BY_PUBLIC_PATH = new Map(ROUTES.map((r) => [r.publicPath, r]));

/** Look up a tier entry by its public path (`/m/:market` form). */
export function routeFor(publicPath: string): RouteEntry | undefined {
  return BY_PUBLIC_PATH.get(publicPath);
}

/**
 * Robots + canonical for a page, derived together from `indexed`.
 *
 * A noindex page gets NO canonical — canonicalising a page you have told
 * search engines to ignore is contradictory, and the campaign tier's current
 * canonical (a hardcoded sell.curbio.com/) would point at a 301 source the
 * moment DNS moves.
 */
export function routeMetadata(publicPath: string): Metadata {
  const entry = routeFor(publicPath);
  if (!entry) return {};
  if (!entry.indexed) {
    return { robots: { index: false, follow: false } };
  }
  const target = entry.canonicalPath ?? entry.cutoverPath;
  return { alternates: { canonical: new URL(target, SITE_ORIGIN).toString() } };
}

/**
 * The 301 set for DNS cutover: every sell.curbio.com path → its curbio.com
 * home. Generated from the same map the middleware routes on, so the
 * redirects cannot describe a topology the app doesn't actually have.
 * `:market` is left as a placeholder for whichever redirect layer consumes it.
 */
export const CUTOVER_REDIRECTS = ROUTES.filter((r) => r.tier === "campaign").map((r) => ({
  from: `https://sell.curbio.com${r.publicPath === "/" ? "" : r.publicPath}`,
  to: `${SITE_ORIGIN}${r.cutoverPath}`,
  permanent: true as const,
}));
