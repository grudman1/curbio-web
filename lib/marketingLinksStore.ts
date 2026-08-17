import { Redis } from "@upstash/redis";
import type { TrackedLink } from "./marketingLinks";

// ─────────────────────────────────────────────────────────────────────────────
// Registry rows created in the UI — a Redis hash, marketing:links:v1,
// field = link id, value = JSON TrackedLink.
//
// Reads use the READ-ONLY token (same rule as lib/adminLeads.ts: pages that
// render cannot mutate, enforced by the credential). Writes use the
// read-write token and happen ONLY inside the session-checked server actions
// in app/(site)/marketing/(hub)/links/actions.ts.
// ─────────────────────────────────────────────────────────────────────────────

const LINKS_KEY = "marketing:links:v1";

function readOnlyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

function readWriteRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export type RegistryLinksResult =
  | { configured: false }
  | { configured: true; links: TrackedLink[]; error: string | null };

export async function readRegistryLinks(): Promise<RegistryLinksResult> {
  const redis = readOnlyRedis();
  if (!redis) return { configured: false };
  try {
    const hash = await redis.hgetall<Record<string, TrackedLink | string>>(LINKS_KEY);
    const links: TrackedLink[] = [];
    for (const v of Object.values(hash ?? {})) {
      if (typeof v === "string") {
        try {
          links.push(JSON.parse(v) as TrackedLink);
        } catch {
          /* skip unparsable row rather than blanking the page */
        }
      } else if (v) {
        links.push(v);
      }
    }
    links.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return { configured: true, links, error: null };
  } catch (err) {
    return {
      configured: true,
      links: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Fetch one registry row (server actions use this for the printed-lock
 *  check — the CURRENT stored state decides whether the lock applies). */
export async function readRegistryLink(id: string): Promise<TrackedLink | null> {
  const redis = readOnlyRedis();
  if (!redis) return null;
  const v = await redis.hget<TrackedLink | string>(LINKS_KEY, id);
  if (!v) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as TrackedLink;
    } catch {
      return null;
    }
  }
  return v;
}

/** Write path — server actions only, after the admin-session check. */
export async function writeRegistryLink(link: TrackedLink): Promise<void> {
  const redis = readWriteRedis();
  if (!redis) throw new Error("link store not configured");
  await redis.hset(LINKS_KEY, { [link.id]: JSON.stringify(link) });
}
