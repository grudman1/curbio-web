// ─────────────────────────────────────────────────────────────────────────────
// MARKETING CONTACTS — the one way this app writes a person to ActiveCampaign.
//
// ActiveCampaign is the long-term home for ALL warm email. Every form that
// collects an email consent calls syncMarketingContact() with a filled-in
// MarketingContact; nothing else in the codebase talks to the contacts API.
// The eXpcon giveaway is the first caller (lib/giveaway/emailList.ts). The
// public lead route does not call this.
//
// What it does, for one person, in this order — and it FAILS CLOSED: if the
// list, any field, any dropdown option or the tag cannot be found by its exact
// name, nothing at all is written.
//
//   0. Resolve the schema by NAME (ids only for reference): the list "Curbio
//      Marketing", the eleven fields below, and the caller's tags.
//   1. Look the email up. One contact per email: an existing contact is
//      updated, never duplicated.
//   2. Anyone who has unsubscribed from, or bounced on, ANY list is left alone:
//      nothing created, changed, subscribed or tagged.
//   3. New contact: created with name, phone and every field.
//      Existing contact: name, phone and Market are never overwritten; Contact
//      Type, Brokerage, HSM and First Source are only filled when empty;
//      Lifecycle Stage only ever moves UP; Listing Timeline, Latest Source and
//      the consent fields take the new values.
//   4. Subscribe to "Curbio Marketing" if not already active on it.
//   5. Add each tag the contact does not already carry.
//
// It never sends email and never touches campaigns, automations or segments.
//
// ── Where it is allowed to run ───────────────────────────────────────────────
// Previews share production's data, so a preview must NEVER call
// ActiveCampaign. Calls are made only when VERCEL_ENV is "production" — or,
// for local testing, when the account URL points at this machine (a stand-in;
// a deployed preview cannot reach localhost). The keys live in Vercel
// Production only and are never logged: errors carry an HTTP status and a
// step name, nothing else.
// ─────────────────────────────────────────────────────────────────────────────

export const MARKETING_LIST_NAME = "Curbio Marketing";

/** Custom fields, by exact title in ActiveCampaign. */
export const FIELD = {
  contactType: "Contact Type",
  market: "Market",
  brokerage: "Brokerage",
  hsmName: "HSM Name",
  hsmEmail: "HSM Email",
  lifecycle: "Lifecycle Stage",
  listingTimeline: "Listing Timeline",
  firstSource: "First Source",
  latestSource: "Latest Source",
  consentSource: "Consent Source",
  consentDate: "Consent Date",
} as const;
type FieldKey = keyof typeof FIELD;

export const CONTACT_TYPES = ["Agent", "Team Lead", "Broker/Owner", "Partner", "Homeowner"] as const;
export const LIFECYCLE = ["Subscriber", "Engaged", "Sales Qualified", "Customer"] as const;
export const LISTING_TIMELINES = ["Within 90 days", "3-6 months", "Not yet"] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];
export type Lifecycle = (typeof LIFECYCLE)[number];
export type ListingTimeline = (typeof LISTING_TIMELINES)[number];

export type MarketingContact = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  contactType: ContactType;
  /** The market config's display name, or "Not listed". */
  market: string;
  brokerage: string;
  hsmName: string;
  hsmEmail: string;
  lifecycle: Lifecycle;
  listingTimeline: ListingTimeline | null;
  /** "<channel> / <campaign>" — never a platform name. Written only once. */
  firstSource: string;
  /** "<channel> / <campaign>" — written every time. */
  latestSource: string;
  /** Where the consent was given, e.g. "eXpcon 2026 giveaway form (checkbox)". */
  consentSource: string;
  /** YYYY-MM-DD — the day the box was ticked. */
  consentDate: string;
  /** Exact tag names, e.g. ["event:expcon-2026"]. Never created here. */
  tags: string[];
};

export type MarketingSyncResult =
  | { status: "synced"; at: string; contactId: string; created: boolean; listIds: number[] }
  | { status: "unsubscribed"; at: string; contactId: string; error: string }
  | { status: "skipped"; at: string; error: string }
  | { status: "not_configured"; at: string }
  | { status: "failed"; at: string; error: string };

// ── Gates ────────────────────────────────────────────────────────────────────

function credentials(): { base: string; key: string } | null {
  const url = process.env.ACTIVECAMPAIGN_ACCOUNT_URL;
  const key = process.env.ACTIVECAMPAIGN_API_KEY;
  return url && key ? { base: `${url.replace(/\/$/, "")}/api/3`, key } : null;
}

function isLocalStandIn(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

/** Keys present AND this is production (or a local stand-in). */
export function marketingContactsEnabled(): boolean {
  const creds = credentials();
  if (!creds) return false;
  return process.env.VERCEL_ENV === "production" || isLocalStandIn(creds.base);
}

/** Addresses that are never synced, whoever calls. */
export function isExcludedAddress(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return domain === "example.com" || domain === "curbio.com" || domain.endsWith(".curbio.com");
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

/** Per-call timeout. Overridable only so the test suite need not wait 8s. */
const CALL_TIMEOUT_MS = Number(process.env.MARKETING_CONTACTS_TIMEOUT_MS) || 8000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One call. Retries a rate limit or server error twice; a timeout is final. */
async function ac(path: string, init?: { method?: string; body?: unknown }): Promise<Response> {
  const creds = credentials();
  if (!creds) throw new Error("ActiveCampaign is not configured");
  let last: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    last = await fetch(`${creds.base}${path}`, {
      method: init?.method ?? "GET",
      headers: { "Api-Token": creds.key, ...(init?.body ? { "content-type": "application/json" } : {}) },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      cache: "no-store",
    });
    if (last.status !== 429 && last.status < 500) return last;
    await sleep(400 * (attempt + 1));
  }
  return last as Response;
}

async function json<T>(res: Response, step: string): Promise<T> {
  // Status and step only: ActiveCampaign echoes submitted contacts in errors.
  if (!res.ok) throw new Error(`${step} failed (HTTP ${res.status})`);
  return (await res.json()) as T;
}

// ── Schema (by exact name, cached per server instance) ───────────────────────

type Schema = {
  listId: number;
  fields: Record<FieldKey, { id: string; options: string[] | null }>;
};
let schemaCache: Schema | null = null;
const tagIdCache = new Map<string, string>();

/** Forget everything resolved — after a 404 on a cached id, and in tests. */
export function resetMarketingSchemaCache(): void {
  schemaCache = null;
  tagIdCache.clear();
}

async function schema(): Promise<Schema> {
  if (schemaCache) return schemaCache;

  const lists = await json<{ lists?: { id: string; name: string }[] }>(
    await ac(`/lists?filters[name]=${encodeURIComponent(MARKETING_LIST_NAME)}&limit=100`),
    "list lookup"
  );
  const exact = (lists.lists ?? []).filter((l) => l.name.trim() === MARKETING_LIST_NAME);
  if (exact.length !== 1) {
    throw new Error(
      exact.length === 0
        ? `ActiveCampaign list "${MARKETING_LIST_NAME}" not found — nothing was written.`
        : `More than one ActiveCampaign list is called "${MARKETING_LIST_NAME}" — nothing was written.`
    );
  }

  // Every custom field, with dropdown options. Paged.
  type F = { id: string; title: string; type: string; options?: string[] };
  type O = { id: string; field: string; value: string; label?: string };
  const all: F[] = [];
  const options: O[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const page = await json<{ fields?: F[]; fieldOptions?: O[]; meta?: { total?: string | number } }>(
      await ac(`/fields?limit=100&offset=${offset}&include=options`),
      "field lookup"
    );
    all.push(...(page.fields ?? []));
    options.push(...(page.fieldOptions ?? []));
    const total = Number(page.meta?.total ?? all.length);
    if ((page.fields ?? []).length < 100 || all.length >= total) break;
  }

  const fields = {} as Schema["fields"];
  const missing: string[] = [];
  for (const key of Object.keys(FIELD) as FieldKey[]) {
    const title = FIELD[key];
    const hits = all.filter((f) => f.title.trim() === title);
    if (hits.length !== 1) {
      missing.push(hits.length ? `"${title}" (more than one)` : `"${title}"`);
      continue;
    }
    const f = hits[0];
    const isList = /dropdown|radio|listbox|checkbox/i.test(f.type);
    fields[key] = {
      id: String(f.id),
      options: isList ? options.filter((o) => String(o.field) === String(f.id)).map((o) => o.value) : null,
    };
  }
  if (missing.length) {
    throw new Error(`ActiveCampaign field${missing.length > 1 ? "s" : ""} ${missing.join(", ")} not found — nothing was written.`);
  }

  // Every value this module can write to a dropdown must exist as an option.
  const need: [FieldKey, readonly string[]][] = [
    ["contactType", CONTACT_TYPES],
    ["lifecycle", LIFECYCLE],
    ["listingTimeline", LISTING_TIMELINES],
  ];
  for (const [key, values] of need) {
    const opts = fields[key].options;
    if (!opts) continue; // a text field accepts anything
    const absent = values.filter((v) => !opts.includes(v));
    if (absent.length) {
      throw new Error(`ActiveCampaign field "${FIELD[key]}" is missing option(s) ${absent.map((v) => `"${v}"`).join(", ")} — nothing was written.`);
    }
  }

  schemaCache = { listId: Number(exact[0].id), fields };
  return schemaCache;
}

async function tagId(name: string): Promise<string> {
  const cached = tagIdCache.get(name);
  if (cached) return cached;
  const data = await json<{ tags?: { id: string; tag: string }[] }>(
    await ac(`/tags?search=${encodeURIComponent(name)}&limit=100`),
    "tag lookup"
  );
  // `search` is a substring match; compare the whole name.
  const id = data.tags?.find((t) => t.tag === name)?.id;
  if (!id) throw new Error(`ActiveCampaign tag "${name}" not found — nothing was written.`);
  tagIdCache.set(name, id);
  return id;
}

// ── The sync ─────────────────────────────────────────────────────────────────

const UNSUBSCRIBED = "2";
const BOUNCED = "3";
const ACTIVE = "1";

type ContactList = { list: string; status: string };
type FieldValue = { id: string; field: string; value: string | null };

/**
 * Sync one consenting person. The CALLER is responsible for consent (only
 * call this for someone who ticked a box) and for serialising calls for one
 * email (the giveaway holds a per-email lock). Never throws.
 */
export async function syncMarketingContact(input: MarketingContact): Promise<MarketingSyncResult> {
  const at = new Date().toISOString();
  if (!marketingContactsEnabled()) return { status: "not_configured", at };
  const email = input.email.trim().toLowerCase();
  if (isExcludedAddress(email)) return { status: "skipped", at, error: "excluded address" };

  try {
    // 0. Schema + tags first: fail closed before any write.
    const s = await schema();
    const tagIds = await Promise.all(input.tags.map(tagId));

    // 1. One contact per email.
    const found = await json<{ contacts?: { id: string }[] }>(
      await ac(`/contacts?email=${encodeURIComponent(email)}`),
      "contact lookup"
    );
    let contactId = found.contacts?.[0]?.id ?? null;

    let memberships: ContactList[] = [];
    let existing = new Map<string, FieldValue>();
    if (contactId) {
      // 2. Unsubscribed or bounced anywhere: leave them alone.
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
          error: `${stopped.status === BOUNCED ? "bounced on" : "unsubscribed from"} list ${stopped.list} — left alone`,
        };
      }
      const fv = await json<{ fieldValues?: FieldValue[] }>(
        await ac(`/contacts/${contactId}/fieldValues`),
        "field value lookup"
      );
      existing = new Map((fv.fieldValues ?? []).map((v) => [String(v.field), v]));
    }

    // 3. Field values.
    const F = s.fields;
    const has = (k: FieldKey) => {
      const v = existing.get(F[k].id)?.value;
      return typeof v === "string" && v.trim() !== "";
    };
    const current = (k: FieldKey) => existing.get(F[k].id)?.value ?? "";
    const values: { field: string; value: string }[] = [];
    const put = (k: FieldKey, v: string) => values.push({ field: F[k].id, value: v });
    const fillIfEmpty = (k: FieldKey, v: string) => {
      if (v && !has(k)) put(k, v);
    };

    if (!contactId) {
      put("contactType", input.contactType);
      put("market", input.market);
      put("brokerage", input.brokerage);
      put("hsmName", input.hsmName);
      put("hsmEmail", input.hsmEmail);
      put("lifecycle", input.lifecycle);
      if (input.listingTimeline) put("listingTimeline", input.listingTimeline);
      put("firstSource", input.firstSource);
      put("latestSource", input.latestSource);
      put("consentSource", input.consentSource);
      put("consentDate", input.consentDate);
    } else {
      fillIfEmpty("contactType", input.contactType);
      fillIfEmpty("brokerage", input.brokerage);
      // Market is never overwritten — and the HSM belongs to the market, so it
      // is only filled together with it. (A contact on file as Seattle must not
      // get a Dallas HSM because somebody picked Dallas on a form.)
      if (!has("market")) {
        put("market", input.market);
        fillIfEmpty("hsmName", input.hsmName);
        fillIfEmpty("hsmEmail", input.hsmEmail);
      }
      // Lifecycle only moves up.
      const was = LIFECYCLE.indexOf(current("lifecycle") as Lifecycle);
      if (LIFECYCLE.indexOf(input.lifecycle) > was) put("lifecycle", input.lifecycle);
      if (input.listingTimeline) put("listingTimeline", input.listingTimeline);
      fillIfEmpty("firstSource", input.firstSource); // set once
      put("latestSource", input.latestSource);
      put("consentSource", input.consentSource);
      put("consentDate", input.consentDate);
    }

    let created = false;
    if (!contactId) {
      const res = await ac("/contacts", {
        method: "POST",
        body: {
          contact: {
            email,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            fieldValues: values,
          },
        },
      });
      if (res.status === 422) {
        // Someone else created it between the lookup and now: one contact per
        // email, so stop and let the next run update it as an existing one.
        throw new Error("contact was created by another request — run Sync now to finish");
      }
      contactId = (await json<{ contact?: { id?: string } }>(res, "contact create")).contact?.id ?? null;
      if (!contactId) throw new Error("contact create returned no id");
      created = true;
    } else if (values.length) {
      // Name and phone are deliberately NOT sent: an existing contact keeps them.
      await json(await ac(`/contacts/${contactId}`, { method: "PUT", body: { contact: { fieldValues: values } } }), "contact update");
    }

    // 4. Subscribe to Curbio Marketing.
    const active = new Set(memberships.filter((m) => m.status === ACTIVE).map((m) => Number(m.list)));
    if (!active.has(s.listId)) {
      const res = await ac("/contactLists", {
        method: "POST",
        body: { contactList: { list: s.listId, contact: contactId, status: 1 } },
      });
      if (res.status === 404) resetMarketingSchemaCache();
      await json(res, "list subscription");
      active.add(s.listId);
    }

    // 5. Tags the contact does not already have.
    let have = new Set<string>();
    if (!created) {
      const t = await ac(`/contacts/${contactId}/contactTags`);
      if (t.ok) have = new Set(((await t.json()) as { contactTags?: { tag: string }[] }).contactTags?.map((x) => String(x.tag)) ?? []);
    }
    for (const id of tagIds) {
      if (have.has(String(id))) continue;
      const res = await ac("/contactTags", { method: "POST", body: { contactTag: { contact: contactId, tag: id } } });
      if (res.status === 404) resetMarketingSchemaCache();
      await json(res, "tagging");
    }

    return { status: "synced", at, contactId, created, listIds: [...active].sort((a, b) => a - b) };
  } catch (err) {
    const msg = err instanceof Error ? (err.name === "TimeoutError" ? "ActiveCampaign did not answer in time" : err.message) : String(err);
    return { status: "failed", at, error: msg };
  }
}

/** "<channel> / <campaign>", the one source format. Never a platform name. */
export function sourceLabel(channel: string | null | undefined, campaign: string | null | undefined): string {
  const c = (channel ?? "").trim() || "direct";
  const k = (campaign ?? "").trim() || "none";
  return `${c} / ${k}`;
}
