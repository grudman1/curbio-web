import { cookies } from "next/headers";
import { getSessionUser, sessionSecret, type AdminRole } from "./adminAuth";
import { SESSION_COOKIE, openSession } from "./adminSession";

// ─────────────────────────────────────────────────────────────────────────────
// THE SESSION GATE FOR ROUTE HANDLERS — because middleware.ts does not cover
// them.
//
// middleware.ts's matcher is:
//
//   "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"
//
// The leading `api` in that negative lookahead EXCLUDES every /api/* path. So
// the /admin gate that protects every admin PAGE never runs for an admin route
// handler. A route under app/api/admin/ is public unless it says otherwise —
// and for a long time app/api/admin/page-stats/route.ts carried a comment
// claiming the opposite, which is how the gap survived.
//
// Anything under app/api/admin/ MUST call requireAdminApiSession() and return
// unauthorized() when it comes back null. There is no second layer behind
// this one.
//
// ── Deliberately public, for the avoidance of doubt ────────────────────────
// Three routes outside app/api/admin/ are public BY DESIGN and must stay that
// way — they serve the marketing site to anonymous visitors:
//
//   /api/lead              the lead form. See its header: it may not reject a
//                          submission it cannot prove is fake.
//   /api/notable-estimate  a server-side CORS proxy for the partner estimator.
//                          Three numbers and a state code; no PII, no writes.
//   /api/resolve           request-time market resolution for the prerendered
//                          homepage, called from the client after paint.
//
// None of them read admin data, and none of them ever claimed middleware
// protection. Do not "fix" them with this helper.
//
// ── Why this mirrors the edge rather than simplifying it ───────────────────
// Same two checks the middleware performs, in the same order: verify the
// cookie's HMAC and idle expiry, then confirm the session record still exists
// in Redis. The second check is what makes logout a real revocation — a
// cookie with a valid signature whose record has been deleted must fail. A
// signature-only check would be a token that cannot be revoked.
// ─────────────────────────────────────────────────────────────────────────────

export type AdminApiSession = { email: string; role: AdminRole };

/**
 * The signed-in admin for a route handler, or null.
 *
 * FAILS CLOSED. A missing ADMIN_SESSION_SECRET returns null rather than
 * throwing — sessionSecret() throws when it is unset, and an unhandled throw
 * here would surface as a 500, which reads as an outage rather than as the
 * refusal it actually is. Same rule the edge applies: any missing env var
 * means no access, never open access.
 */
export async function requireAdminApiSession(): Promise<AdminApiSession | null> {
  if (!process.env.ADMIN_SESSION_SECRET) return null;

  const jar = await cookies();
  const opened = await openSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  if (!opened) return null;

  // The cookie's signature is valid — but the session may have been revoked by
  // a logout since it was issued, so the record is the authority.
  const session = await getSessionUser(opened.sid);
  return session ? { email: session.email, role: session.role } : null;
}

/** The one 401 shape every admin route handler returns. */
export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Not signed in." }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
