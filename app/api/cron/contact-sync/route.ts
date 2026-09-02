import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { applySources, type PromotionEntry } from "@/lib/contactStore";
import { K, getReadWriteRedis } from "@/config/contactStore";
import { normalizeEmail } from "@/config/contactStore";

/**
 * CONTACT SYNC — mirrors Instantly leads and ActiveCampaign subscribers into
 * the contact store.
 *
 * Lives under app/api/cron/ deliberately, outside the app/api/admin/ boundary:
 * Vercel cron invokes these routes directly by path from vercel.json. Moving it
 * inside the boundary changes its URL and silently breaks the schedule — see
 * AGENTS.md, "Named exceptions".
 *
 * READ-ONLY against both platforms. This job never writes to Instantly or AC;
 * the store is a mirror, and a mirror that writes back is a second CRM.
 *
 * ── Why AC is paged and resumable ──
 * AC holds 116,995 contacts, of which ~113,226 are active on a market list
 * (verified live). At the API's 100-per-page that is ~1,130 requests, too many
 * for one invocation. `?cursor=` resumes where the last run stopped and the
 * response reports the next cursor, so a schedule walks the list over several
 * runs rather than timing out on one.
 *
 * ── Why subscription state is read per LIST ──
 * The AC contact object's own `status` is null for every contact in this
 * account — verified against a sample. Subscription state lives on
 * contactLists[].status ('1' active, '2' unsubscribed). Reading contact.status
 * would have marked all 117k people un-subscribed, which is exactly the wrong
 * direction for a list we are protecting. So `opted_in` is derived from the
 * list-scoped query, which returns only active subscribers per list.
 */

const AC_ACCOUNT_URL = process.env.ACTIVECAMPAIGN_ACCOUNT_URL;
const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

/** AC market lists. Membership on ANY of them with status '1' is `opted_in`. */
const AC_LIST_IDS = [3, 4, 5, 6, 7, 8, 9];

const AC_PAGE = 100;
/** Pages per invocation. Keeps a run inside the function timeout; the cursor
 *  carries the rest to the next one. */
const AC_PAGES_PER_RUN = 20;

function verifyCronSecret(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const a = Buffer.from(bearer);
  const b = Buffer.from(CRON_SECRET);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type AcContact = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

/** One page of active subscribers on one list. */
async function fetchAcActivePage(
  listId: number,
  offset: number
): Promise<{ contacts: AcContact[]; total: number } | null> {
  if (!AC_API_KEY || !AC_ACCOUNT_URL) return null;
  const url = `${AC_ACCOUNT_URL}/api/3/contacts?listid=${listId}&status=1&limit=${AC_PAGE}&offset=${offset}`;
  const res = await fetch(url, { headers: { "Api-Token": AC_API_KEY } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    contacts?: AcContact[];
    meta?: { total?: string | number };
  };
  return {
    contacts: json.contacts ?? [],
    total: Number(json.meta?.total ?? 0),
  };
}

type InstantlyLead = {
  email?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  website?: string;
  phone?: string;
  campaign?: string;
};

async function fetchInstantlyLeads(): Promise<InstantlyLead[]> {
  if (!INSTANTLY_API_KEY) return [];
  const res = await fetch("https://api.instantly.ai/api/v2/leads/list", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${INSTANTLY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: 100 }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: InstantlyLead[] };
  return json.items ?? [];
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();

  // Cursor comes from Redis unless the URL overrides it. A scheduled cron
  // cannot rewrite its own query string, so a URL-only cursor would pin every
  // run to page 0 of list 0 — a job that runs hourly, reports success, and
  // never advances past the first 100 contacts.
  const redis = getReadWriteRedis();
  const saved =
    (await redis?.get<{ list: number; offset: number } | string>(K.syncCursor).catch(() => null)) ??
    null;
  const savedCursor =
    typeof saved === "string" ? (JSON.parse(saved) as { list: number; offset: number }) : saved;

  const cursorParam = req.nextUrl.searchParams.get("cursor");
  const listParam = req.nextUrl.searchParams.get("list");
  const cursor = cursorParam !== null ? Number(cursorParam) : (savedCursor?.offset ?? 0);
  const listIndex = listParam !== null ? Number(listParam) : (savedCursor?.list ?? 0);

  const result = {
    startedAt,
    instantly: { leads: 0, error: null as string | null },
    activecampaign: {
      list: AC_LIST_IDS[listIndex] ?? null,
      from: cursor,
      synced: 0,
      total: 0,
      nextCursor: null as number | null,
      nextList: null as number | null,
      error: null as string | null,
    },
  };

  // ── Instantly leads ────────────────────────────────────────────────────────
  // Small today (zero campaigns until cold sends start), so this runs whole.
  try {
    const leads = await fetchInstantlyLeads();
    for (const l of leads) {
      const email = normalizeEmail(l.email);
      if (!email) continue;
      await applySources({
        email,
        patch: { inInstantly: true },
        identity: {
          firstName: l.first_name,
          lastName: l.last_name,
          companyName: l.company_name,
          website: l.website,
          phone: l.phone,
        },
        source: "instantly",
        campaign: l.campaign ?? null,
      });
      result.instantly.leads++;
    }
  } catch (err) {
    result.instantly.error = err instanceof Error ? err.message : "unknown";
  }

  // ── ActiveCampaign active subscribers, one list at a time, paged ───────────
  try {
    const listId = AC_LIST_IDS[listIndex];
    if (listId === undefined) {
      result.activecampaign.error = "list index out of range";
    } else {
      let offset = cursor;
      let total = 0;
      for (let p = 0; p < AC_PAGES_PER_RUN; p++) {
        const page = await fetchAcActivePage(listId, offset);
        if (!page) {
          result.activecampaign.error = "ActiveCampaign request failed";
          break;
        }
        total = page.total;
        if (page.contacts.length === 0) break;

        for (const c of page.contacts) {
          const email = normalizeEmail(c.email);
          if (!email) continue;
          await applySources({
            email,
            // Only the AC flag. No opinion about Instantly.
            patch: { acActive: true },
            identity: { firstName: c.firstName, lastName: c.lastName, phone: c.phone },
            source: "activecampaign",
          });
          result.activecampaign.synced++;
        }
        offset += page.contacts.length;
        if (offset >= total) break;
      }
      result.activecampaign.total = total;
      if (offset < total) {
        result.activecampaign.nextCursor = offset;
        result.activecampaign.nextList = listIndex;
      } else if (listIndex + 1 < AC_LIST_IDS.length) {
        result.activecampaign.nextCursor = 0;
        result.activecampaign.nextList = listIndex + 1;
      }
    }
  } catch (err) {
    result.activecampaign.error = err instanceof Error ? err.message : "unknown";
  }

  // Persist where the walk got to, so the next scheduled run continues rather
  // than restarting. Wrapping to the first list when finished keeps the mirror
  // fresh instead of stopping once.
  if (redis) {
    await redis
      .set(
        K.syncCursor,
        JSON.stringify({
          list: result.activecampaign.nextList ?? 0,
          offset: result.activecampaign.nextCursor ?? 0,
        })
      )
      .catch(() => undefined);
  }

  return NextResponse.json({ ok: true, ...result, finishedAt: new Date().toISOString() });
}

export type { PromotionEntry };
