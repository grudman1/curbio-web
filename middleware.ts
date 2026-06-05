import { NextResponse, type NextRequest } from "next/server";

// Assigns a stable anonymous visitor id used to bucket the cta-copy A/B test
// (see lib/flags.ts). Set once, read on every subsequent request so a visitor
// keeps the same variant across reloads and across email sends.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
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
  // Run on the landing page only; skip static assets and API.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo|hsm|sold|proof|markets|hero).*)"],
};
