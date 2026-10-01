import { NOT_LISTED, type Giveaway } from "@/config/giveaways";
import { MARKET_BY_SLUG } from "@/config/markets";
import { deriveChannel } from "@/lib/channels";
import { buildResolvedMarket } from "@/lib/markets";
import { getOperatorLead } from "@/lib/operator";
import { deliverToApp } from "./appDelivery";
import { DRAW_ALGORITHM, newSeed, runDraw, verifyDraw, type DrawTicket } from "./draw";
import { emailListConfigured, syncEntrantToEmailList } from "./emailList";
import {
  appDecision,
  entryCount,
  isDrawable,
  isInApp,
  isTestIdentity,
  normalizeEmail,
  parseEntryInput,
  splitName,
  wantsEmailList,
  type AppReason,
  type BonusSource,
  type EntryAttribution,
  type EntryField,
  type GiveawayEntry,
} from "./entry";
import { deliveryMode, isClosed, storeScope } from "./mode";
import {
  appendLog,
  createEntry,
  getEntry,
  getEntryById,
  readDrawSnapshot,
  readDraws,
  readEntries,
  readSettings,
  saveDraw,
  saveEntry,
  storeConfigured,
  type DrawRecord,
} from "./store";

// ─────────────────────────────────────────────────────────────────────────────
// WHAT CAN HAPPEN TO A GIVEAWAY ENTRY — every operation, in one file.
//
// The public endpoints (app/api/giveaway/*) and the staff screen's actions
// (app/(site)/admin/(dashboard)/giveaway/actions.ts) both call these. Neither
// touches the store, the app or ActiveCampaign directly, so the rules cannot
// be applied one way from the form and another way from the screen.
//
// ── The order that makes an entry safe ──────────────────────────────────────
//   1. the entry is STORED                     ← nothing below can lose it
//   2. it is handed to the app, if it is due   ← awaited; outcome recorded
//   3. the visitor gets their answer
//   4. it is added to the email list, if due   ← after the response
//
// Step 2 is awaited rather than deferred because a lead that silently never
// reached an HSM is the one failure nobody would notice: deferred work that
// dies leaves an entry reading "pending" forever with no alert. It only
// applies to the minority who answer "Yes" or book — everyone else is at
// step 3 as soon as the store write returns.
//
// ── What is never done automatically ────────────────────────────────────────
// A failed hand-off to the app is NOT retried. The app does not deduplicate a
// lead that has a market and no ZIP, so retrying a request that actually
// landed makes a second deal. A failure is recorded, alerted by email, and
// retried by an owner who can look first.
// ─────────────────────────────────────────────────────────────────────────────

const ENTRANT = "entrant";

function trimmed(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Attribution for a new entry.
 *
 * The form sends exactly what it captured from the URL — possibly nothing.
 * The page defaults are applied HERE, in one place, for two reasons: the
 * `defaulted` flag is then true precisely when a default was used, and the
 * safety net does not depend on which JavaScript bundle a phone happens to
 * have cached. The net exists for the day the redirect loses its tags
 * (curbio.com/exp already has). Blank counts as absent — `?utm_source=` must
 * not beat the default.
 *
 * All three defaults apply together or not at all: a visitor carrying a real
 * utm_source keeps their own medium and campaign, even if those are empty,
 * rather than being given half of ours.
 *
 * First touch falls back to THIS submission only when the browser reported no
 * earlier one. That is what "first touch" means for someone we have never
 * seen; it is computed at send time and written nowhere but the entry — never
 * to the visitor's browser (AGENTS.md, rule 2).
 */
function attributionFrom(body: Record<string, unknown>, giveaway: Giveaway): EntryAttribution {
  const d = giveaway.attribution.defaults;
  const supplied = trimmed(body.utm_source);
  const defaulted = supplied === null;

  const utm_source = supplied ?? d.utm_source;
  const utm_medium = defaulted ? d.utm_medium : trimmed(body.utm_medium);
  const utm_campaign = defaulted ? d.utm_campaign : trimmed(body.utm_campaign);
  const channel = deriveChannel(utm_source);

  const firstTouchChannel = trimmed(body.firstTouchChannel);
  return {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content: trimmed(body.utm_content),
    utm_term: trimmed(body.utm_term),
    channel,
    referralSourceId: trimmed(body.referralSourceId) ?? giveaway.attribution.referralSourceId,
    entryPoint: "web_form",
    firstTouchChannel: firstTouchChannel ?? channel,
    firstTouchCampaign: firstTouchChannel ? trimmed(body.firstTouchCampaign) : utm_campaign,
    defaulted,
  };
}

/**
 * "My market isn't listed" plus a ZIP we DO serve is a market — an agent in
 * Marietta may not recognise "Atlanta" as theirs. One operator lookup, inside
 * its own 800ms budget; any failure leaves them not listed, which loses
 * nothing: the entry and the ZIP are kept either way.
 */
async function marketFor(market: string, zip: string): Promise<{ slug: string | null; source: string }> {
  if (market !== NOT_LISTED) return { slug: market, source: "form-select" };
  const resolved = buildResolvedMarket(await getOperatorLead(zip));
  if (resolved && MARKET_BY_SLUG[resolved.slug]) return { slug: resolved.slug, source: "form-zip" };
  return { slug: null, source: "none" };
}

// ── Routing ──────────────────────────────────────────────────────────────────

/**
 * Hand the entry to the app if it is due and not already there. Mutates and
 * returns the entry; the caller saves it.
 */
async function routeToApp(
  giveaway: Giveaway,
  entry: GiveawayEntry,
  reason: AppReason | null,
  by: string,
  /** Set only by an owner's manual retry — see sendToApp. */
  retryLeadId?: string
): Promise<void> {
  if (!reason || isInApp(entry) || entry.routing.app.status === "failed") return;

  const at = new Date().toISOString();
  if (deliveryMode() === "sandbox") {
    entry.routing.app = { status: "sandbox", reason, at };
    return;
  }

  const scope = storeScope(giveaway);
  const settings = await readSettings(scope);
  // "not_configured" is the one earlier attempt this function re-runs by
  // itself (there was no endpoint to refuse it); it re-uses its lead id too.
  const earlierLeadId =
    retryLeadId ?? (entry.routing.app.status === "not_configured" ? entry.routing.app.leadId : undefined);
  const result = await deliverToApp(giveaway, entry, reason, {
    includeDealNote: settings.dealNote,
    retryLeadId: earlierLeadId,
  });
  entry.routing.app = !result.crmAttempted
    ? { status: "not_configured", reason, at, leadId: result.leadId }
    : result.crmOk
      ? { status: "sent", reason, at, leadId: result.leadId, crmStatus: result.crmStatus }
      : { status: "failed", reason, at, leadId: result.leadId, crmStatus: result.crmStatus, error: result.crmError };

  await appendLog(scope, {
    at,
    email: entry.email,
    by,
    action: result.crmOk ? "sent_to_app" : "app_failed",
    detail: `${reason}${result.crmOk ? "" : ` — HTTP ${result.crmStatus ?? "none"}`}`,
  });
}

/** Mark the email-list step as due (or not). The sync itself runs later. */
function queueEmailList(giveaway: Giveaway, entry: GiveawayEntry, changed: boolean): void {
  const current = entry.routing.emailList.status;
  // An unsubscribed contact stays untouched however many times they re-submit.
  if (current === "unsubscribed") return;
  // Someone ALREADY on the list whose market or answer changed is re-synced
  // even if they now go to the app instead: otherwise ActiveCampaign keeps
  // saying "maybe" about a person an HSM is working as a "yes", and the next
  // nurture send to the maybes goes to them.
  const stale = current === "synced" && changed;
  if (!wantsEmailList(entry, giveaway) && !stale) return;
  // On the list and nothing about them changed: leave it.
  if (current === "synced" && !changed) return;
  entry.routing.emailList =
    deliveryMode() === "sandbox"
      ? { status: "sandbox", at: new Date().toISOString() }
      : { status: emailListConfigured() ? "pending" : "not_configured" };
}

/**
 * Run the email-list sync for one entry and write the outcome back. Re-reads
 * the entry first: this runs after the response, and a booking may have
 * arrived in between — writing back a stale copy would erase it.
 */
export async function syncEmailListFor(giveaway: Giveaway, email: string, by: string): Promise<void> {
  const scope = storeScope(giveaway);
  const snapshot = await getEntry(scope, email);
  if (!snapshot || snapshot.routing.emailList.status !== "pending") return;

  const outcome = await syncEntrantToEmailList(giveaway, snapshot);

  const fresh = (await getEntry(scope, email)) ?? snapshot;
  fresh.routing.emailList = outcome;
  await saveEntry(scope, fresh);
  await appendLog(scope, {
    at: outcome.at ?? new Date().toISOString(),
    email,
    by,
    action: "email_list",
    detail: outcome.status + (outcome.error ? ` — ${outcome.error}` : ""),
  });
}

// ── Entering ─────────────────────────────────────────────────────────────────

export type EnterOutcome =
  | {
      ok: true;
      entryId: string;
      /** False when this email had already entered: the entry was updated. */
      created: boolean;
      entries: number;
      inEntryPeriod: boolean;
      marketSlug: string | null;
      /** Work to run after the response has been sent. */
      after: (() => Promise<void>) | null;
    }
  | { ok: false; status: 400 | 503; error: string; fields?: EntryField[] };

export async function enterGiveaway(giveaway: Giveaway, body: Record<string, unknown>): Promise<EnterOutcome> {
  const parsed = parseEntryInput(body);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: `Missing or invalid: ${parsed.fields.join(", ")}`, fields: parsed.fields };
  }
  // No store, no entry. Unlike the lead form there is no "log and carry on"
  // here: telling someone they are in a drawing they are not in is worse than
  // telling them to try again.
  if (!storeConfigured()) {
    return { ok: false, status: 503, error: "We couldn't save your entry. Please try again in a moment." };
  }

  const { input } = parsed;
  const scope = storeScope(giveaway);
  const now = new Date().toISOString();
  const market = await marketFor(input.market, input.zip);
  const { firstName, lastName } = splitName(input.name);

  const fresh: GiveawayEntry = {
    id: crypto.randomUUID(),
    giveaway: giveaway.slug,
    email: input.email,
    name: input.name,
    firstName,
    lastName,
    phone: input.phone,
    marketSlug: market.slug,
    marketSource: market.source,
    zip: input.zip,
    listing90: input.listing90,
    createdAt: now,
    updatedAt: now,
    revisions: 0,
    inEntryPeriod: !isClosed(giveaway),
    isTest: isTestIdentity(input.name, input.email),
    bonus: null,
    booking: null,
    attribution: attributionFrom(body, giveaway),
    routing: { app: { status: "none" }, emailList: { status: "none" } },
  };

  let entry = fresh;
  let changed = false;
  const created = await createEntry(scope, fresh);
  if (created) {
    await appendLog(scope, { at: now, email: entry.email, by: ENTRANT, action: "entered" });
  } else {
    // Same person again. Their answers are updated; their entry, its bonus,
    // its attribution and its place in the drawing are not replaced.
    const existing = await getEntry(scope, input.email);
    if (!existing) {
      return { ok: false, status: 503, error: "We couldn't save your entry. Please try again in a moment." };
    }
    const before = `${existing.marketSlug ?? NOT_LISTED}/${existing.listing90}`;
    entry = {
      ...existing,
      name: input.name,
      firstName,
      lastName,
      phone: input.phone,
      marketSlug: market.slug,
      marketSource: market.source,
      zip: input.zip,
      listing90: input.listing90,
      updatedAt: now,
      revisions: existing.revisions + 1,
      isTest: existing.isTest || fresh.isTest,
    };
    const after = `${entry.marketSlug ?? NOT_LISTED}/${entry.listing90}`;
    changed = before !== after;
    await saveEntry(scope, entry);
    await appendLog(scope, {
      at: now,
      email: entry.email,
      by: ENTRANT,
      action: "updated",
      detail: changed ? `${before} → ${after}` : "no change to market or answer",
    });
  }

  await routeToApp(giveaway, entry, appDecision(entry, giveaway), ENTRANT);
  queueEmailList(giveaway, entry, changed);
  await saveEntry(scope, entry);

  return {
    ok: true,
    entryId: entry.id,
    created,
    entries: entryCount(entry, giveaway),
    inEntryPeriod: entry.inEntryPeriod,
    marketSlug: entry.marketSlug,
    after:
      entry.routing.emailList.status === "pending"
        ? () => syncEmailListFor(giveaway, entry.email, ENTRANT)
        : null,
  };
}

// ── Booking ──────────────────────────────────────────────────────────────────

export type BookedOutcome = { ok: true; entries: number } | { ok: false; status: 404 | 503; error: string };

/**
 * The page saw Calendly confirm a booking. Grants the bonus (once, and only
 * during the entry period) and hands the person to an HSM whatever their
 * 90-day answer was — they asked for a meeting.
 *
 * The caller is the visitor's own browser, so this is a CLAIM. It is honoured
 * immediately and checked against Calendly's own list before the drawing
 * (reconcileBookings).
 */
export async function recordBooking(
  giveaway: Giveaway,
  entryId: string,
  calendlyEventUri: string | null
): Promise<BookedOutcome> {
  if (!storeConfigured()) return { ok: false, status: 503, error: "Store unavailable." };
  const scope = storeScope(giveaway);
  const entry = await getEntryById(scope, entryId);
  if (!entry) return { ok: false, status: 404, error: "Entry not found." };

  const at = new Date().toISOString();
  if (!entry.booking) {
    entry.booking = { at, via: "page", by: null, ...(calendlyEventUri ? { detail: calendlyEventUri.slice(0, 300) } : {}) };
    if (!entry.bonus && !isClosed(giveaway)) {
      entry.bonus = { source: "booking", at, by: null };
      await appendLog(scope, { at, email: entry.email, by: ENTRANT, action: "bonus_added", detail: "booking (page)" });
    }
    entry.updatedAt = at;
    await saveEntry(scope, entry);
  }

  await routeToApp(giveaway, entry, appDecision(entry, giveaway), ENTRANT);
  await saveEntry(scope, entry);
  return { ok: true, entries: entryCount(entry, giveaway) };
}

// ── Staff operations ─────────────────────────────────────────────────────────

export type StaffResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Look up one entry by email, for the bonus tool. Returns only what staff
 *  need to confirm they have the right person. */
export async function findEntrant(
  giveaway: Giveaway,
  rawEmail: string
): Promise<StaffResult<{ firstName: string; market: string | null; entries: number; bonus: BonusSource | null }>> {
  const entry = await getEntry(storeScope(giveaway), normalizeEmail(rawEmail));
  if (!entry) return { ok: false, error: "No entry under that email. They need to enter on the page first." };
  return {
    ok: true,
    firstName: entry.firstName,
    market: entry.marketSlug,
    entries: entryCount(entry, giveaway),
    bonus: entry.bonus?.source ?? null,
  };
}

/**
 * The free alternative: staff add the bonus for someone who visited the booth
 * or asked in writing. Same +5 as booking a call, awarded once.
 *
 * `allowAfterClose` is an owner-only escape hatch for a visit that happened
 * before the deadline and was typed in after it; the log records who and why.
 */
export async function addBonus(
  giveaway: Giveaway,
  rawEmail: string,
  source: Exclude<BonusSource, "booking">,
  by: string,
  allowAfterClose = false
): Promise<StaffResult<{ entries: number; already: boolean }>> {
  const scope = storeScope(giveaway);
  const entry = await getEntry(scope, normalizeEmail(rawEmail));
  if (!entry) return { ok: false, error: "No entry under that email. They need to enter on the page first." };
  if (entry.bonus) return { ok: true, entries: entryCount(entry, giveaway), already: true };
  if (isClosed(giveaway) && !allowAfterClose) {
    return { ok: false, error: "The entry period has closed. An owner can still add a bonus earned before the deadline." };
  }
  const at = new Date().toISOString();
  entry.bonus = { source, at, by };
  entry.updatedAt = at;
  await saveEntry(scope, entry);
  await appendLog(scope, {
    at,
    email: entry.email,
    by,
    action: "bonus_added",
    detail: source + (isClosed(giveaway) ? " (added after close)" : ""),
  });
  return { ok: true, entries: entryCount(entry, giveaway), already: false };
}

/** Withdraw a bonus — for a page-reported booking that Calendly has no record
 *  of. Clears the booking claim with it. Logged; nothing is deleted. */
export async function removeBonus(giveaway: Giveaway, rawEmail: string, by: string, why: string): Promise<StaffResult> {
  const scope = storeScope(giveaway);
  const entry = await getEntry(scope, normalizeEmail(rawEmail));
  if (!entry) return { ok: false, error: "No entry under that email." };
  if (!entry.bonus) return { ok: true };
  const at = new Date().toISOString();
  const was = entry.bonus.source;
  entry.bonus = null;
  if (was === "booking") entry.booking = null;
  entry.updatedAt = at;
  await saveEntry(scope, entry);
  await appendLog(scope, { at, email: entry.email, by, action: "bonus_removed", detail: `${was} — ${why}` });
  return { ok: true };
}

export type ReconcileReport = {
  /** In Calendly and entered, with no booking on record: bonus added. */
  matched: string[];
  /** In Calendly and already recorded as booked. */
  confirmed: string[];
  /** In Calendly, never entered the giveaway. Nothing to do. */
  notEntered: string[];
  /** The page reported a booking that Calendly's list does not contain. */
  unverified: string[];
};

/**
 * Check booking claims against Calendly's own list of invitee emails.
 *
 * `apply: false` only reports. `apply: true` also records the bookings found
 * and hands those people to the app. It never REMOVES a bonus — an unverified
 * claim is listed for an owner to decide on, because Calendly's export can be
 * incomplete (a booking under a different email is still a booking).
 */
export async function reconcileBookings(
  giveaway: Giveaway,
  calendlyEmails: string[],
  by: string,
  apply: boolean
): Promise<StaffResult<{ report: ReconcileReport }>> {
  const scope = storeScope(giveaway);
  const read = await readEntries(scope);
  if (!read.configured || read.error) return { ok: false, error: read.configured ? String(read.error) : "Store not configured." };

  const inCalendly = new Set(calendlyEmails.map(normalizeEmail).filter(Boolean));
  const byEmail = new Map(read.entries.map((e) => [e.email, e]));
  const report: ReconcileReport = { matched: [], confirmed: [], notEntered: [], unverified: [] };

  for (const email of inCalendly) {
    const entry = byEmail.get(email);
    if (!entry) report.notEntered.push(email);
    else if (entry.booking) report.confirmed.push(email);
    else report.matched.push(email);
  }
  for (const entry of read.entries) {
    if (entry.booking?.via === "page" && !inCalendly.has(entry.email)) report.unverified.push(entry.email);
  }

  if (apply) {
    for (const email of report.matched) {
      const entry = await getEntry(scope, email);
      if (!entry || entry.booking) continue;
      const at = new Date().toISOString();
      entry.booking = { at, via: "reconcile", by };
      if (!entry.bonus) {
        entry.bonus = { source: "booking", at, by };
        await appendLog(scope, { at, email, by, action: "bonus_added", detail: "booking (found in Calendly)" });
      }
      entry.updatedAt = at;
      await saveEntry(scope, entry);
      await routeToApp(giveaway, entry, appDecision(entry, giveaway), by);
      await saveEntry(scope, entry);
    }
  }
  return { ok: true, report };
}

/**
 * An owner sends one entry to the app by hand — to retry a failure, or to
 * hand over someone the rules did not. The only path that will re-send after
 * a failure, which is why it belongs to a person and not to a timer.
 */
export async function sendToApp(giveaway: Giveaway, rawEmail: string, by: string): Promise<StaffResult<{ status: string }>> {
  const scope = storeScope(giveaway);
  const entry = await getEntry(scope, normalizeEmail(rawEmail));
  if (!entry) return { ok: false, error: "No entry under that email." };
  if (!entry.marketSlug) return { ok: false, error: "This entrant is outside every Curbio market — the app cannot route them." };
  if (isInApp(entry)) return { ok: true, status: "sent" };

  // Clear a recorded failure so the hand-off runs; the reason it went is kept.
  // An earlier attempt's lead id is carried over, so a retry updates that
  // lead's delivery record instead of adding a second lead for one person.
  const reason = appDecision(entry, giveaway) ?? "manual";
  const earlierLeadId = entry.routing.app.leadId;
  entry.routing.app = { status: "none" };
  await routeToApp(giveaway, entry, reason, by, earlierLeadId);
  entry.updatedAt = new Date().toISOString();
  await saveEntry(scope, entry);
  return entry.routing.app.status === "failed"
    ? { ok: false, error: `The app refused it${entry.routing.app.crmStatus ? ` (HTTP ${entry.routing.app.crmStatus})` : ""}.` }
    : { ok: true, status: entry.routing.app.status };
}

/**
 * Work through entries whose email-list step is outstanding — failed, never
 * configured, or left pending by a request that died. A few at a time: each is
 * several calls to a rate-limited API, and a server action has a time limit.
 * The screen calls this until `remaining` is zero.
 */
export async function syncEmailListBatch(
  giveaway: Giveaway,
  by: string,
  batch = 8
): Promise<StaffResult<{ processed: number; remaining: number }>> {
  if (deliveryMode() === "sandbox") return { ok: false, error: "Sandbox: nothing is sent to ActiveCampaign outside production." };
  if (!emailListConfigured()) return { ok: false, error: "ActiveCampaign is not configured in this environment." };

  const scope = storeScope(giveaway);
  const read = await readEntries(scope);
  if (!read.configured || read.error) return { ok: false, error: read.configured ? String(read.error) : "Store not configured." };

  const due = read.entries.filter(
    (e) =>
      wantsEmailList(e, giveaway) &&
      ["pending", "failed", "not_configured"].includes(e.routing.emailList.status)
  );
  const now = due.slice(0, batch);
  for (const e of now) {
    const entry = await getEntry(scope, e.email);
    if (!entry) continue;
    entry.routing.emailList = { status: "pending" };
    await saveEntry(scope, entry);
    await syncEmailListFor(giveaway, entry.email, by);
  }
  return { ok: true, processed: now.length, remaining: due.length - now.length };
}

// ── The drawing ──────────────────────────────────────────────────────────────

/** Names drawn beyond the prizes, in order — the alternates. */
const ALTERNATES = 10;

export async function runDrawing(
  giveaway: Giveaway,
  by: string,
  mode: "official" | "practice",
  note: string
): Promise<StaffResult<{ record: DrawRecord }>> {
  const scope = storeScope(giveaway);
  if (mode === "official" && !isClosed(giveaway)) {
    return { ok: false, error: "The entry period is still open. Run a practice drawing, or wait until it closes." };
  }
  const previous = await readDraws(scope);
  if (mode === "official" && previous.some((d) => d.mode === "official") && !note.trim()) {
    return { ok: false, error: "An official drawing is already on record. Say why another is needed." };
  }

  const read = await readEntries(scope);
  if (!read.configured || read.error) return { ok: false, error: read.configured ? String(read.error) : "Store not configured." };

  const drawable = read.entries.filter(isDrawable);
  if (drawable.length === 0) return { ok: false, error: "There are no eligible entries to draw from." };

  const tickets: DrawTicket[] = drawable.map((e) => ({ key: e.email, weight: entryCount(e, giveaway) }));
  const seed = newSeed();
  const result = runDraw(tickets, seed, giveaway.prizes.length + ALTERNATES);

  const byEmail = new Map(drawable.map((e) => [e.email, e]));
  const person = (email: string) => {
    const e = byEmail.get(email) as GiveawayEntry;
    return { email, name: e.name, phone: e.phone, entries: entryCount(e, giveaway) };
  };

  const ranAt = new Date().toISOString();
  const record: DrawRecord = {
    id: crypto.randomUUID(),
    giveaway: giveaway.slug,
    mode,
    ranAt,
    ranBy: by,
    algorithm: DRAW_ALGORITHM,
    seed,
    snapshotHash: result.snapshotHash,
    eligiblePeople: drawable.length,
    totalEntries: result.totalWeight,
    excluded: {
      tests: read.entries.filter((e) => e.isTest).length,
      afterClose: read.entries.filter((e) => !e.isTest && !e.inEntryPeriod).length,
    },
    winners: result.order.slice(0, giveaway.prizes.length).map((email, i) => ({
      position: i + 1,
      prize: giveaway.prizes[i].name,
      ...person(email),
    })),
    alternates: result.order.slice(giveaway.prizes.length).map((email, i) => ({ order: i + 1, ...person(email) })),
    note: note.trim(),
  };

  await saveDraw(scope, record, tickets);
  await appendLog(scope, {
    at: ranAt,
    email: null,
    by,
    action: "draw",
    detail: `${mode} — ${drawable.length} people, ${result.totalWeight} entries, list ${result.snapshotHash.slice(0, 12)}`,
  });
  return { ok: true, record };
}

/** Re-run a recorded drawing against its frozen list. */
export async function verifyDrawing(giveaway: Giveaway, drawId: string): Promise<StaffResult<{ verified: boolean; reason?: string }>> {
  const scope = storeScope(giveaway);
  const record = (await readDraws(scope)).find((d) => d.id === drawId);
  if (!record) return { ok: false, error: "That drawing is not on record." };
  const tickets = await readDrawSnapshot(scope, drawId);
  if (!tickets) return { ok: true, verified: false, reason: "The frozen list for this drawing is missing." };
  const order = [...record.winners.map((w) => w.email), ...record.alternates.map((a) => a.email)];
  const check = verifyDraw(tickets, { seed: record.seed, snapshotHash: record.snapshotHash, order });
  return { ok: true, verified: check.ok, reason: check.reason };
}
