import type { Giveaway } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// eXpcon Salt Lake City 2026 — the prize giveaway.
//
// Curbio is a Gold Sponsor, Booth #9 in the Solutions Village, Oct 7–9 at the
// Salt Palace. Visitors are eXp agents on their phones, scanning one QR code
// (sell.curbio.com/expcon, no tags) off the booth sign, the postcards, Rick's slide and the
// event-app ad.
//
// There is ONE prize, the Listing-Ready Kit, and each of the five winners gets
// all of it: AirPods, a $100 Amazon gift card and the three pieces of Curbio
// gear. Nothing on the page, in the rules or in the drawing assigns one item
// to one winner, or draws in an order that means something. Where the copy
// says "five", it is `kit.winners` written out in words — change the one, and
// search this file for the other.
// ─────────────────────────────────────────────────────────────────────────────
export const expcon: Giveaway = {
  slug: "expcon-2026",
  path: "/expcon",

  // The tab title, and — set explicitly in app/(site)/expcon/page.tsx — the
  // link preview when someone shares the page.
  meta: {
    title: "Win the Listing-Ready Kit — Curbio at eXpcon 2026",
    description:
      "Enter Curbio's eXpcon giveaway in 20 seconds. Five agents each win the Listing-Ready Kit: AirPods, " +
      "a $100 Amazon gift card and Curbio gear. Booth #9. No purchase necessary.",
  },
  metaClosed: {
    title: "Curbio at eXpcon 2026",
    description:
      "Curbio's eXpcon Salt Lake City giveaway has closed. Curbio is the pre-listing home improvement " +
      "partner real estate agents trust. Get in touch with your local Curbio manager.",
  },

  event: {
    name: "eXpcon Salt Lake City",
    shortName: "eXpcon 2026",
    dates: "Oct 7–9",
    venue: "Salt Palace",
    hall: "Solutions Village",
    booth: "9",
  },

  // "Hear Rick Rudman, Curbio CEO · Thursday, Oct 8 · 11:30am MT · eXpo Live Stage"
  stage: {
    speaker: "Rick Rudman",
    role: "Curbio CEO",
    day: "Thursday, Oct 8",
    time: "11:30am MT",
    place: "eXpo Live Stage",
  },

  // Fri Oct 9 2026, 12:00pm Mountain. Utah is on daylight time in October
  // (UTC−6), so noon there is 18:00 UTC.
  closesAt: "2026-10-09T18:00:00Z",
  drawing: {
    long: "Fri, Oct 9 at 12:00pm Mountain",
    short: "Friday, Oct 9 at noon Mountain",
    rulesDate: "Friday, October 9, 2026",
    rulesTime: "12:00 p.m. Mountain Time",
  },
  opens: "October 5, 2026",

  // Five identical kits. Every winner receives every item below.
  kit: {
    name: "Listing-Ready Kit",
    winners: 5,
    // Approximate retail value of one kit — $2,500 across the five. Stated in
    // the Official Rules, not on the page.
    approxValueUsd: 500,
    items: [
      { name: "Apple AirPods", line: "For calls between showings.", icon: "airpods" },
      { name: "$100 Amazon gift card", line: "Treat yourself after closing.", icon: "gift" },
      { name: "Curbio duffel", line: "Your open-house go-bag.", icon: "duffel" },
      { name: "Curbio tumbler", line: "Coffee that survives the drive.", icon: "tumbler" },
      { name: "Curbio notepad", line: "For the walkthrough notes.", icon: "notepad" },
    ],
  },
  bonusEntries: 5,

  // `general-meeting` is the event /confirm already books and every manager has
  // it. Its length differs by manager (30 minutes for some, 20 for others,
  // checked 2026-10-01), which is why the page says "a quick call" and never a
  // number.
  booking: { eventSlug: "general-meeting" },

  attribution: {
    // The referral is always "eXp realty": this page is only promoted to eXp
    // agents, and the server ignores any referral_source_id in the URL.
    // Starts "expcon-", not "exp-realty-": the dashboard recognises estimate
    // sources by prefix, and these must not be mistaken for the eXp partner
    // page's.
    source: "expcon-giveaway-{marketSlug}",
    referralSourceId: "eXp realty",
    defaults: { utm_source: "event", utm_medium: "qr", utm_campaign: "expcon-giveaway-oct" },
    // Typed in at the booth or from a written request (admin "Add entry").
    manual: { utm_source: "event", utm_campaign: "expcon-booth-oct" },
  },

  routing: {
    toApp: ["yes"],
    afterClose: "all-in-market",
    // EVERYONE goes on the email list, including the "Yes" leads an HSM is also
    // working (decided 2026-10-01): Marketing's automations key off the answer
    // tag to treat those differently.
    emailList: "everyone",
  },

  emailList: {
    tag: "expcon-2026",
    marketTagPrefix: "expcon-2026-market-",
    answerTagPrefix: "expcon-2026-listing-",
  },

  leadEmails: "failures-only",

  rules: {
    path: "/expcon/rules",
    sponsorName: "Curbio, Inc.",
    sponsorAddress: "3030 Greenmount Ave, Ste 300, Baltimore, MD 21218",
    requestEmail: "team@curbio.com",
    governingLaw: "State of Maryland",
    minAge: 18,
    respondWithinDays: 7,
    notifyWithinHours: 48,
  },

  copy: {
    banner: {
      // A non-breaking space keeps "Booth #9" together on a narrow phone.
      full: "Curbio is a Gold Sponsor at eXpcon Salt Lake City · Oct 7–9 · Booth\u00a0#9",
      short: "Gold Sponsor at eXpcon · Oct 7–9 · Booth\u00a0#9",
    },
    headerCta: { full: "Enter the giveaway", short: "Enter to win" },
    hero: {
      pill: "eXpcon 2026 · Salt Palace",
      headline: "Win the *Listing-Ready Kit*.",
      // The non-breaking space after "a" keeps "a $100 Amazon gift card" from
      // ending a line on a lone "a".
      sub: {
        full: "Five agents each win the whole kit: AirPods, a\u00a0$100 Amazon gift card, and Curbio gear built for agents on the go.",
        short: "Five agents each win the whole kit: AirPods, a\u00a0$100 Amazon gift card, and Curbio gear.",
      },
      // "Enter in 20 seconds" is said here and only here — the form does not
      // repeat it.
      body: "Enjoying your Dirty Soda? That one's on Curbio. Enter in 20 seconds.",
      // Anyone who arrived with a utm_source (email, social, a colleague's
      // link) is not holding a Dirty Soda; they see this instead.
      bodyRemote: "Can't make it to Salt Lake? You can still enter. Enter in 20 seconds.",
    },
    countdown: {
      eyebrow: "Until the drawing",
      note: "Drawing at Booth #9. Need not be present.",
    },
    form: {
      eyebrow: "Giveaway entry · Booth #9",
      title: "Enter to win",
      submit: "Enter the giveaway",
      pending: "Entering…",
      // The label of an OPTIONAL, UNCHECKED box — stored verbatim on the entry
      // as the consent text when someone ticks it. Change it and new consents
      // record the new wording; old ones keep theirs.
      emailOptIn: "Send me occasional emails from Curbio. Unsubscribe anytime.",
    },
    thanks: {
      emailOptional: "Email updates from Curbio are optional and not required to enter.",
      eyebrow: "Entry confirmed",
      headline: "You're *in*!",
      body: "We'll draw winners Friday, Oct 9 at noon Mountain. Need not be present.",
      updated: "You were already in, so we updated your entry. It still counts once.",
      bonusHeadline: "Get 5 bonus entries.",
      bonusBody: "Book a quick call with your local Curbio manager.",
      bonusCta: "Book my quick call",
      bonusAlternative: "Or stop by Booth #9 and talk with our team. Same 5 entries.",
      notListed:
        "We're not in your market yet, and we'll let you know when we are. Stop by Booth #9 and talk with our team for 5 bonus entries.",
      booked: "Booked. Your 5 bonus entries are in.",
    },
    kit: {
      eyebrow: "The Listing-Ready Kit",
      headline: "Built for agents who *live in their car*.",
      label: "{winners} kits. {winners} winners. Every winner gets everything below.",
      badge: "×{winners} winners",
      contents: "Every kit includes",
    },
    why: {
      eyebrow: "Why Curbio",
      headline: "We do the prep. You make the sale. *Seller pays at close.*",
    },
    sold: {
      eyebrow: "Recent projects",
      headline: "Prepped by Curbio. *Sold* by eXp agents.",
    },
    closer: {
      headline: "One listing. You'll wonder *why you waited.*",
      cta: "Enter to win",
      finePrint: "No purchase necessary.",
    },
    // Shown from the closing INSTANT, which is minutes before anyone has run
    // the drawing — and for weeks afterwards. So it says what is true at both
    // moments: entries are closed, and winners hear by email and phone. It
    // does not say the drawing has happened.
    closed: {
      headline: "The giveaway has *closed.*",
      sub:
        "Entries closed Friday, Oct 9 at noon Mountain. Winners are notified by email and phone. " +
        "Curbio is still here for your next listing.",
      note: "Drawing: Friday, Oct 9 at Booth #9. Winners need not be present.",
      headerCta: "Get in touch",
      formEyebrow: "Talk to Curbio",
      formTitle: "Get in touch",
      formSub: "Your local Curbio manager will reach out.",
      submit: "Send",
      thanksHeadline: "Thanks. We'll be *in touch.*",
      thanksBody: "Your local Curbio manager will reach out within one business day.",
      enteredBody: "Entries closed Friday, Oct 9 at noon Mountain. Winners are notified by email and phone.",
      bookingCta: "Book a quick call now",
    },
  },
};
