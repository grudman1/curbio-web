import {
  ANSWER_LABEL,
  LISTING_ANSWERS,
  NOT_LISTED,
  type Giveaway,
  type ListingAnswer,
} from "@/config/giveaways";
import { MARKET_BY_SLUG } from "@/config/markets";
import { isUsableEmail, normalizeEmail } from "@/config/contactStore";
import type { Channel } from "@/lib/channels";

// ─────────────────────────────────────────────────────────────────────────────
// A GIVEAWAY ENTRY — the record, and the rules that read it.
//
// ONE ENTRY PER PERSON, and a person is a normalized email address — the same
// identity the contact store uses (config/contactStore.ts), imported rather
// than re-implemented so a zero-width character pasted out of a spreadsheet
// cannot make one human into two entries here and one contact there.
//
// Everything below is a pure function of the record. Nothing in this file
// talks to Redis, the CRM or ActiveCampaign, which is what lets the routing
// rules be read — and tested — in one place.
//
// ── An entry is not a lead ──────────────────────────────────────────────────
// "Qualified = estimate requests only" (config/marketingHub.ts). Entering a
// prize drawing is a hand-raise, not a request for work, so an entry is
// Engaged until something more happens: the entrant says they have a listing
// coming, or books a call. Those two events — and only those — hand the person
// to an HSM. `appDecision` is that rule.
// ─────────────────────────────────────────────────────────────────────────────

/** Why someone holds bonus entries. All three are worth the same: the rules
 *  promise a free route of EQUAL WEIGHT to booking a call. */
export type BonusSource =
  | "booking"
  /** Visited the booth and talked with the team — added by staff. */
  | "booth"
  /** Asked for the bonus in writing — added by staff. */
  | "written";

/** The bonus is awarded ONCE. Someone who visits the booth and then also
 *  books a call holds one bonus, not two. */
export type EntryBonus = {
  source: BonusSource;
  at: string;
  /** Staff email for booth/written; null when the page recorded a booking. */
  by: string | null;
};

/**
 * A booked call. Kept apart from the bonus because it means something the
 * bonus does not: this person asked for a meeting, so they go to an HSM —
 * even if their bonus entries came from visiting the booth first.
 */
export type EntryBooking = {
  at: string;
  /** `page` — the giveaway page saw Calendly confirm it. Evidence, not proof:
   *  it is the visitor's browser saying so.
   *  `reconcile` — found in Calendly's own list by staff before the drawing. */
  via: "page" | "reconcile";
  by: string | null;
  /** Calendly's event URI, when the page was given one. */
  detail?: string;
};

export type AppReason =
  /** Their 90-day answer is one that goes straight to an HSM. */
  | "answer"
  | "booked"
  /** Submitted after the drawing closed, when the page is a contact form. */
  | "after_close"
  /** Sent by an owner from the entries screen. */
  | "manual";

export type AppRouting = {
  /**
   * none            never needed to go
   * sending         a hand-off was started and has not reported back. Written
   *                 BEFORE the request is made, so a request that dies midway
   *                 leaves evidence: the app may or may not have this person,
   *                 and only someone who can look should decide to resend.
   * sent            the app accepted it
   * failed          the app refused it, or could not be reached
   * not_configured  no CRM endpoint in this environment
   * sandbox         not production: nothing was sent, on purpose
   */
  status: "none" | "sending" | "sent" | "failed" | "not_configured" | "sandbox";
  reason?: AppReason;
  at?: string;
  /** Join key into leads:v1 / leads:delivery:v1. */
  leadId?: string;
  crmStatus?: number | null;
  /** The app's estimate id, returned when it accepted the lead — what to search
   *  for in the app to find the deal. Absent on entries sent before this was
   *  recorded, and when the app's answer carried none. */
  estimateId?: number | null;
  error?: string | null;
};

export type EmailListRouting = {
  /**
   * none            not due to be added
   * pending         due, not yet attempted (or attempt in flight)
   * synced          on the list and tagged
   * unsubscribed    they opted out before — left alone, on purpose
   * failed          ActiveCampaign refused or could not be reached; retryable
   * not_configured  no ActiveCampaign credentials in this environment
   * sandbox         not production: nothing was sent, on purpose
   */
  status: "none" | "pending" | "synced" | "unsubscribed" | "failed" | "not_configured" | "sandbox";
  at?: string;
  contactId?: string;
  /** Every list the contact was active on when the sync finished — their
   *  market's (or the Master Contact List) and the Engaged list. For someone
   *  ActiveCampaign already knew, their own lists are included as they were. */
  listIds?: number[];
  error?: string | null;
};

export type EntryAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  /** Derived server-side from utm_source against the closed list. */
  channel: Channel;
  referralSourceId: string;
  entryPoint: "web_form";
  firstTouchChannel: string | null;
  firstTouchCampaign: string | null;
  /** True when the page's own defaults filled in for missing tags — so a
   *  measured arrival and a defaulted one stay distinguishable. */
  defaulted: boolean;
};

export type GiveawayEntry = {
  id: string;
  giveaway: string;
  /** Normalized. The identity key, and the hash field. */
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** A slug from config/markets.ts, or null for "my market isn't listed". */
  marketSlug: string | null;
  /** "form-select" | "form-zip" (not listed, but their ZIP is served) | "none". */
  marketSource: string;
  /** Only collected when the market is not listed. */
  zip: string;
  listing90: ListingAnswer;
  createdAt: string;
  updatedAt: string;
  /** Times the same person re-submitted. Updates, never second entries. */
  revisions: number;
  /** Stored before the entry period closed. Fixed at creation. */
  inEntryPeriod: boolean;
  /**
   * When this person used the page AFTER the entry period — by then it is a
   * plain contact form, so they were asking to be contacted. Null for anyone
   * who has not. It is separate from `inEntryPeriod` because someone can be
   * both: entered on Wednesday (in the drawing) and back on Saturday (wants a
   * call). Absent on entries written before this field existed.
   */
  contactRequestedAt?: string | null;
  /** One of ours — ZZTEST and friends, or a Curbio address. Never drawn,
   *  always shown. Fixed at creation. */
  isTest: boolean;
  bonus: EntryBonus | null;
  booking: EntryBooking | null;
  attribution: EntryAttribution;
  routing: { app: AppRouting; emailList: EmailListRouting };
};

// ── Identity ─────────────────────────────────────────────────────────────────

export { isUsableEmail, normalizeEmail };

export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/** Ten digits, or eleven starting with 1 — a US number someone can be called
 *  on. The form is for US real-estate professionals; anything else is a typo. */
export function isUsablePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

/**
 * Entries that are OURS, and so are never drawn.
 *
 * Test submissions: keyed on the NAME first — the convention we control
 * (DECISIONS.md: `ZZTEST <label>`, and the older `TEST <label>`) — and on a
 * `zztest` mailbox as a second net, because the person running a test on a
 * phone will fat-finger one or the other.
 *
 * And anything from a Curbio address: the Official Rules exclude employees,
 * and a manager demonstrating the form at the booth with their work email
 * should not be able to win the AirPods by doing so.
 *
 * Decided ONCE, when the entry is created (see enterGiveaway). It is not
 * re-evaluated on a re-submission: the form is public, so if it were, anyone
 * who knew a rival's email could re-submit it under the name "Test" and take
 * them out of the drawing.
 */
export function isTestIdentity(name: string, email: string): boolean {
  const n = name.trim();
  if (/^zztest\b/i.test(n) || /^test(\s|$)/i.test(n)) return true;
  const [mailbox = ""] = normalizeEmail(email).split("@");
  return /^zztest([+._-]|$)/i.test(mailbox) || isInternalAddress(email);
}

/**
 * A Curbio address. Besides never being drawn, such an entry is not routed
 * anywhere: the app rejects `@curbio.com` leads outright with a 403
 * (DECISIONS.md → "Test leads must not use `@curbio.com` addresses"), so
 * sending one would only raise a false delivery alarm, and a colleague trying
 * the form does not belong on the marketing list either.
 */
export function isInternalAddress(email: string): boolean {
  return normalizeEmail(email).split("@")[1] === "curbio.com";
}

// ── Input ────────────────────────────────────────────────────────────────────

export type EntryInput = {
  name: string;
  email: string;
  phone: string;
  /** A market slug, or NOT_LISTED. */
  market: string;
  zip: string;
  listing90: ListingAnswer;
};

export type EntryField = "name" | "email" | "phone" | "market" | "zip" | "listing90";

const MAX_NAME = 120;
const MAX_PHONE = 40;
/** The longest address the mail RFCs allow. */
const MAX_EMAIL = 254;
/** Cap for free-text attribution values (utm_*, referral source, first touch). */
export const MAX_TAG = 200;

/**
 * Validate what the form sent. The form checks the same things first; this is
 * the backstop, and it names the fields so the form can point at them.
 *
 * A ZIP is required only when the market is not listed — the one case where
 * it is the only thing that says where the person works.
 */
export function parseEntryInput(body: Record<string, unknown>):
  | { ok: true; input: EntryInput }
  | { ok: false; fields: EntryField[] } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  // Lengths are capped rather than rejected: a real name that runs long is
  // still a real entrant. The caps exist because this endpoint is public and
  // every entry is read back in one piece by the entries screen, the export
  // and the drawing — a few megabyte-long "names" would make all three crawl.
  const name = str(body.name).slice(0, MAX_NAME);
  const email = normalizeEmail(str(body.email));
  const phone = str(body.phone).slice(0, MAX_PHONE);
  const market = str(body.market).slice(0, 64);
  const zip = str(body.zip).slice(0, 32).replace(/\D/g, "").slice(0, 5);
  const listing90 = str(body.listing90).slice(0, 16) as ListingAnswer;

  const fields: EntryField[] = [];
  if (!name) fields.push("name");
  if (email.length > MAX_EMAIL || !isUsableEmail(email)) fields.push("email");
  if (!isUsablePhone(phone)) fields.push("phone");
  // Object.hasOwn, not a bare lookup: `MARKET_BY_SLUG["constructor"]` is truthy.
  if (market !== NOT_LISTED && !Object.hasOwn(MARKET_BY_SLUG, market)) fields.push("market");
  if (market === NOT_LISTED && zip.length !== 5) fields.push("zip");
  if (!LISTING_ANSWERS.includes(listing90)) fields.push("listing90");

  if (fields.length) return { ok: false, fields };
  return { ok: true, input: { name, email, phone, market, zip: market === NOT_LISTED ? zip : "", listing90 } };
}

// ── Rules ────────────────────────────────────────────────────────────────────

/** 1, or 1 + the bonus. The bonus is awarded once, whichever route earned it. */
export function entryCount(entry: Pick<GiveawayEntry, "bonus">, giveaway: Giveaway): number {
  return 1 + (entry.bonus ? giveaway.bonusEntries : 0);
}

/** In the drawing: entered during the entry period, and not one of our tests. */
export function isDrawable(entry: Pick<GiveawayEntry, "inEntryPeriod" | "isTest">): boolean {
  return entry.inEntryPeriod && !entry.isTest;
}

/** Did they book a call (as opposed to earning the bonus the free way)? */
export function hasBooked(entry: Pick<GiveawayEntry, "booking">): boolean {
  return entry.booking !== null;
}

/**
 * Should this person be handed to an HSM — and why?
 *
 * Null means no. A market is a precondition for every branch: the app cannot
 * route a lead with neither a market nor a ZIP, and accepts it anyway, which
 * is how one sat stranded and unnoticed (see app/api/lead/route.ts). An
 * out-of-area entrant is kept, and never sent.
 */
export function appDecision(entry: GiveawayEntry, giveaway: Giveaway): AppReason | null {
  if (!entry.marketSlug) return null;
  if (isInternalAddress(entry.email)) return null;
  if (hasBooked(entry)) return "booked";
  if (giveaway.routing.toApp.includes(entry.listing90)) return "answer";
  // Anyone who used the page once it had become a contact form — whether that
  // was their first visit or they had entered the drawing days earlier.
  const usedContactForm = !entry.inEntryPeriod || !!entry.contactRequestedAt;
  if (usedContactForm && giveaway.routing.afterClose === "all-in-market") return "after_close";
  return null;
}

/** Has the app already got this person? `failed` counts as "not yet" — the
 *  owner retries those by hand, because a blind retry of a request that may
 *  have landed is how duplicate deals are made. */
export function isInApp(entry: Pick<GiveawayEntry, "routing">): boolean {
  return entry.routing.app.status === "sent";
}

/**
 * An earlier hand-off whose outcome is NOT "the app has them": it was refused,
 * or it was started and never reported back. Neither is repeated by the code
 * on its own — the app does not deduplicate, so repeating a request that did
 * land makes a second deal. An owner looks, then retries from the entries
 * screen.
 */
export function needsPersonToResend(entry: Pick<GiveawayEntry, "routing">): boolean {
  return entry.routing.app.status === "failed" || entry.routing.app.status === "sending";
}

/** Due to be with an HSM, and not confirmed there. What the entries screen
 *  counts as needing attention on the app side. */
export function isAppOutstanding(entry: GiveawayEntry, giveaway: Giveaway): boolean {
  if (entry.routing.app.status === "sandbox") return false;
  return appDecision(entry, giveaway) !== null && !isInApp(entry);
}

/** Should this person be on the opt-in email list? */
export function wantsEmailList(entry: GiveawayEntry, giveaway: Giveaway): boolean {
  if (isInternalAddress(entry.email)) return false;
  if (giveaway.routing.emailList === "everyone") return true;
  return appDecision(entry, giveaway) === null;
}

/** The line an HSM reads on the deal. */
export function dealNote(giveaway: Giveaway, answer: ListingAnswer): string {
  return giveaway.dealNote.replace(/\{answer\}/g, ANSWER_LABEL[answer]);
}

/** Lead `source` for an entry that goes to the app. */
export function leadSource(giveaway: Giveaway, marketSlug: string | null): string {
  return giveaway.attribution.source.replace(/\{marketSlug\}/g, marketSlug || "unknown");
}
