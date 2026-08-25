import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { Redis } from "@upstash/redis";
import { isAllowedDomain, isOwnerEmail } from "@/config/adminAccess";
import { SESSION_ABSOLUTE_S, newSessionId } from "./adminSession";

// ─────────────────────────────────────────────────────────────────────────────
// Admin accounts — NODE RUNTIME ONLY. Imported by server actions under
// /admin/login, /admin/signup and /admin/actions.ts, and nothing else. The
// edge middleware never touches this file; it only verifies the signed
// session cookie (lib/adminSession.ts) and confirms the session record still
// exists, using the READ-ONLY Redis token.
//
// ── Why accounts instead of one env-var credential ───────────────────────────
// The previous shape was a single hardcoded email + bcrypt hash in
// ADMIN_EMAIL / ADMIN_PASSWORD_HASH — one password, changed only by running a
// CLI script and pasting a hash into Vercel. That doesn't scale to "other
// internal Curbio people need access" and made every credential rotation an
// infra change instead of a form submission. Accounts now live in Redis, and
// a person chooses their own password through the browser.
//
// ── Redis write scoping ──────────────────────────────────────────────────────
// This module holds the READ-WRITE Upstash credential — the only place under
// /admin that does. It writes three key families, all under the admin:*
// namespace:
//
//   admin:user:<email>    account records (signup creates, approve/deny edit)
//   admin:users           SET of every email ever created — the index used to
//                         list pending requests without a Redis SCAN
//   admin:session:<sid>   session records (login creates, logout deletes)
//   admin:rl:*            login/signup rate-limit counters
//
// It must NEVER touch leads:* — that boundary is unrelated to this one and
// stays enforced by lib/adminLeads.ts holding the read-only token for the
// lead store. Reading admin:* data (e.g. "who is signed in", "list pending
// requests") through this read-write-capable client is fine — the invariant
// that matters is specifically about the lead store, not about Redis access
// in general.
//
// ── Fail closed ──────────────────────────────────────────────────────────────
// authConfigured() requires the session secret + Redis credentials. The
// middleware 404s /admin/* when any is missing.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
const MIN_PASSWORD_LENGTH = 12;

export function authConfigured(): boolean {
  return !!(
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

// A real bcrypt hash of a random throwaway string. Used whenever there is no
// real hash to compare against (unknown email, pending account) so a lookup
// miss costs the same wall-clock time as a wrong password — no timing oracle
// on whether an account exists. (Generated once, offline; the plaintext that
// produced it was never stored anywhere and is gone.)
const DUMMY_HASH = "$2b$12$THaZx6aaSQc43ebhqaZcfe7f.5rSazSNADfeWFwjFOYP09yEOqm.G";

function constantTimeStringEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a, "utf8").digest();
  const db = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(da, db);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ── Accounts ──────────────────────────────────────────────────────────────

export type AdminRole = "owner" | "member";
export type AdminStatus = "pending" | "approved";

export type AdminUser = {
  email: string;
  passwordHash: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
};

const USERS_INDEX_KEY = "admin:users";
const userKey = (email: string) => `admin:user:${normalizeEmail(email)}`;

export async function getUser(email: string): Promise<AdminUser | null> {
  const redis = getAuthRedis();
  if (!redis) return null;
  const raw = await redis.get<AdminUser | string>(userKey(email));
  if (!raw) return null;
  return typeof raw === "string" ? (JSON.parse(raw) as AdminUser) : raw;
}

async function saveUser(user: AdminUser): Promise<void> {
  const redis = getAuthRedis();
  if (!redis) throw new Error("admin Redis unavailable");
  await Promise.all([
    redis.set(userKey(user.email), JSON.stringify(user)),
    redis.sadd(USERS_INDEX_KEY, normalizeEmail(user.email)),
  ]);
}

export type SignupOutcome =
  | { ok: true; status: AdminStatus }
  | { ok: false; reason: "bad-domain" | "weak-password" | "already-pending" | "already-approved" | "unavailable" };

/**
 * Create an account request. Auto-approves as `owner` when the email is on
 * the OWNER_EMAILS allowlist (config/adminAccess.ts) AND no owner exists yet
 * — that "AND" matters: it makes the allowlist a one-time bootstrap, not a
 * standing bypass, so a second signup attempt with an owner email after the
 * first owner is provisioned still requires approval like anyone else.
 * Everyone else lands `pending` until an existing owner approves them.
 */
export async function createSignupRequest(email: string, password: string): Promise<SignupOutcome> {
  const normalized = normalizeEmail(email);
  if (!isAllowedDomain(normalized)) return { ok: false, reason: "bad-domain" };
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, reason: "weak-password" };

  const redis = getAuthRedis();
  if (!redis) return { ok: false, reason: "unavailable" };

  const existing = await getUser(normalized);
  if (existing) {
    return { ok: false, reason: existing.status === "pending" ? "already-pending" : "already-approved" };
  }

  const bootstrapOwner = isOwnerEmail(normalized) && !(await anyOwnerExists());
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  const user: AdminUser = bootstrapOwner
    ? { email: normalized, passwordHash, role: "owner", status: "approved", createdAt: now, approvedAt: now, approvedBy: "bootstrap" }
    : { email: normalized, passwordHash, role: "member", status: "pending", createdAt: now };

  await saveUser(user);
  return { ok: true, status: user.status };
}

async function anyOwnerExists(): Promise<boolean> {
  const redis = getAuthRedis();
  if (!redis) return false;
  const emails = await redis.smembers(USERS_INDEX_KEY);
  if (!emails.length) return false;
  const users = await Promise.all(emails.map((e) => getUser(e)));
  return users.some((u) => u?.role === "owner");
}

export type VerifyOutcome =
  | { ok: true; user: AdminUser }
  | { ok: false; reason: "invalid" | "pending" };

/**
 * Verify email + password. Distinguishes "pending approval" from "wrong
 * credentials" deliberately: this is a domain-gated internal tool, not a
 * public login, so telling a real @curbio.com colleague their request is
 * still pending is better UX than a generic error, and it doesn't leak
 * anything meaningful — signing up already proves the email is real.
 *
 * Still constant-time on the credential check itself: a missing or pending
 * account still runs one bcrypt.compare against DUMMY_HASH, so the password
 * comparison takes the same wall-clock time whether or not the account
 * exists.
 */
export async function verifyCredentials(email: string, password: string): Promise<VerifyOutcome> {
  const user = await getUser(email);
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hash);

  if (!user || !passwordOk) return { ok: false, reason: "invalid" };
  if (user.status === "pending") return { ok: false, reason: "pending" };
  return { ok: true, user };
}

export async function listPendingUsers(): Promise<AdminUser[]> {
  const redis = getAuthRedis();
  if (!redis) return [];
  const emails = await redis.smembers(USERS_INDEX_KEY);
  const users = await Promise.all(emails.map((e) => getUser(e)));
  return users.filter((u): u is AdminUser => !!u && u.status === "pending");
}

export async function approveUser(email: string, approvedBy: string): Promise<void> {
  const user = await getUser(email);
  if (!user) return;
  await saveUser({ ...user, status: "approved", approvedAt: new Date().toISOString(), approvedBy });
}

export async function denyUser(email: string): Promise<void> {
  const redis = getAuthRedis();
  if (!redis) return;
  await Promise.all([redis.del(userKey(email)), redis.srem(USERS_INDEX_KEY, normalizeEmail(email))]);
}

// ── Sessions ──────────────────────────────────────────────────────────────

type SessionRecord = { email: string; role: AdminRole; createdAt: string };

export async function createSession(email: string, role: AdminRole): Promise<string | null> {
  const redis = getAuthRedis();
  if (!redis) return null;
  const sid = newSessionId();
  const record: SessionRecord = { email: normalizeEmail(email), role, createdAt: new Date().toISOString() };
  await redis.set(`admin:session:${sid}`, JSON.stringify(record), { ex: SESSION_ABSOLUTE_S });
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

/**
 * Resolve the signed-in user from a session cookie value. Used for display
 * (whose name shows in the header) AND as the re-check inside mutating
 * actions (see requireOwnerSession in app/(site)/admin/actions.ts) — never
 * trust a client-supplied role, always re-derive it from the session record.
 */
/**
 * Slide the session record's TTL forward from now.
 *
 * This is what turns the 400-day absolute lifetime into "400 days since you
 * last used it" rather than "400 days since you logged in" — without it, an
 * active user would still be logged out roughly once a year for no reason.
 *
 * It CANNOT live in middleware. The edge verifies sessions on the READ-ONLY
 * Upstash credential precisely so a compromised edge can never mint or extend
 * one; see the note in middleware.ts. So the refresh happens here, on Node,
 * where the read-write credential already lives.
 *
 * Never throws: a failed EXPIRE means the session keeps its previous TTL,
 * which is a slightly shorter session, not a broken one.
 */
export async function touchSession(sid: string): Promise<void> {
  const redis = getAuthRedis();
  if (!redis) return;
  try {
    await redis.expire(`admin:session:${sid}`, SESSION_ABSOLUTE_S);
  } catch {
    // Non-fatal by design — see above.
  }
}

export async function getSessionUser(sid: string): Promise<SessionRecord | null> {
  const redis = getAuthRedis();
  if (!redis) return null;
  const raw = await redis.get<SessionRecord | string>(`admin:session:${sid}`);
  if (!raw) return null;
  // Reading a session is proof of use, so it also renews it. Every Node-side
  // consumer (the Control Room shell, every mutation's role check) gets the
  // sliding window for free rather than each remembering to ask for it.
  await touchSession(sid);
  return typeof raw === "string" ? (JSON.parse(raw) as SessionRecord) : raw;
}

// ── Rate limiting ─────────────────────────────────────────────────────────
// The one place in this app where a rate limiter is correct. /api/lead had
// its guards removed because they rejected real leads; a login/signup
// endpoint is the opposite case — every legitimate user is a known Curbio
// colleague, and volume past a modest threshold is an attacker.
//
// Fixed windows with doubling backoff: each attempt past the limit doubles
// the window's remaining TTL (capped at 24 h), so probing extends its own
// lockout.

const IP_LIMIT = 5; // attempts / 15 min / IP
const IP_WINDOW_S = 15 * 60;
const ACCOUNT_LIMIT = 10; // attempts / hour / account
const ACCOUNT_WINDOW_S = 60 * 60;
const BACKOFF_CAP_S = 24 * 60 * 60;

async function bump(redis: Redis, key: string, limit: number, windowS: number): Promise<boolean> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowS);
    return true;
  }
  if (count <= limit) return true;
  const ttl = await redis.ttl(key);
  const next = Math.min(Math.max(ttl, windowS) * 2, BACKOFF_CAP_S);
  await redis.expire(key, next);
  return false;
}

/** Attempt gate for LOGIN, keyed by IP and by the specific account being
 *  targeted — so hammering one person's email can't be masked by spreading
 *  attempts across many IPs, and one attacker IP can't lock out every
 *  account by cycling emails. */
export async function loginAttemptAllowed(ip: string, email: string): Promise<boolean> {
  const redis = getAuthRedis();
  if (!redis) return true;
  try {
    const [ipOk, acctOk] = await Promise.all([
      bump(redis, `admin:rl:login:ip:${ip}`, IP_LIMIT, IP_WINDOW_S),
      bump(redis, `admin:rl:login:acct:${normalizeEmail(email)}`, ACCOUNT_LIMIT, ACCOUNT_WINDOW_S),
    ]);
    return ipOk && acctOk;
  } catch {
    return true;
  }
}

export async function clearLoginCounters(ip: string, email: string): Promise<void> {
  const redis = getAuthRedis();
  if (!redis) return;
  try {
    await redis.del(`admin:rl:login:ip:${ip}`, `admin:rl:login:acct:${normalizeEmail(email)}`);
  } catch {
    /* counters expire on their own */
  }
}

const SIGNUP_IP_LIMIT = 5; // signups / hour / IP — internal tool, not public
const SIGNUP_IP_WINDOW_S = 60 * 60;

/** Separate, looser gate for SIGNUP — prevents someone spraying pending
 *  requests, not a brute-force target the way login is. */
export async function signupAttemptAllowed(ip: string): Promise<boolean> {
  const redis = getAuthRedis();
  if (!redis) return true;
  try {
    return await bump(redis, `admin:rl:signup:ip:${ip}`, SIGNUP_IP_LIMIT, SIGNUP_IP_WINDOW_S);
  } catch {
    return true;
  }
}

/** Constant-time compare, exported for reuse where an arbitrary string
 *  (not an email/hash) needs the same treatment. */
export const timingSafeEqualStr = constantTimeStringEqual;
