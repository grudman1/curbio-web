// ─────────────────────────────────────────────────────────────────────────────
// Admin session cookie — seal / open.
//
// EDGE-SAFE ON PURPOSE: Web Crypto only, no node imports. This module is the
// single implementation used by BOTH the edge middleware (verify + sliding
// reissue) and the Node login/logout actions (issue + revoke), so the two
// runtimes can never disagree about the cookie format.
//
// Format:  <sid>.<expiryMs>.<hmacSha256Hex(sid + "." + expiryMs)>
//
// The cookie enforces the IDLE timeout (sliding — middleware reissues it once
// it is more than a day old). The ABSOLUTE lifetime and revocation live
// server-side: a Redis record `admin:session:<sid>`, refreshed on every
// Node-side session read and deleted on logout. A stolen cookie dies when the
// session record does — that is what makes logout a real invalidation instead
// of theatre.
//
// ── STAY-LOGGED-IN (Gavin, Aug 25) ──────────────────────────────────────────
//
// The ask was: nobody should have to log in again unless they clear cookies.
// Three separate ceilings used to cut a session short, and all three had to
// move — raising one alone does nothing, because the shortest wins:
//
//   1. the cookie's idle window   24h  → 400d   (SESSION_IDLE_MS)
//   2. the cookie's Max-Age       24h  → 400d   (derived from the same const)
//   3. the Redis record's TTL      7d  → 400d   (SESSION_ABSOLUTE_S)
//
// 400 DAYS IS THE CEILING, not a preference. RFC 6265bis caps cookie lifetime
// at 400 days and Chrome has enforced it since v104 — a larger Max-Age is
// silently clamped, so asking for ten years would quietly get you 400 days
// and a false sense of what shipped.
//
// For an ACTIVE user that is effectively permanent: the cookie re-seals a day
// after it was issued, and the Redis record's TTL slides on every Node-side
// read (see touchSession in lib/adminAuth.ts), so both windows keep resetting
// and the 400 days is never approached. A session only dies from disuse —
// 400 days without a single visit — or from an explicit logout.
//
// WHAT THIS COSTS, stated plainly because it is a real trade: this session
// gates lead PII. A laptop left open, or a cookie lifted off a machine, now
// stays authenticated for as long as it keeps being used instead of expiring
// by tomorrow. What still holds: httpOnly + secure + sameSite=strict, and
// logout is a genuine server-side revocation that kills the record for every
// copy of the cookie at once. What is missing, and worth building if this
// ever matters: there is no "sign out everywhere" — destroySession only ends
// the sid it is handed.
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "curbio_admin_session";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Idle window carried in the cookie, and the cookie's Max-Age.
 *
 * 400 days because that is the hard cap browsers enforce (RFC 6265bis; Chrome
 * 104+). Anything larger is clamped to this silently.
 */
export const SESSION_IDLE_MS = 400 * DAY_MS;

/**
 * Reissue (slide) when less than this much of the idle window remains — i.e.
 * once the cookie is more than a day old.
 *
 * Expressed as "the window minus a day" rather than a fraction of it: at a
 * 400-day window the old `IDLE / 2` rule would not have re-sealed the cookie
 * until day 200, so a user active every week would still have been carrying a
 * cookie that expired 400 days after LOGIN rather than 400 days after their
 * last visit. Sliding daily is what makes the window track activity.
 */
export const SESSION_REISSUE_BELOW_MS = SESSION_IDLE_MS - DAY_MS;

/**
 * Absolute server-side lifetime — the Redis TTL set at login and refreshed on
 * every Node-side session read (touchSession). Matches the cookie so neither
 * layer is the one that quietly expires first.
 */
export const SESSION_ABSOLUTE_S = (400 * DAY_MS) / 1000;

const enc = new TextEncoder();

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare. Both args are hex of fixed length in the
 *  valid path; early-exit only on length, which is not secret. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** New random session id — 256 bits, hex. */
export function newSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sealSession(
  sid: string,
  secret: string,
  now: number = Date.now()
): Promise<string> {
  const exp = now + SESSION_IDLE_MS;
  const sig = await hmacHex(secret, `${sid}.${exp}`);
  return `${sid}.${exp}.${sig}`;
}

export type OpenedSession = { sid: string; exp: number };

/** Verify signature + idle expiry. Null on any failure — no partial trust. */
export async function openSession(
  token: string | undefined,
  secret: string,
  now: number = Date.now()
): Promise<OpenedSession | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [sid, expStr, sig] = parts;
  if (!/^[0-9a-f]{64}$/.test(sid)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return null;
  const expected = await hmacHex(secret, `${sid}.${exp}`);
  if (!timingSafeEqualStr(sig, expected)) return null;
  if (exp <= now) return null;
  return { sid, exp };
}
