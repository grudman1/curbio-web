// ─────────────────────────────────────────────────────────────────────────────
// GIVEAWAY SETTINGS — one file per event prize drawing.
//
// A giveaway page is NOT a campaign page, on purpose. The campaign template
// (config/campaigns/types.ts) deliberately cannot vary the form, its fields or
// the /api/lead contract — that is what keeps /exp and /lp/sell from drifting
// — and a prize drawing needs all three to be different: a market dropdown, a
// 90-day question, an in-place confirmation, and a closing time. So it gets
// its own page, its own form and its own submit endpoint, and shares the
// plumbing instead (attribution capture, channel rules, market list, HSM
// lookup, the lead store's record shapes).
//
// Everything a marketer would want to change for the NEXT event is here:
// dates, booth, prizes, copy, tags, routing. Nothing here is a class name —
// config/ is outside Tailwind's content globs, so a class written in this
// directory would silently produce no CSS.
//
// THE WORD. Utah prohibits gambling, raffles included, so every string a
// visitor can read says "giveaway" or "drawing". The one place the old word
// survives is the utm_campaign tag below, which was already printed into the
// redirect before the wording was settled and is never shown to anyone.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReferralSourceId } from "@/config/campaigns/types";
import type { Channel } from "@/lib/channels";

/** The 90-day question. Stored as the key; `ANSWER_LABEL` is what people see. */
export type ListingAnswer = "yes" | "maybe" | "not_yet";

export const LISTING_ANSWERS: readonly ListingAnswer[] = ["yes", "maybe", "not_yet"] as const;

export const ANSWER_LABEL: Record<ListingAnswer, string> = {
  yes: "Yes",
  maybe: "Maybe",
  not_yet: "Not yet",
};

/** The dropdown value for an agent outside every Curbio market. Not a slug —
 *  config/markets.ts stays the only place a market is named. */
export const NOT_LISTED = "not-listed";

export type PrizeIcon = "airpods" | "gift" | "duffel" | "tumbler" | "notepad";

export type GiveawayPrize = {
  name: string;
  /** One line under the name on the prize card. */
  line: string;
  icon: PrizeIcon;
  /** Path under /public. Omit and the icon shows — photos are a drop-in. */
  photo?: string;
  /** Approximate retail value, for the Official Rules. `null` renders a marked
   *  placeholder so the rules cannot be published with a value nobody set. */
  approxValue: string | null;
};

export type Giveaway = {
  /** Store key, email-list tag and admin URL segment. Never shown to visitors. */
  slug: string;
  /** Where the page is mounted. Matches the printed short link's path so the
   *  link keeps working when curbio.com moves onto this app. */
  path: string;

  meta: { title: string; description: string };
  /** The tab title and link preview once the entry period has ended. A link
   *  shared after the drawing must not still invite people to enter it. */
  metaClosed: { title: string; description: string };

  event: {
    /** "eXpcon Salt Lake City". */
    name: string;
    /** "eXpcon 2026" — the short form used in notes and the email-list tag. */
    shortName: string;
    /** "Oct 7–9". */
    dates: string;
    venue: string;
    hall: string;
    booth: string;
  };

  /**
   * The stage session. `time` is the ONE-LINE EDIT: set it to "2:15pm" and the
   * card reads "Thursday, Oct 8 · eXpo Live Stage · 2:15pm". While it is null
   * the card simply omits it — a visitor never sees a placeholder.
   */
  stage: { speaker: string; day: string; place: string; time: string | null };

  /**
   * End of the entry period, ISO 8601 in UTC. The SERVER clock decides: an
   * entry stored at or after this instant is not in the drawing, whatever the
   * visitor's phone thinks the time is.
   */
  closesAt: string;
  /** How that instant reads to a person. */
  drawing: { long: string; short: string; rulesDate: string; rulesTime: string };
  /** Start of the entry period as the Official Rules state it. */
  opens: string;

  /** In DRAW ORDER: the first name drawn wins the first prize. */
  prizes: GiveawayPrize[];
  /** Extra entries for booking a call — or for the free alternatives. Awarded
   *  once per person, so an entry is worth 1 or 1 + this. */
  bonusEntries: number;

  /**
   * The call an entrant books for the bonus.
   *
   * `eventSlug` is a Calendly event that must exist, under that exact slug, on
   * EVERY manager's profile — the page builds `<profile>/<eventSlug>` and has
   * no way to know if one manager lacks it. `general-meeting` is the event
   * /confirm uses and every manager has it.
   *
   * `minutes` is what the page PROMISES, and nothing checks it against
   * Calendly. The two must be made to agree by a person: either the event
   * named here really is this long, or this number is wrong.
   */
  booking: { eventSlug: string; minutes: number };

  attribution: {
    /** Lead `source`. `{marketSlug}` interpolates, as on campaign pages. */
    source: string;
    referralSourceId: ReferralSourceId;
    /**
     * Applied at SEND TIME when the visitor carries no utm_source of their
     * own, and never persisted — the same two rules as a campaign page's
     * `defaultUtmSource` (see AGENTS.md). The redirect is supposed to supply
     * these; this is the safety net for the day it does not.
     */
    defaults: { utm_source: Channel; utm_medium: string; utm_campaign: string };
  };

  routing: {
    /** 90-day answers that go to the app (and an HSM) the moment they arrive.
     *  Booking a call always does, whatever the answer. */
    toApp: ListingAnswer[];
    /** After `closesAt` the page is a plain contact form with no prize on it,
     *  so anyone who fills it in is asking to be contacted. */
    afterClose: "all-in-market";
    /**
     * Who is added to the opt-in email list.
     *   "not-sent-to-app"  everyone the app did not receive
     *   "everyone"         all entrants, including those an HSM is working
     */
    emailList: "not-sent-to-app" | "everyone";
  };

  emailList: {
    /** The tag every entrant carries. */
    tag: string;
    /** Prefixes for the two per-person tags: `<prefix><market slug>` and
     *  `<prefix><answer>`. */
    marketTagPrefix: string;
    answerTagPrefix: string;
  };

  /** "eXpcon 2026 giveaway · Listing in next 90 days: Yes" — the line an HSM
   *  reads on the deal. `{answer}` interpolates. */
  dealNote: string;

  rules: {
    path: string;
    /** `null` renders a marked placeholder on the rules page. */
    sponsorName: string | null;
    sponsorAddress: string | null;
    /** Where a written request for the bonus entries is sent. */
    requestEmail: string;
    minAge: number;
    respondWithinDays: number;
    notifyWithinHours: number;
  };

  copy: {
    banner: { full: string; short: string };
    headerCta: { full: string; short: string };
    hero: {
      pill: string;
      /** RichText: `*…*` is the amber emphasis. */
      headline: string;
      sub: { full: string; short: string };
    };
    countdown: { eyebrow: string; note: string };
    form: {
      eyebrow: string;
      title: string;
      sub: string;
      submit: string;
      pending: string;
      /** Its own line, under the button — not folded into the fine print. */
      emailOptIn: string;
    };
    thanks: {
      eyebrow: string;
      headline: string;
      body: string;
      updated: string;
      bonusHeadline: string;
      bonusBody: string;
      bonusCta: string;
      /** The free alternative, said wherever the bonus is offered. */
      bonusAlternative: string;
      notListed: string;
      booked: string;
    };
    prizes: { eyebrow: string; headline: string; note: string };
    why: { eyebrow: string; headline: string };
    sold: { eyebrow: string; headline: string };
    closer: { headline: string; cta: string; finePrint: string };
    /** What the page says once the entry period has ended. */
    closed: {
      headline: string;
      sub: string;
      note: string;
      headerCta: string;
      formEyebrow: string;
      formTitle: string;
      formSub: string;
      submit: string;
      thanksHeadline: string;
      thanksBody: string;
      bookingCta: string;
    };
  };
};

/**
 * What the BROWSER is given — the settings above minus everything only the
 * server acts on.
 *
 * The page's client components need the copy, the dates and the prizes. They
 * do not need the routing rules, the email-list tags, the deal note or the
 * default campaign tag, and whatever is passed to a client component is
 * serialised into the page's HTML for anyone to read. Leaving those out keeps
 * the internal campaign tag — the one string here that still says "raffle" —
 * out of the page source entirely.
 */
export type PublicGiveaway = Pick<
  Giveaway,
  "slug" | "path" | "event" | "stage" | "closesAt" | "drawing" | "prizes" | "bonusEntries" | "booking" | "copy"
> & {
  rules: Pick<Giveaway["rules"], "path" | "minAge">;
  attribution: {
    referralSourceId: ReferralSourceId;
    /** For the analytics event only — the server applies the real defaults. */
    defaultUtmSource: Channel;
  };
};

export function publicGiveaway(g: Giveaway): PublicGiveaway {
  return {
    slug: g.slug,
    path: g.path,
    event: g.event,
    stage: g.stage,
    closesAt: g.closesAt,
    drawing: g.drawing,
    prizes: g.prizes,
    bonusEntries: g.bonusEntries,
    booking: g.booking,
    copy: g.copy,
    rules: { path: g.rules.path, minAge: g.rules.minAge },
    attribution: {
      referralSourceId: g.attribution.referralSourceId,
      defaultUtmSource: g.attribution.defaults.utm_source,
    },
  };
}
