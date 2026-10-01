import type { Giveaway } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// eXpcon Salt Lake City 2026 — the Listing-Ready Kit giveaway.
//
// Curbio is a Gold Sponsor, Booth #9 in the Solutions Village, Oct 7–9 at the
// Salt Palace. Visitors are eXp agents on their phones, scanning one QR code
// (curbio.com/expcon) off the booth sign, the postcards, Rick's slide and the
// event-app ad.
//
// The headline says "from" the kit because five people each win ONE of the
// five things in it. The approved design read "Win the Listing-Ready Kit",
// which promises the whole kit to a single winner — and a prize promotion's
// headline has to match its rules.
// ─────────────────────────────────────────────────────────────────────────────
export const expcon: Giveaway = {
  slug: "expcon-2026",
  path: "/expcon",

  meta: {
    title: "Curbio at eXpcon 2026 — Win from the Listing-Ready Kit",
    description:
      "Visiting eXpcon Salt Lake City? Enter Curbio's giveaway in 20 seconds for AirPods, a $100 Amazon " +
      "gift card, or Curbio gear. Booth #9 in the Solutions Village. No purchase necessary.",
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

  // ← Rick's time is not confirmed. Set `time` (e.g. "2:15pm") when it is.
  stage: { speaker: "Rick Rudman", day: "Thursday, Oct 8", place: "eXpo Live Stage", time: null },

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

  prizes: [
    { name: "Apple AirPods", line: "For calls between showings.", icon: "airpods", approxValue: null },
    // The one value that is not an estimate: it is printed on the prize.
    { name: "$100 Amazon gift card", line: "Treat yourself after closing.", icon: "gift", approxValue: "$100" },
    { name: "Curbio duffel", line: "Your open-house go-bag.", icon: "duffel", approxValue: null },
    { name: "Curbio tumbler", line: "Coffee that survives the drive.", icon: "tumbler", approxValue: null },
    { name: "Curbio notepad", line: "For the walkthrough notes.", icon: "notepad", approxValue: null },
  ],
  bonusEntries: 5,

  // ⚠ MISMATCH TO RESOLVE BEFORE GO-LIVE. The page promises 15 minutes, and
  // `general-meeting` is not 15 minutes for anyone: Christine's is 30, Joshua's
  // says 20, and the titles differ per manager (checked 2026-10-01). Either
  // each manager adds a 15-minute event under one shared slug and that slug
  // goes here, or `minutes` and the copy below change to match what exists.
  booking: { eventSlug: "general-meeting", minutes: 15 },

  attribution: {
    // Starts "expcon-", not "exp-realty-": the dashboard recognises estimate
    // sources by prefix, and these must not be mistaken for the eXp partner
    // page's.
    source: "expcon-giveaway-{marketSlug}",
    referralSourceId: "eXp realty",
    defaults: { utm_source: "event", utm_medium: "qr", utm_campaign: "expcon-raffle-oct" },
  },

  routing: {
    toApp: ["yes"],
    afterClose: "all-in-market",
    emailList: "not-sent-to-app",
  },

  emailList: {
    tag: "expcon-2026",
    marketTagPrefix: "expcon-2026-market-",
    answerTagPrefix: "expcon-2026-listing-",
  },

  dealNote: "eXpcon 2026 giveaway · Listing in next 90 days: {answer}",

  rules: {
    path: "/expcon/rules",
    sponsorName: null,
    sponsorAddress: null,
    requestEmail: "team@curbio.com",
    minAge: 18,
    respondWithinDays: 7,
    notifyWithinHours: 48,
  },

  copy: {
    banner: {
      full: "Curbio is a Gold Sponsor at eXpcon Salt Lake City · Oct 7–9 · Booth #9",
      short: "Gold Sponsor at eXpcon · Oct 7–9 · Booth #9",
    },
    headerCta: { full: "Enter the giveaway", short: "Enter to win" },
    hero: {
      pill: "eXpcon 2026 · Salt Palace",
      headline: "Win from the *Listing-Ready* Kit.",
      sub: {
        full:
          "Enjoying your Dirty Soda? That one's on Curbio. Enter in 20 seconds for a chance at AirPods, " +
          "a $100 Amazon gift card, or Curbio gear built for agents on the go. Five winners, one prize each.",
        short: "Enjoying your Dirty Soda? That one's on Curbio. Enter in 20 seconds. Five winners, five prizes.",
      },
    },
    countdown: {
      eyebrow: "Until the drawing",
      note: "Drawing at Booth #9. Need not be present.",
    },
    form: {
      eyebrow: "Giveaway entry · Booth #9",
      title: "Enter to win",
      sub: "Takes about 20 seconds.",
      submit: "Enter the giveaway",
      pending: "Entering…",
      emailOptIn: "You'll also receive occasional emails from Curbio. Unsubscribe anytime.",
    },
    thanks: {
      eyebrow: "Entry confirmed",
      headline: "You're *in*!",
      body: "We'll draw winners Friday, Oct 9 at noon Mountain. Need not be present.",
      updated: "You were already in, so we updated your entry. It still counts once.",
      bonusHeadline: "Get 5 bonus entries.",
      bonusBody: "Book 15 minutes with your local Curbio manager.",
      bonusCta: "Book my 15 minutes",
      bonusAlternative: "Or stop by Booth #9 and talk with our team. Same 5 entries.",
      notListed:
        "We're not in your market yet, and we'll let you know when we are. Stop by Booth #9 and talk with our team for 5 bonus entries.",
      booked: "Booked. Your 5 bonus entries are in.",
    },
    prizes: {
      eyebrow: "What's in the kit",
      headline: "Built for agents who *live in their car*.",
      note: "Five winners, one prize each, drawn in this order.",
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
      bookingCta: "Book 15 minutes now",
    },
  },
};
