import { cookies } from "next/headers";
import { getSessionUser, sessionSecret, type AdminRole } from "./adminAuth";
import { SESSION_COOKIE, openSession } from "./adminSession";

// ─────────────────────────────────────────────────────────────────────────────
// THE owner re-check for mutations. One helper, imported by every mutating
// server action in /admin and /marketing.
//
// Before this file there were three: requireOwnerSession (admin/actions.ts,
// owner-gated, redirect-style), requireAdmin (links/actions.ts, signed-in
// only), and an inline copy of requireAdmin in executive/actions.ts. Three
// helpers, two strictness levels, none shared — which meant any approved
// member could write exec notes and registry links while user approval was
// owner-only. Now every mutation re-derives the caller's role from the
// session record in Redis and rejects anything but `owner`.
//
// This is DEFENSE IN DEPTH, not the only gate — the middleware gates the
// POST and the UI hides write affordances from non-owners — but a mutating
// action must never trust that the client only sent the request because the
// button was hidden. Nothing here is taken on faith from the request.
// ─────────────────────────────────────────────────────────────────────────────

export type OwnerSession = { email: string; role: AdminRole };

/**
 * Re-derive the caller's session from the cookie and return it ONLY if the
 * role is `owner`. Returns null otherwise — callers that return result
 * objects turn that into `{ ok: false, error: … }`; callers that redirect
 * (the approve/deny form actions) redirect on it.
 */
export async function ownerSession(): Promise<OwnerSession | null> {
  const jar = await cookies();
  const opened = await openSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  if (!opened) return null;
  const session = await getSessionUser(opened.sid);
  if (!session || session.role !== "owner") return null;
  return { email: session.email, role: session.role };
}
