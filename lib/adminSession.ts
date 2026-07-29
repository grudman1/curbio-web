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
// The cookie enforces the IDLE timeout (sliding — middleware reissues when
// less than half the window remains). The ABSOLUTE lifetime and revocation
// live server-side: a Redis record `admin:session:<sid>` with a 7-day TTL,
// deleted on logout. A stolen cookie dies when the session record does —
// that is what makes logout a real invalidation instead of theatre.
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "curbio_admin_session";

/** Idle window carried in the cookie. */
export const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
/** Reissue (slide) when less than this much of the idle window remains. */
export const SESSION_REISSUE_BELOW_MS = SESSION_IDLE_MS / 2;
/** Absolute server-side lifetime — the Redis TTL set at login. */
export const SESSION_ABSOLUTE_S = 7 * 24 * 60 * 60;

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
