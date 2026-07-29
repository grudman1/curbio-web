import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { Redis } from "@upstash/redis";
import { SESSION_ABSOLUTE_S, newSessionId } from "./adminSession";

// ─────────────────────────────────────────────────────────────────────────────
// Admin authentication — NODE RUNTIME ONLY. Imported by the login/logout
// server actions and nothing else. The edge middleware never touches this
// file; it verifies the signed cookie (lib/adminSession.ts) and reads the
// session record with the READ-ONLY Redis token.
//
// ── Redis write scoping ──────────────────────────────────────────────────────
// This module holds the READ-WRITE Upstash credential — the only place under
// /admin that does. It writes exactly two key families:
//
//   admin:session:<sid>   session records (login creates, logout deletes)
//   admin:rl:*            login rate-limit counters
//
// It must NEVER touch leads:* — the lead store stays read-only for the whole
// admin surface (lib/adminLeads.ts holds the read-only token). If hard
// separation is ever wanted, move admin:* to a second Upstash database and
// only this file changes.
//
// ── Fail closed ──────────────────────────────────────────────────────────────
// authConfigured() requires every env var. The middleware 404s /admin/* when
// any is missing; these functions also refuse to run. An admin surface that
// opens when configuration goes missing is worse than one that is down.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

export function authConfigured(): boolean {
  return !!(
    ADMIN_EMAIL &&
    ADMIN_PASSWORD_HASH &&
    ADMIN_SESSION_SECRET &&
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL &&
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
  );
}

export function sessionSecret(): string {
  if (!ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET missing");
  return ADMIN_SESSION_SECRET;
}

// Read-write client — admin:* keys only. See header comment.
function getAuthRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

// A real bcrypt hash of a random throwaway string, used when the submitted
// email does not match. verifyCredentials always runs one bcrypt.compare so
// a wrong email costs the same time as a wrong password — no timing oracle
// on which half was wrong. (Generated once, offline; the plaintext is gone.)
const DUMMY_HASH = "$2b$12$THaZx6aaSQc43ebhqaZcfe7f.5rSazSNADfeWFwjFOYP09yEOqm.G";

/** Constant-time equality on arbitrary strings via fixed-length digests. */
function constantTimeStringEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a, "utf8").digest();
  const db = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(da, db);
}

/**
 * ADMIN_PASSWORD_HASH may be the raw bcrypt hash OR base64 of it.
 *
 * Base64 is what `npm run admin:hash` prints, and it exists because of a
 * real failure: bcrypt hashes contain `$`, and Next's env loader runs
 * dotenv-expand on .env files EVEN INSIDE SINGLE QUOTES — `$2b$12$...`
 * loaded as a 32-char mangled tail and every correct password was rejected.
 * Vercel's env UI stores values verbatim, but `vercel env pull` writes a
 * .env file, so the raw form silently corrupts on the very next local run.
 * Base64 has no `$` and survives every carrier.
 */
function resolveConfiguredHash(): string | null {
  const raw = ADMIN_PASSWORD_HASH;
  if (!raw) return null;
  if (raw.startsWith("$2")) return raw;
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    if (decoded.startsWith("$2")) return decoded;
  } catch {
    /* fall through */
  }
  console.error(
    "[admin-auth] ADMIN_PASSWORD_HASH is neither a bcrypt hash nor base64 of one — every login will fail (closed)."
  );
  return null;
}

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const configuredHash = resolveConfiguredHash();
  if (!ADMIN_EMAIL || !configuredHash) return false;
  const emailOk = constantTimeStringEqual(email.trim().toLowerCase(), ADMIN_EMAIL.toLowerCase());
  const hash = emailOk ? configuredHash : DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hash);
  return emailOk && passwordOk;
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(): Promise<string | null> {
  const redis = getAuthRedis();
  if (!redis) return null;
  const sid = newSessionId();
  await redis.set(
    `admin:session:${sid}`,
    JSON.stringify({ createdAt: new Date().toISOString() }),
    { ex: SESSION_ABSOLUTE_S }
  );
  return sid;
}

export async function destroySession(sid: string): Promise<void> {
  const redis = getAuthRedis();
  if (!redis) return;
  try {
    await redis.del(`admin:session:${sid}`);
  } catch {
    // Logout must still clear the cookie even if Redis hiccups; the record
    // dies at its TTL regardless.
  }
}

// ── Login rate limiting ──────────────────────────────────────────────────────
// The one place in this app where a rate limiter is CORRECT. /api/lead had
// its guards removed because they rejected real leads; a login endpoint is
// the opposite case — the legitimate user is one person who knows the
// password, and everyone hammering it is an attacker.
//
// Fixed windows with doubling backoff: each attempt past the limit doubles
// the window's remaining TTL (capped at 24 h), so probing extends its own
// lockout.

const IP_LIMIT = 5; // attempts / 15 min / IP
const IP_WINDOW_S = 15 * 60;
const ACCT_LIMIT = 10; // attempts / hour, account-wide (single account)
const ACCT_WINDOW_S = 60 * 60;
const BACKOFF_CAP_S = 24 * 60 * 60;

async function bump(redis: Redis, key: string, limit: number, windowS: number): Promise<boolean> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowS);
    return true;
  }
  if (count <= limit) return true;
  // Over the limit: double the remaining lockout, capped.
  const ttl = await redis.ttl(key);
  const next = Math.min(Math.max(ttl, windowS) * 2, BACKOFF_CAP_S);
  await redis.expire(key, next);
  return false;
}

/** Record an attempt and say whether this one may proceed. Fails OPEN only in
 *  the sense that a Redis outage does not lock the single legitimate user out
 *  of their own admin — bcrypt cost still throttles raw guessing. */
export async function loginAttemptAllowed(ip: string): Promise<boolean> {
  const redis = getAuthRedis();
  if (!redis) return true;
  try {
    const [ipOk, acctOk] = await Promise.all([
      bump(redis, `admin:rl:ip:${ip}`, IP_LIMIT, IP_WINDOW_S),
      bump(redis, `admin:rl:acct`, ACCT_LIMIT, ACCT_WINDOW_S),
    ]);
    return ipOk && acctOk;
  } catch {
    return true;
  }
}

/** A successful login clears the counters — the legitimate user fat-fingering
 *  twice should not inherit a lockout. */
export async function clearLoginCounters(ip: string): Promise<void> {
  const redis = getAuthRedis();
  if (!redis) return;
  try {
    await redis.del(`admin:rl:ip:${ip}`, `admin:rl:acct`);
  } catch {
    /* counters expire on their own */
  }
}
