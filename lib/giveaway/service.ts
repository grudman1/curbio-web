import { NOT_LISTED, type Giveaway } from "@/config/giveaways";
import { MARKET_BY_SLUG } from "@/config/markets";
import { buildResolvedMarket } from "@/lib/markets";
import { getOperatorLead } from "@/lib/operator";
import { deliverToApp, type AlertTestResult } from "./appDelivery";
import { attributionFrom } from "./attribution";
import { DRAW_ALGORITHM, newSeed, runDraw, verifyDraw, type DrawTicket } from "./draw";
import { emailListConfigured, syncEntrantToEmailList } from "./emailList";
import {
  appDecision,
  entryCount,
  isDrawable,
  isInApp,
  isInternalAddress,
  isTestIdentity,
  needsPersonToResend,
  normalizeEmail,
  parseEntryInput,
  splitName,
  wantsEmailList,
  type AppReason,
  type BonusSource,
  type EmailListRouting,
  type EntryField,
  type GiveawayEntry,
} from "./entry";
import { deliveryMode, isClosed, storeScope } from "./mode";
import {
  LOCK_BUSY,
  appendLog,
  createEntry,
  getEntry,
  getEntryById,
  readDrawSnapshot,
  readDraws,
  readEntries,
  saveDraw,
  saveEntry,
  storeConfigured,
  withEntryLock,
  withSyncLock,
  hardDeleteEntry,
  deleteZztestWaitlist,
  readZztestWaitlist,
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
// ── One writer per person ───────────────────────────────────────────────────
// Everything that CHANGES an entry runs inside withEntryLock (store.ts) and
// reads the entry after it has the lock. A double tap, a retry on conference
// Wi-Fi, a booking landing while the form is still being answered, staff
// adding a bonus at the same moment — each waits its turn and sees what the
// one before it wrote. Without that, two requests both read "not sent yet" and
// both post the person to the app.
//
// ── What is never done automatically ────────────────────────────────────────
// A hand-off to the app that failed, or that started and never reported back,
// is NOT repeated by this code. The app does not deduplicate a lead that has a
// market and no ZIP, so repeating a request that actually landed makes a
// second deal. The attempt is written down BEFORE it is made ("sending"), the
// outcome after; whatever is left is an owner's call, made from the entries
// screen by someone who can look in the app first.
// ─────────────────────────────────────────────────────────────────────────────

const ENTRANT = "entrant";

/** What the visitor is told when their entry could not be reached in time. */
const TRY_AGAIN = "We couldn't save your entry. Please try again in a moment.";
/** What staff are told when someone else's change to the same entry is in flight. */
const STAFF_BUSY = "That entry is being updated right now. Try again in a few seconds.";

/**
 * "My market isn't listed" plus a ZIP we DO serve is a market — an agent in
 * Marietta may not recognise "Atlanta" as theirs. One operator lookup, inside
 * its own 800ms budget; any failure leaves them not listed, which loses
 * nothing: the entry and the ZIP are kept either way.
 */
async function marketFor(market: string, zip: string): Promise<{ slug: string | null; source: string }> {
  if (market !== NOT_LISTED) return { slug: market, source: "form-select" };
  const resolved = buildResolvedMarket(await getOperatorLead(zip));
  if (resolved && Object.hasOwn(MARKET_BY_SLUG, resolved.slug)) return { slug: resolved.slug, source: "form-zip" };
  return { slug: null, source: "none" };
}

// ── Routing ──────────────────────────────────────────────────────────────────

/**
 * Hand the entry to the app if it is due and not already there. CALL IT WITH
 * THE ENTRY LOCK HELD. It writes the entry itself, twice: once to record that
 * an attempt is starting, once to record how it ended.
 *
 * `manual` is an owner pressing Send / Retry on the entries screen — the only
 * caller allowed to go again after an attempt that failed or never reported
 * back.
 */
async function routeToApp(
  giveaway: Giveaway,
  entry: GiveawayEntry,
  reason: AppReason | null,
  by: string,
  manual = false
): Promise<void> {
  if (!reason || isInApp(entry)) return;
  if (needsPersonToResend(entry) && !manual) return;

  const at = new Date().toISOString();
  if (deliveryMode() === "sandbox") {
    entry.routing.app = { status: "sandbox", reason, at };
    return;
  }

  const scope = storeScope(giveaway);
  // One lead id per person, for every attempt: it is what keeps a retry from
  // becoming a second row on the Leads screen.
  const leadId = entry.routing.app.leadId ?? crypto.randomUUID();

  // Written down BEFORE the request is made. If this function is killed while
  // the app is still thinking, the entry says "sending" — not "none", which
  // the next submission would read as "never tried" and post again.
  entry.routing.app = { status: "sending", reason, at, leadId };
  await saveEntry(scope, entry);

  const result = await deliverToApp(giveaway, entry, reason, { leadId });
  entry.routing.app = !result.crmAttempted
    ? { status: "not_configured", reason, at, leadId }
    : result.crmOk
      ? { status: "sent", reason, at, leadId, crmStatus: result.crmStatus, estimateId: result.crmEstimateId }
      : { status: "failed", reason, at, leadId, crmStatus: result.crmStatus, error: result.crmError };
  await saveEntry(scope, entry);

  if (result.crmAttempted) {
    await appendLog(scope, {
      at,
      email: entry.email,
      by,
      action: result.crmOk ? "sent_to_app" : "app_failed",
      detail: `${reason}${result.crmOk ? "" : ` — HTTP ${result.crmStatus ?? "none"}`}`,
    });
  }
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
  const stale = current === "synced" && changed && entry.emailConsent === true;
  if (!wantsEmailList(entry, giveaway) && !stale) return;
  // On the list and nothing about them changed: leave it.
  if (current === "synced" && !changed) return;
  entry.routing.emailList =
    deliveryMode() === "sandbox"
      ? { status: "sandbox", at: new Date().toISOString() }
      : { status: emailListConfigured() ? "pending" : "not_configured" };
}

/**
 * Run the email-list sync for one entry and write the outcome back.
 *
 * Two locks, held at different times. The SYNC lock is held throughout, so two
 * syncs for one contact never interleave their tag changes. The ENTRY lock is
 * taken only to write the outcome — the several ActiveCampaign calls in
 * between must not hold up the entrant's own next request.
 *
 * It reads the entry again before writing, and compares: if the person
 * re-submitted with a different market or answer while the sync ran, what was
 * just synced is already out of date. The entry is left "pending" and the
 * re-submission's own sync — waiting on the sync lock — does it properly.
 */
export async function syncEmailListFor(
  giveaway: Giveaway,
  email: string,
  by: string
): Promise<EmailListRouting["status"] | null> {
  const scope = storeScope(giveaway);
  const done = await withSyncLock(scope, email, async () => {
    const snapshot = await getEntry(scope, email);
    if (!snapshot || snapshot.routing.emailList.status !== "pending") return null;

    const outcome = await syncEntrantToEmailList(giveaway, snapshot);

    const written = await withEntryLock(scope, email, async () => {
      const fresh = await getEntry(scope, email);
      if (!fresh) return false;
      const movedOn = fresh.marketSlug !== snapshot.marketSlug || fresh.listing90 !== snapshot.listing90;
      if (movedOn && fresh.routing.emailList.status === "pending") return false;
      fresh.routing.emailList = outcome;
      await saveEntry(scope, fresh);
      return true;
    });
    if (written !== true) return null;

    await appendLog(scope, {
      at: outcome.at ?? new Date().toISOString(),
      email,
      by,
      action: "email_list",
      detail: outcome.status + (outcome.error ? ` — ${outcome.error}` : ""),
    });
    return outcome.status;
  });
  return done === LOCK_BUSY ? null : done;
}

// ── Entering ─────────────────────────────────────────────────────────────────

export type EnterOutcome =
  | {
      ok: true;
      entryId: string;
      /** False when this email had already entered: the entry was updated. */
      created: boolean;
      entries: number;
      /** Is this person in the drawing? Fixed when they first entered. */
      inEntryPeriod: boolean;
      /** Had the entry period ended when THIS submission arrived? Then it was
       *  the contact form they used, whatever `inEntryPeriod` says. */
      closed: boolean;
      marketSlug: string | null;
      /** Work to run after the response has been sent. */
      after: (() => Promise<void>) | null;
    }
  | { ok: false; status: 400 | 503; error: string; fields?: EntryField[] };

/** Request facts the route can see and the body cannot vouch for. */
export type EnterMeta = { ip: string | null; referer: string | null };

/** The page the box was shown on: the page's own report, else the Referer. */
function consentPageUrl(body: Record<string, unknown>, meta: EnterMeta): string | null {
  const v = typeof body.pageUrl === "string" && body.pageUrl.trim() ? body.pageUrl.trim() : meta.referer;
  return v ? v.slice(0, 500) : null;
}

export async function enterGiveaway(
  giveaway: Giveaway,
  body: Record<string, unknown>,
  meta: EnterMeta = { ip: null, referer: null }
): Promise<EnterOutcome> {
  const parsed = parseEntryInput(body);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: `Missing or invalid: ${parsed.fields.join(", ")}`, fields: parsed.fields };
  }
  // No store, no entry. Unlike the lead form there is no "log and carry on"
  // here: telling someone they are in a drawing they are not in is worse than
  // telling them to try again.
  if (!storeConfigured()) return { ok: false, status: 503, error: TRY_AGAIN };

  const { input } = parsed;
  const scope = storeScope(giveaway);
  // Before the lock: it is a call to another service, and it only reads.
  const market = await marketFor(input.market, input.zip);
  const { firstName, lastName } = splitName(input.name);

  const result = await withEntryLock(scope, input.email, async () => {
    // ONE reading of the clock decides everything about this submission: when
    // it happened, and which side of the deadline it fell on.
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const closedNow = isClosed(giveaway, nowMs);
    // The box is optional and unchecked; only a literal `true` counts.
    const ticked = body.emailConsent === true;
    const consentNow = {
      text: giveaway.copy.form.emailOptIn,
      at: now,
      pageUrl: consentPageUrl(body, meta),
      ip: meta.ip ? meta.ip.slice(0, 64) : null,
    };

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
      inEntryPeriod: !closedNow,
      contactRequestedAt: closedNow ? now : null,
      isTest: isTestIdentity(input.name, input.email),
      bonus: null,
      booking: null,
      attribution: attributionFrom(body, giveaway),
      routing: { app: { status: "none" }, emailList: { status: "none" } },
      emailConsent: ticked,
      emailConsentDetail: consentNow,
    };

    let entry = fresh;
    let changed = false;
    const created = await createEntry(scope, fresh);
    if (created) {
      await appendLog(scope, { at: now, email: entry.email, by: ENTRANT, action: "entered" });
    } else {
      // Same person again. Their answers are updated; their entry, its bonus,
      // its attribution, its place in the drawing and whether it is one of
      // ours are not replaced.
      const existing = await getEntry(scope, input.email);
      if (!existing) return null;
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
        // The first time they use the page after the close is the one recorded.
        contactRequestedAt: existing.contactRequestedAt ?? (closedNow ? now : null),
        // Ticking now grants consent with this submission's evidence; NOT
        // ticking never revokes an earlier tick.
        ...(ticked
          ? { emailConsent: true, emailConsentDetail: consentNow }
          : existing.emailConsent === true
            ? {}
            : { emailConsent: false, emailConsentDetail: existing.emailConsentDetail ?? consentNow }),
      };
      const after = `${entry.marketSlug ?? NOT_LISTED}/${entry.listing90}`;
      changed = before !== after;
      const consentGranted = ticked && existing.emailConsent !== true;
      await saveEntry(scope, entry);
      await appendLog(scope, {
        at: now,
        email: entry.email,
        by: ENTRANT,
        action: "updated",
        detail:
          (changed ? `${before} → ${after}` : "no change to market or answer") +
          (consentGranted ? " · ticked email consent" : "") +
          (closedNow && existing.inEntryPeriod ? " (contact form, after the close)" : ""),
      });
    }

    await routeToApp(giveaway, entry, appDecision(entry, giveaway), ENTRANT);
    queueEmailList(giveaway, entry, changed);
    await saveEntry(scope, entry);
    return { entry, created, closedNow };
  });

  if (result === LOCK_BUSY || result === null) return { ok: false, status: 503, error: TRY_AGAIN };
  const { entry, created, closedNow } = result;

  return {
    ok: true,
    entryId: entry.id,
    created,
    entries: entryCount(entry, giveaway),
    inEntryPeriod: entry.inEntryPeriod,
    closed: closedNow,
    marketSlug: entry.marketSlug,
    after:
      entry.routing.emailList.status === "pending"
        ? async () => {
            await syncEmailListFor(giveaway, entry.email, ENTRANT);
          }
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
  const found = await getEntryById(scope, entryId);
  if (!found) return { ok: false, status: 404, error: "Entry not found." };

  const entries = await withEntryLock(scope, found.email, async () => {
    const entry = await getEntry(scope, found.email);
    if (!entry) return null;

    const nowMs = Date.now();
    const at = new Date(nowMs).toISOString();
    if (!entry.booking) {
      entry.booking = { at, via: "page", by: null, ...(calendlyEventUri ? { detail: calendlyEventUri.slice(0, 300) } : {}) };
      if (!entry.bonus && entry.inEntryPeriod && !isClosed(giveaway, nowMs)) {
        entry.bonus = { source: "booking", at, by: null };
        await appendLog(scope, { at, email: entry.email, by: ENTRANT, action: "bonus_added", detail: "booking (page)" });
      }
      entry.updatedAt = at;
      await saveEntry(scope, entry);
    }

    await routeToApp(giveaway, entry, appDecision(entry, giveaway), ENTRANT);
    await saveEntry(scope, entry);
    return entryCount(entry, giveaway);
  });

  if (entries === LOCK_BUSY) return { ok: false, status: 503, error: "Busy. Try again." };
  if (entries === null) return { ok: false, status: 404, error: "Entry not found." };
  return { ok: true, entries };
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
  const email = normalizeEmail(rawEmail);
  const result = await withEntryLock(scope, email, async (): Promise<StaffResult<{ entries: number; already: boolean }>> => {
    const entry = await getEntry(scope, email);
    if (!entry) return { ok: false, error: "No entry under that email. They need to enter on the page first." };
    if (entry.bonus) return { ok: true, entries: entryCount(entry, giveaway), already: true };
    if (!entry.inEntryPeriod) {
      return { ok: false, error: "This person first used the page after the entry period, so they are not in the drawing." };
    }
    const closed = isClosed(giveaway);
    if (closed && !allowAfterClose) {
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
      detail: source + (closed ? " (added after close)" : ""),
    });
    return { ok: true, entries: entryCount(entry, giveaway), already: false };
  });
  return result === LOCK_BUSY ? { ok: false, error: STAFF_BUSY } : result;
}

/** Withdraw a bonus — for a page-reported booking that Calendly has no record
 *  of. Clears the booking claim with it. Logged; nothing is deleted. */
export async function removeBonus(giveaway: Giveaway, rawEmail: string, by: string, why: string): Promise<StaffResult> {
  const scope = storeScope(giveaway);
  const email = normalizeEmail(rawEmail);
  const result = await withEntryLock(scope, email, async (): Promise<StaffResult> => {
    const entry = await getEntry(scope, email);
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
  });
  return result === LOCK_BUSY ? { ok: false, error: STAFF_BUSY } : result;
}

export type ReconcileReport = {
  /** In Calendly and entered, with no booking on record yet. */
  matched: string[];
  /** In Calendly and already recorded as booked. */
  confirmed: string[];
  /** In Calendly, never entered the giveaway. Nothing to do. */
  notEntered: string[];
  /** Holds the bonus BECAUSE the page reported a booking, and Calendly's list
   *  does not contain them. Someone whose bonus came from a booth visit is not
   *  listed, whatever their booking claim says: their entries do not rest on it. */
  unverified: string[];
};

function reconcileReport(entries: GiveawayEntry[], inCalendly: Set<string>): ReconcileReport {
  const byEmail = new Map(entries.map((e) => [e.email, e]));
  const report: ReconcileReport = { matched: [], confirmed: [], notEntered: [], unverified: [] };
  for (const email of inCalendly) {
    const entry = byEmail.get(email);
    if (!entry) report.notEntered.push(email);
    else if (entry.booking) report.confirmed.push(email);
    else report.matched.push(email);
  }
  for (const entry of entries) {
    if (entry.booking?.via === "page" && entry.bonus?.source === "booking" && !inCalendly.has(entry.email)) {
      report.unverified.push(entry.email);
    }
  }
  return report;
}

/** How many bookings one "Record" press writes. Each can include a hand-off to
 *  the app, and a server action has a time limit; the screen asks again while
 *  any are left. */
const RECONCILE_BATCH = 8;

/**
 * Check booking claims against Calendly's own list of invitee emails.
 *
 * `apply: false` only reports. `apply: true` records up to RECONCILE_BATCH of
 * the bookings found, hands those people to the app, and reports again — so
 * what comes back is always what is true NOW, and "matched" is what is left.
 * It never REMOVES a bonus — an unverified claim is listed for an owner to
 * decide on, because Calendly's export can be incomplete (a booking under a
 * different email is still a booking).
 *
 * The bonus is only given to someone who entered during the entry period; the
 * paste is trusted to be bookings made before the deadline — the screen says
 * so, and nothing here can check it.
 */
export async function reconcileBookings(
  giveaway: Giveaway,
  calendlyEmails: string[],
  by: string,
  apply: boolean
): Promise<StaffResult<{ report: ReconcileReport; recorded: number }>> {
  const scope = storeScope(giveaway);
  const inCalendly = new Set(calendlyEmails.map(normalizeEmail).filter(Boolean));

  const read = await readEntries(scope);
  if (!read.configured || read.error) return { ok: false, error: read.configured ? String(read.error) : "Store not configured." };
  const report = reconcileReport(read.entries, inCalendly);
  if (!apply) return { ok: true, report, recorded: 0 };

  let recorded = 0;
  for (const email of report.matched.slice(0, RECONCILE_BATCH)) {
    const done = await withEntryLock(scope, email, async () => {
      const entry = await getEntry(scope, email);
      if (!entry || entry.booking) return false;
      const at = new Date().toISOString();
      entry.booking = { at, via: "reconcile", by };
      if (!entry.bonus && entry.inEntryPeriod) {
        entry.bonus = { source: "booking", at, by };
        await appendLog(scope, { at, email, by, action: "bonus_added", detail: "booking (found in Calendly)" });
      }
      entry.updatedAt = at;
      await saveEntry(scope, entry);
      await routeToApp(giveaway, entry, appDecision(entry, giveaway), by);
      await saveEntry(scope, entry);
      return true;
    });
    if (done === true) recorded++;
  }

  const again = await readEntries(scope);
  if (!again.configured || again.error) return { ok: true, report, recorded };
  return { ok: true, report: reconcileReport(again.entries, inCalendly), recorded };
}

/**
 * An owner sends one entry to the app by hand — to retry a failure, to resolve
 * a hand-off that never reported back, or to hand over someone the rules did
 * not. The only path that will go again after either, which is why it belongs
 * to a person and not to a timer.
 */
export async function sendToApp(giveaway: Giveaway, rawEmail: string, by: string): Promise<StaffResult<{ status: string }>> {
  const scope = storeScope(giveaway);
  const email = normalizeEmail(rawEmail);
  const result = await withEntryLock(scope, email, async (): Promise<StaffResult<{ status: string }>> => {
    const entry = await getEntry(scope, email);
    if (!entry) return { ok: false, error: "No entry under that email." };
    if (!entry.marketSlug) return { ok: false, error: "This entrant is outside every Curbio market — the app cannot route them." };
    if (isInternalAddress(entry.email)) return { ok: false, error: "The app rejects Curbio addresses, so this one is not sent." };
    if (isInApp(entry)) return { ok: true, status: "sent" };

    await routeToApp(giveaway, entry, appDecision(entry, giveaway) ?? "manual", by, true);
    entry.updatedAt = new Date().toISOString();
    await saveEntry(scope, entry);
    return entry.routing.app.status === "failed"
      ? { ok: false, error: `The app refused it${entry.routing.app.crmStatus ? ` (HTTP ${entry.routing.app.crmStatus})` : ""}.` }
      : { ok: true, status: entry.routing.app.status };
  });
  return result === LOCK_BUSY ? { ok: false, error: STAFF_BUSY } : result;
}

/** Email-list states that mean "due, and not done". `sandbox` counts once
 *  deliveries are live again: those entries were marked while they were paused. */
const LIST_OUTSTANDING: EmailListRouting["status"][] = ["pending", "failed", "not_configured", "sandbox"];

/** Is this entry's email-list step still owed? Shared with the entries screen
 *  so its count and this function's work list are the same list. */
export function isEmailListOutstanding(entry: GiveawayEntry, giveaway: Giveaway): boolean {
  return wantsEmailList(entry, giveaway) && LIST_OUTSTANDING.includes(entry.routing.emailList.status);
}

/**
 * Work through entries whose email-list step is outstanding — failed, never
 * configured, or left pending by a request that died. A few at a time: each is
 * several calls to a rate-limited API, and a server action has a time limit.
 * The screen calls this until nothing is left.
 *
 * `runStartedAt` is when the person pressed the button. Anything attempted
 * since then is skipped, so an entry that keeps failing is tried once per run
 * and the run moves on to the others — without it, the same few failures would
 * be retried forever and nobody behind them would ever be reached. Oldest
 * first, for the same reason.
 */
export async function syncEmailListBatch(
  giveaway: Giveaway,
  by: string,
  runStartedAt: string,
  batch = 8
): Promise<StaffResult<{ synced: number; failed: number; remaining: number }>> {
  if (deliveryMode() === "sandbox") return { ok: false, error: "Sandbox: nothing is sent to ActiveCampaign outside production." };
  if (!emailListConfigured()) return { ok: false, error: "ActiveCampaign is not configured in this environment." };

  const scope = storeScope(giveaway);
  const read = await readEntries(scope);
  if (!read.configured || read.error) return { ok: false, error: read.configured ? String(read.error) : "Store not configured." };

  const due = read.entries
    .filter((e) => isEmailListOutstanding(e, giveaway))
    .filter((e) => !(e.routing.emailList.at && e.routing.emailList.at >= runStartedAt))
    .reverse(); // readEntries is newest first
  const now = due.slice(0, batch);

  let synced = 0;
  let failed = 0;
  for (const e of now) {
    const queued = await withEntryLock(scope, e.email, async () => {
      const entry = await getEntry(scope, e.email);
      if (!entry || !isEmailListOutstanding(entry, giveaway)) return false;
      entry.routing.emailList = { status: "pending" };
      await saveEntry(scope, entry);
      return true;
    });
    if (queued !== true) continue;
    const status = await syncEmailListFor(giveaway, e.email, by);
    if (status === "synced" || status === "unsubscribed") synced++;
    else {
      failed++;
      // Whatever went wrong, stamp it so this run does not pick it up again.
      await withEntryLock(scope, e.email, async () => {
        const entry = await getEntry(scope, e.email);
        if (!entry || entry.routing.emailList.status !== "pending") return;
        entry.routing.emailList = { status: "failed", at: new Date().toISOString(), error: "The sync did not finish. Try again." };
        await saveEntry(scope, entry);
      });
    }
  }
  return { ok: true, synced, failed, remaining: due.length - now.length };
}

// ── The drawing ──────────────────────────────────────────────────────────────

/** Names drawn beyond the winners, in order — the alternates. */
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
  // One draw produces everyone: the winners first, then the alternates. Each
  // winner gets the SAME whole kit, so nothing below ties a name to a prize.
  const winners = giveaway.kit.winners;
  const result = runDraw(tickets, seed, winners + ALTERNATES);

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
    winners: result.order.slice(0, winners).map(person),
    alternates: result.order.slice(winners).map((email, i) => ({ order: i + 1, ...person(email) })),
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

/** Record that an owner pressed "Send a test alert", and what came of it. */
export async function logAlertTest(giveaway: Giveaway, by: string, result: AlertTestResult): Promise<void> {
  await appendLog(storeScope(giveaway), {
    at: new Date().toISOString(),
    email: null,
    by,
    action: "alert_test",
    detail: result.ok ? `sent to ${result.to}` : `FAILED — ${result.error}`,
  });
}


// ── Booth tools: manual entries, delete, restore ─────────────────────────────
//
// Any signed-in admin may use all of these (Gavin, 2026-10-07: "no owner/staff
// distinction on this screen"). Every one writes who did it to the log.

/** The official drawing has run: the list is frozen — no delete, no restore. */
export async function isFrozen(giveaway: Giveaway): Promise<boolean> {
  return (await readDraws(storeScope(giveaway))).some((d) => d.mode === "official");
}
const FROZEN = "The official drawing has run, so the list is frozen. Nothing can be deleted or restored.";

export type ManualInput = {
  name: string;
  email: string;
  phone: string;
  market: string; // slug or NOT_LISTED
  zip: string;
  listing90: string;
  method: "booth" | "written";
  addBonus: boolean;
  contactConsent: boolean;
};

export type ManualResult =
  | { ok: true; created: true; entries: number; inEntryPeriod: boolean; app: string; name: string }
  | {
      ok: false;
      error: string;
      fields?: EntryField[];
      /** The email already has an entry: not duplicated. The screen offers +5. */
      existing?: { email: string; name: string; entries: number; hasBonus: boolean; deleted: boolean };
    };

/**
 * Staff type in an entry for someone at the booth, or from a written request.
 * Same identity rules as the page (one entry per email, ZZTEST is "ours"),
 * same deadline rule (saved after the close, but not in the drawing). Never
 * synced to the email list. Sent to the app ONLY for Yes + a served market +
 * the contact box (appDecision).
 */
export async function addManualEntry(giveaway: Giveaway, raw: ManualInput, by: string): Promise<ManualResult> {
  const parsed = parseEntryInput(raw as unknown as Record<string, unknown>);
  if (!parsed.ok) return { ok: false, error: `Missing or invalid: ${parsed.fields.join(", ")}`, fields: parsed.fields };
  if (raw.method !== "booth" && raw.method !== "written") return { ok: false, error: "Choose how they asked to be entered." };
  if (!storeConfigured()) return { ok: false, error: "The entry store is not configured." };

  const { input } = parsed;
  const scope = storeScope(giveaway);
  const existingFirst = await getEntry(scope, input.email);
  if (existingFirst) {
    return {
      ok: false,
      error: "This email already has an entry — nothing was added.",
      existing: {
        email: existingFirst.email,
        name: existingFirst.name,
        entries: entryCount(existingFirst, giveaway),
        hasBonus: existingFirst.bonus !== null,
        deleted: !!existingFirst.deletedAt,
      },
    };
  }

  const market = await marketFor(input.market, input.zip);
  const { firstName, lastName } = splitName(input.name);
  const m = giveaway.attribution.manual;

  const result = await withEntryLock(scope, input.email, async (): Promise<ManualResult> => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const closedNow = isClosed(giveaway, nowMs);
    const entry: GiveawayEntry = {
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
      inEntryPeriod: !closedNow,
      contactRequestedAt: null,
      isTest: isTestIdentity(input.name, input.email),
      bonus: raw.addBonus && !closedNow ? { source: raw.method, at: now, by } : null,
      booking: null,
      attribution: {
        utm_source: m.utm_source,
        utm_medium: null,
        utm_campaign: m.utm_campaign,
        utm_content: null,
        utm_term: null,
        channel: m.utm_source,
        referralSourceId: giveaway.attribution.referralSourceId,
        entryPoint: "manual",
        firstTouchChannel: m.utm_source,
        firstTouchCampaign: m.utm_campaign,
        defaulted: false,
      },
      routing: { app: { status: "none" }, emailList: { status: "none" } },
      origin: "manual",
      // Always: staff typing an entry in is not the person ticking a box.
      emailConsent: false,
      emailConsentDetail: null,
      addedBy: by,
      method: raw.method,
      contactConsent: !!raw.contactConsent,
      deletedAt: null,
      deletedBy: null,
    };
    const created = await createEntry(scope, entry);
    if (!created) return { ok: false, error: "This email already has an entry — nothing was added." };
    await appendLog(scope, {
      at: now,
      email: entry.email,
      by,
      action: "added_manually",
      detail:
        `${raw.method === "booth" ? "booth" : "written request"} · ${input.listing90}` +
        (entry.bonus ? ` · +${giveaway.bonusEntries}` : "") +
        (raw.contactConsent ? " · asked to be contacted" : "") +
        (closedNow ? " · after the close (not in the drawing)" : ""),
    });
    if (entry.bonus) {
      await appendLog(scope, { at: now, email: entry.email, by, action: "bonus_added", detail: raw.method });
    }
    await routeToApp(giveaway, entry, appDecision(entry, giveaway), by);
    await saveEntry(scope, entry);
    return {
      ok: true,
      created: true,
      entries: entryCount(entry, giveaway),
      inEntryPeriod: entry.inEntryPeriod,
      app: entry.routing.app.status,
      name: entry.name,
    };
  });
  return result === LOCK_BUSY ? { ok: false, error: STAFF_BUSY } : result;
}

/** Soft delete a REAL entry: off the list and out of the drawing, restorable.
 *  Its lead records stay — it is a real lead. */
export async function softDeleteEntry(giveaway: Giveaway, rawEmail: string, by: string): Promise<StaffResult> {
  if (await isFrozen(giveaway)) return { ok: false, error: FROZEN };
  const scope = storeScope(giveaway);
  const email = normalizeEmail(rawEmail);
  const result = await withEntryLock(scope, email, async (): Promise<StaffResult> => {
    const entry = await getEntry(scope, email);
    if (!entry) return { ok: false, error: "No entry under that email." };
    if (entry.deletedAt) return { ok: true };
    const at = new Date().toISOString();
    entry.deletedAt = at;
    entry.deletedBy = by;
    entry.updatedAt = at;
    await saveEntry(scope, entry);
    await appendLog(scope, { at, email, by, action: "deleted", detail: `${entry.name} — soft delete, lead records kept` });
    return { ok: true };
  });
  return result === LOCK_BUSY ? { ok: false, error: STAFF_BUSY } : result;
}

export async function restoreEntry(giveaway: Giveaway, rawEmail: string, by: string): Promise<StaffResult> {
  if (await isFrozen(giveaway)) return { ok: false, error: FROZEN };
  const scope = storeScope(giveaway);
  const email = normalizeEmail(rawEmail);
  const result = await withEntryLock(scope, email, async (): Promise<StaffResult> => {
    const entry = await getEntry(scope, email);
    if (!entry) return { ok: false, error: "No entry under that email." };
    if (!entry.deletedAt) return { ok: true };
    const at = new Date().toISOString();
    entry.deletedAt = null;
    entry.deletedBy = null;
    entry.updatedAt = at;
    await saveEntry(scope, entry);
    await appendLog(scope, { at, email, by, action: "restored", detail: entry.name });
    return { ok: true };
  });
  return result === LOCK_BUSY ? { ok: false, error: STAFF_BUSY } : result;
}

/** Hard delete ONE test entry ("ours"), with a backup first. Refuses anything
 *  that is not a test entry — a real person is only ever soft-deleted. */
export async function hardDeleteTestEntry(
  giveaway: Giveaway,
  rawEmail: string,
  by: string
): Promise<StaffResult<{ leadRows: number; backupKey: string }>> {
  if (await isFrozen(giveaway)) return { ok: false, error: FROZEN };
  const scope = storeScope(giveaway);
  const email = normalizeEmail(rawEmail);
  const result = await withEntryLock(scope, email, async (): Promise<StaffResult<{ leadRows: number; backupKey: string }>> => {
    const entry = await getEntry(scope, email);
    if (!entry) return { ok: false, error: "No entry under that email." };
    if (!entry.isTest) return { ok: false, error: "Not a test entry. Real entries are soft-deleted so they can be restored." };
    const done = await hardDeleteEntry(scope, entry, by);
    await appendLog(scope, {
      at: new Date().toISOString(),
      email,
      by,
      action: "hard_deleted",
      detail: `${entry.name} — test entry; ${done.leadRows} lead row(s) removed; backup in ${done.backupKey}`,
    });
    return { ok: true, leadRows: done.leadRows, backupKey: done.backupKey };
  });
  return result === LOCK_BUSY ? { ok: false, error: STAFF_BUSY } : result;
}

export async function countTestRecords(giveaway: Giveaway): Promise<{ entries: number; waitlist: number }> {
  const read = await readEntries(storeScope(giveaway));
  const entries = read.configured && !read.error ? read.entries.filter((e) => e.isTest).length : 0;
  return { entries, waitlist: (await readZztestWaitlist()).length };
}

/** "Delete all test entries": every "ours" entry (hard, with backup) and every
 *  ZZTEST waitlist sign-up. */
export async function deleteAllTestEntries(
  giveaway: Giveaway,
  by: string
): Promise<StaffResult<{ entries: number; leadRows: number; waitlist: number; backupKey: string }>> {
  if (await isFrozen(giveaway)) return { ok: false, error: FROZEN };
  const scope = storeScope(giveaway);
  const read = await readEntries(scope);
  if (!read.configured || read.error) return { ok: false, error: read.configured ? String(read.error) : "Store not configured." };
  let entries = 0;
  let leadRows = 0;
  let backupKey = "";
  for (const e of read.entries.filter((x) => x.isTest)) {
    const r = await hardDeleteTestEntry(giveaway, e.email, by);
    if (r.ok) {
      entries++;
      leadRows += r.leadRows;
      backupKey = r.backupKey;
    }
  }
  const waitlist = await deleteZztestWaitlist(scope, by);
  if (waitlist) {
    await appendLog(scope, {
      at: new Date().toISOString(),
      email: null,
      by,
      action: "hard_deleted",
      detail: `${waitlist} ZZTEST waitlist sign-up(s); backup in ${scope.sandbox ? "sandbox " : ""}deleted-backup`,
    });
  }
  return { ok: true, entries, leadRows, waitlist, backupKey: backupKey || `giveaway:${giveaway.slug}${scope.sandbox ? ":sandbox" : ""}:deleted-backup` };
}
