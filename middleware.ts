import { NextResponse, type NextRequest } from "next/server";
import { canonicalSlug } from "./lib/markets";

// Two jobs, both on the edge:
//
// 1. Campaign-link rewrite: /?market=<slug> → /m/<slug> (REWRITE, not
//    redirect — the address bar keeps the original URL and query string, so
//    captureAttribution() and the ?n=/?e= prefill still read them). The
//    /m/<slug> pages are prerendered, so campaign traffic is served from the
//    CDN edge instead of invoking a serverless function. Unrecognized slugs
//    are NOT rewritten: the prerendered `/` renders neutral for them (never
//    geo — see components/HomeClient.tsx).
//
// 2. Assigns a stable anonymous visitor id used to bucket the cta-copy A/B
//    test (see lib/ctaVariant.ts). Set once, read on every subsequent request
//    so a visitor keeps the same variant across reloads and email sends.
export function middleware(req: NextRequest) {
  let res: NextResponse | undefined;

  if (req.nextUrl.pathname === "/") {
    const slug = canonicalSlug(req.nextUrl.searchParams.get("market"));
    if (slug) {
      const dest = req.nextUrl.clone();
      dest.pathname = `/m/${slug}`;
      dest.search = "";
      res = NextResponse.rewrite(dest);
    }
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
  // Run on the landing pages only; skip static assets and API.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo|hsm|sold|proof|markets|hero).*)"],
};
