import { NOT_LISTED, type Giveaway, type ListingAnswer } from "@/config/giveaways";
import { AC_MARKET_FIELD_ID, emailListFor, unknownEmailListSlugs } from "@/config/emailLists";
import type { EmailListRouting, GiveawayEntry } from "./entry";

// ─────────────────────────────────────────────────────────────────────────────
// ADDING A GIVEAWAY ENTRANT TO THE OPT-IN EMAIL LIST (ActiveCampaign).
//
// The first place this app WRITES to ActiveCampaign. The contact store
// (config/contactStore.ts) is still a read-only mirror and stays one — that
// rule is about not keeping a second, editable copy of a contact. This is a
// different thing: a form whose visitor was told "you'll also receive
// occasional emails from Curbio", doing what a sign-up form does. See
// DECISIONS.md → "The giveaway writes to ActiveCampaign".
//
// For each entrant, in this order:
//
//   1. Look the address up. If the person has EVER unsubscribed from (or
//      bounced on) any Curbio list, stop — nothing is created, changed or
//      tagged. A notice line under a button is not the "affirmative consent"
//      CAN-SPAM asks for before mailing someone who opted out, and it is not
//      close.
//   2. Create or update the contact, with the Market field when they are in a
//      market.
//   3. Put them on their market's list — or the Master Contact List when the
//      market has none (config/emailLists.ts) — unless they are already on it.
//   4. Tag them: the event, their market, their 90-day answer.
//
// Every step is idempotent, so a retry — or a re-submission with a changed
// answer — converges on the right state instead of piling up duplicates. The
// one thing that needs undoing on a change is the previous answer's tag.
//
// ── This runs AFTER the visitor has their answer ────────────────────────────
// It is five to nine HTTP calls to a third party with a 5-requests-a-second
// limit. None of that belongs between a tap on "Enter" and "You're in!" on
// conference Wi-Fi, so the submit endpoint stores the entry, responds, and
// only then calls this. The outcome is written back onto the entry, and the
// entries screen can re-run anything that failed.
// ─────────────────────────────────────────────────────────────────────────────

function credentials(): { base: string; key: string } | null {
  const url = process.env.ACTIVECAMPAIGN_ACCOUNT_URL;
  const key = process.env.ACTIVECAMPAIGN_API_KEY;
  return url && key ? { base: `${url.replace(/\/$/, "")}/api/3`, key } : null;
}

export function emailListConfigured(): boolean {
  return credentials() !== null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One ActiveCampaign call. Retries a rate limit or a server error twice, with
 *  a pause — the account allows 5 requests a second and a booth rush will
 *  find that ceiling. Anything else is the caller's to interpret. */
async function ac(path: string, init?: { method?: string; body?: unknown }): Promise<Response> {
  const creds = credentials();
  if (!creds) throw new Error("ActiveCampaign is not configured");
  let last: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    last = await fetch(`${creds.base}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Api-Token": creds.key,
        ...(init?.body ? { "content-type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    if (last.status !== 429 && last.status < 500) return last;
    await sleep(400 * (attempt + 1));
  }
  return last as Response;
}

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    // Status and a short, PII-free label only. ActiveCampaign echoes the
    // submitted contact in some error bodies.
    throw new Error(`${what} failed (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}

// ── Tags ─────────────────────────────────────────────────────────────────────
// Resolved by name once per server instance. A cold start costs one lookup per
// tag; after that the ids are in memory.

const tagIds = new Map<string, string>();

async function tagId(name: string): Promise<string> {
  const cached = tagIds.get(name);
  if (cached) return cached;

  const find = async (): Promise<string | null> => {
    // `search` is a substring match, so "expcon-2026" also returns
    // "expcon-2026-market-atlanta". Compare the whole name.
    const res = await ac(`/tags?search=${encodeURIComponent(name)}&limit=100`);
    const data = await json<{ tags?: { id: string; tag: string }[] }>(res, "tag lookup");
    return data.tags?.find((t) => t.tag === name)?.id ?? null;
  };

  let id = await find();
  if (!id) {
    const res = await ac("/tags", {
      method: "POST",
      body: { tag: { tag: name, tagType: "contact", description: "Created by the giveaway page." } },
    });
    if (res.ok) {
      id = (await res.json() as { tag?: { id?: string } }).tag?.id ?? null;
    }
    // Two entrants arriving together can both try to create the same tag; the
    // loser gets a validation error and finds the winner's on a second look.
    id ??= await find();
  }
  if (!id) throw new Error("tag could not be created");
  tagIds.set(name, id);
  return id;
}

export function marketTag(giveaway: Giveaway, marketSlug: string | null): string {
  return `${giveaway.emailList.marketTagPrefix}${marketSlug ?? NOT_LISTED}`;
}

export function answerTag(giveaway: Giveaway, answer: ListingAnswer): string {
  return `${giveaway.emailList.answerTagPrefix}${answer.replace(/_/g, "-")}`;
}

// ── The sync ─────────────────────────────────────────────────────────────────

type ContactList = { list: string; status: string };

/** Subscription statuses that mean "do not put this person back on a list". */
const UNSUBSCRIBED = "2";
const BOUNCED = "3";
const ACTIVE = "1";

export async function syncEntrantToEmailList(giveaway: Giveaway, entry: GiveawayEntry): Promise<EmailListRouting> {
  const at = new Date().toISOString();
  if (!emailListConfigured()) return { status: "not_configured", at };

  try {
    const bad = unknownEmailListSlugs();
    if (bad.length) throw new Error(`config/emailLists.ts names markets that do not exist: ${bad.join(", ")}`);

    const target = emailListFor(entry.marketSlug);

    // 1. Is this someone who already told us to stop?
    const found = await json<{ contacts?: { id: string }[] }>(
      await ac(`/contacts?email=${encodeURIComponent(entry.email)}`),
      "contact lookup"
    );
    let contactId = found.contacts?.[0]?.id ?? null;
    let memberships: ContactList[] = [];
    if (contactId) {
      const lists = await json<{ contactLists?: ContactList[] }>(
        await ac(`/contacts/${contactId}/contactLists`),
        "list membership lookup"
      );
      memberships = lists.contactLists ?? [];
      const stopped = memberships.find((m) => m.status === UNSUBSCRIBED || m.status === BOUNCED);
      if (stopped) {
        return {
          status: "unsubscribed",
          at,
          contactId,
          error: stopped.status === BOUNCED ? `bounced on list ${stopped.list}` : `unsubscribed from list ${stopped.list}`,
        };
      }
    }

    // 2. Create or update the contact.
    const synced = await json<{ contact?: { id?: string } }>(
      await ac("/contact/sync", {
        method: "POST",
        body: {
          contact: {
            email: entry.email,
            firstName: entry.firstName,
            lastName: entry.lastName,
            phone: entry.phone,
            ...(target.marketValue
              ? { fieldValues: [{ field: String(AC_MARKET_FIELD_ID), value: target.marketValue }] }
              : {}),
          },
        },
      }),
      "contact sync"
    );
    contactId = synced.contact?.id ?? contactId;
    if (!contactId) throw new Error("contact sync returned no id");

    // 3. The list — only if they are not already an active member of it.
    const onTarget = memberships.some((m) => m.list === String(target.listId) && m.status === ACTIVE);
    if (!onTarget) {
      await json(
        await ac("/contactLists", {
          method: "POST",
          body: { contactList: { list: target.listId, contact: contactId, status: 1 } },
        }),
        "list subscription"
      );
    }

    // 4. Tags. On a re-submission the previous answer's tag has to go, or the
    //    contact ends up tagged both "maybe" and "yes".
    const wanted = [giveaway.emailList.tag, marketTag(giveaway, entry.marketSlug), answerTag(giveaway, entry.listing90)];
    if (entry.revisions > 0) await removeStaleTags(giveaway, contactId, new Set(wanted));
    for (const name of wanted) {
      await json(
        await ac("/contactTags", { method: "POST", body: { contactTag: { contact: contactId, tag: await tagId(name) } } }),
        "tagging"
      );
    }

    return { status: "synced", at, contactId, listId: target.listId, error: null };
  } catch (err) {
    return { status: "failed", at, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Drop this giveaway's market and answer tags that no longer describe the
 * entry — someone who re-submitted "Maybe" as "Yes", or picked a different
 * market the second time.
 *
 * Best-effort: a tag that survives is untidy, not wrong enough to fail the
 * sync over, so errors here are swallowed.
 */
async function removeStaleTags(giveaway: Giveaway, contactId: string, keep: Set<string>): Promise<void> {
  try {
    const { marketTagPrefix, answerTagPrefix } = giveaway.emailList;
    const stale = new Set<string>();
    for (const prefix of [marketTagPrefix, answerTagPrefix]) {
      const res = await ac(`/tags?search=${encodeURIComponent(prefix)}&limit=100`);
      if (!res.ok) continue;
      const data = (await res.json()) as { tags?: { id: string; tag: string }[] };
      for (const t of data.tags ?? []) {
        if (!t.tag.startsWith(prefix)) continue;
        tagIds.set(t.tag, t.id);
        if (!keep.has(t.tag)) stale.add(t.id);
      }
    }
    if (stale.size === 0) return;

    const res = await ac(`/contacts/${contactId}/contactTags`);
    if (!res.ok) return;
    const data = (await res.json()) as { contactTags?: { id: string; tag: string }[] };
    for (const ct of data.contactTags ?? []) {
      if (stale.has(ct.tag)) await ac(`/contactTags/${ct.id}`, { method: "DELETE" });
    }
  } catch {
    // See above.
  }
}
