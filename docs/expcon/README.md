# eXpcon 2026 giveaway — runbook

Everything a person needs to run the eXpcon giveaway: the QR code, how to
go live, the test script, what to do on drawing day, and what is still open.

The page is `sell.curbio.com/expcon`. The Official Rules are at
`/expcon/rules`. The staff screen is `/admin/giveaway`.

Settings (dates, booth, the kit, copy, tags, routing) are in one file:
`config/giveaways/expcon.ts`.

---

## 1. The QR code and the links

The printed QR code encodes **`https://sell.curbio.com/expcon`** and nothing
else — no short link, no WordPress redirect, no tags in the URL (decided
2026-10-02, before anything was printed). Print files are in `docs/expcon/qr/`
(SVG for the printer, 2419px PNG; level-H error correction, so a thumb over a
corner or glare still scans). They were read back with the operating system's
own QR detector at full size, 300px, 120px and from the SVG.

A visitor with no tags in the URL gets the page's own defaults: Channel
`event`, UtmSource `event`, UtmMedium `qr`, UtmCampaign `expcon-giveaway-oct`,
first touch written once. The entry is marked "defaulted" so it can be told
apart from a measured arrival.

Every other way the page is promoted has a row on the **Links screen**
(`/admin/site/links`, the rows labelled "eXpcon 2026 ·"), so nobody types a UTM by hand:

| Link | Tags | Lands as |
| --- | --- | --- |
| Email (opt-in) | `utm_source=email&utm_medium=e&utm_campaign=nurture-expcon-oct` | Email |
| Email (cold) | `utm_source=email&utm_medium=e&utm_campaign=cold-expcon-oct` | Email |
| Curbio LinkedIn / Instagram / Facebook | `utm_source=organic&utm_medium=social&utm_campaign=social-expcon-oct&utm_content=linkedin` (or `instagram`, `facebook`) | Organic |
| HSM personal LinkedIn | `utm_source=hsm_field&utm_medium=social&utm_campaign=social-expcon-oct&utm_content=linkedin` | HSM field |
| Paid social (only if used) | `utm_source=paid_social&utm_medium=social&utm_campaign=paid-expcon-oct&utm_content=<platform>` (rows for LinkedIn, Instagram, Facebook) | Paid social |

Rules the page follows (Attribution Spec v3.3):

1. **No tags** → the full defaults above.
2. **Real tags always win** over the page's channel and campaign defaults.
3. **The eXp referral is never optional.** Every entry carries
   ReferralSourceId `eXp realty`, whatever the URL says, because this page is
   only promoted to eXp agents. A `referral_source_id` in the URL is ignored
   rather than trusted. (`lib/giveaway/attribution.ts`; checked by
   `node scripts/test-giveaway-attribution.mjs`.)
4. **Copy follows the tags.** A visitor with no `utm_source` (the booth QR) sees
   "Enjoying your Dirty Soda? That one's on Curbio. Enter in 20 seconds."
   Anyone who arrived through a tagged link sees "Can't make it to Salt Lake?
   You can still enter. Enter in 20 seconds." (`copy.hero.body` /
   `bodyRemote`.) The line is invisible until the browser has looked at the
   URL's tags, then fades in — so nobody sees the wrong one flash. Without
   JavaScript it stays hidden.

`curbio.com/exp` losing its tags is **not** fixed in WordPress. It is fixed in
code after the show (section 9).

To regenerate the QR files:

```
node scripts/make-qr.mjs https://sell.curbio.com/expcon docs/expcon/qr/curbio-expcon-qr
```

---

## 2. Who goes where

One entry per email address. Submitting again updates the same entry; it never
makes a second entry or a second deal.

| The entrant | Giveaway entry | Sent to the app (HSM) | Added to ActiveCampaign |
| --- | --- | --- | --- |
| In a market, answers **Yes** | 1 | Yes, immediately | **Yes** — both systems |
| In a market, answers **Maybe** or **Not yet** | 1 | No | Yes |
| **Market not listed** (any answer) | 1 | Never | Yes |
| **Books a call** (any answer, in a market) | 1 + 5 | Yes, when they book | Already on it from when they entered |
| Changes their answer to **Yes** later | still 1 | Yes, at that moment | Tags are updated |
| Uses the page **after the drawing** (in a market) | not in the drawing, unless they entered before it | Yes | Yes |
| A **Curbio address** | kept, never drawn | Never | Never |

- **ActiveCampaign gets every entrant** — including the "Yes" leads an HSM is
  also working. Each goes on their market's list (Seattle and "not listed" go
  on the Master Contact List) **and** on the **Engaged** list, with the
  `Market` field set and three tags: `expcon-2026`,
  `expcon-2026-market-<market>`, `expcon-2026-listing-<yes|maybe|not-yet>`. The
  answer tag is what lets an automation treat the people an HSM is working
  differently.
- **The Engaged list has to exist.** The sync looks for a list called
  "Engaged" (`AC_ENGAGED_LIST_NAME` in `config/emailLists.ts`). If it cannot
  find one it writes **nothing** for that entry — nobody is put on a market
  list and left off Engaged — and the entry shows under "Needs attention" with
  the reason. Create the list, press **Sync now**, and everything waiting is
  done. Meanwhile entries are kept and "Yes" leads still reach the HSM.
- Anyone who has **ever unsubscribed** from a Curbio list is left alone: not
  added to any list, not tagged. They are still in the drawing, and if they said
  Yes they still go to an HSM.
- Someone ActiveCampaign already knows keeps their own record: they are added
  to the Engaged list and tagged, but their name, phone, Market and market list
  are not changed.
- "Not listed" plus a ZIP that Curbio does serve is treated as that market.
- A hand-off to the app that fails, times out (the app is given 8 seconds) or
  is cut off is **not repeated automatically** — the app would make a
  duplicate deal. It shows under "Needs attention" as "app failed" or "app
  unconfirmed" with a "Retry app" button, and a failure is also in the red
  banner on the Leads screen. Look for the person in the app first, then
  retry; a retry that lands clears the banner and the Leads screen still shows
  one row for them.
- **Curbio addresses and test names are "ours"**: kept, shown, never drawn. A
  `@curbio.com` entry is not sent to the app (it rejects them) or added to
  ActiveCampaign.
- **No "New lead" email for each giveaway lead.** They would come out of the
  same email allowance as the alerts for the main lead forms. A failure alert
  is still sent. To get one per lead anyway: `leadEmails: "every-lead"` in the
  settings file.

Attribution on every lead sent to the app: ReferralSourceId `eXp realty` always;
Channel, UtmSource, UtmMedium and UtmCampaign from the link's real tags, or
`event` / `event` / `qr` / `expcon-giveaway-oct` when there are none (section 1);
Origin `web_form`; first touch write-once. Lead `source` is
`expcon-giveaway-<market>`.

---

## 3. Previews are a sandbox

A preview link (and local development) never sends anything real:

- entries are stored separately from the real drawing,
- nothing is posted to the app, no HSM is emailed,
- nothing is added to ActiveCampaign.

Each entry shows where it **would** have gone ("app (sandbox)", "email list
(sandbox)"), so the routing can be checked on the preview. Real delivery
happens only on the Production deployment (`sell.curbio.com`).

---

## 4. Go-live checklist (Mon Oct 5)

Before merging:

- [ ] **ActiveCampaign keys in Vercel.** `ACTIVECAMPAIGN_ACCOUNT_URL` and
      `ACTIVECAMPAIGN_API_KEY` are not set in Vercel today. Add both to
      Production (Vercel → curbiolandingpage → Settings → Environment
      Variables). Without them nothing is lost: entries are kept, marked "list
      not configured", and one click on "Sync now" adds them later.
- [ ] **Create the Engaged list in ActiveCampaign.** It does not exist yet
      (the account has only the market lists and the Master Contact List,
      checked 2026-10-01). Name it exactly **Engaged**, or tell the developer
      the name and `AC_ENGAGED_LIST_NAME` changes. Until it exists, entries are
      kept and flagged "Needs attention"; **Sync now** completes them.
- [ ] **Failure alerts reach you.** If a lead cannot be delivered to the app, an
      email "CRM delivery FAILED — lead preserved" goes to the address shown in
      the **Failure alerts** card on `/admin/giveaway` (`RESEND_TO_EMAIL`, else
      `LEAD_NOTIFY_EMAIL`, else the built-in `grudman1@gmail.com`). Press **Send
      a test alert** once, then check that inbox and spam. It goes through the
      same path as a real alert and shows the email service's own answer. Alerts
      are sent from Resend's shared test address, which may deliver only to the
      Resend account owner until a Curbio domain is verified; if Resend refuses,
      the screen says why. Accepted means Resend took it — the proof is the
      email arriving.
- [ ] **Written requests.** The rules tell people to email
      **team@curbio.com** (`rules.requestEmail`, confirmed 2026-10-02) for the
      free bonus entries and the winners list. Someone has to read that inbox
      during the show.
- [x] **Official Rules — filled in 2026-10-02 by the reviewer.** Sponsor
      Curbio, Inc., 3030 Greenmount Ave, Ste 300, Baltimore, MD 21218; five
      identical Listing-Ready Kits, about $500 each and $2,500 in total;
      governed by the laws of the State of Maryland. No amber markers and no
      draft notice remain. **Not drafted, because it was not supplied:** venue,
      arbitration and other dispute terms. **Still the reviewer's call:**
      Section 2 limits entry to real estate professionals (licensed agents and
      brokers), as the first draft did — drop that clause if anyone 18+ in the
      U.S. should be able to enter.
- [ ] Everyone working the booth has a `/admin` login (they see only the
      bonus tool). Staff who try the form themselves should know a
      `@curbio.com` entry is kept but can never win.

Going live:

1. Merge the pull request in GitHub. Production deploys from `main`.
2. Run the test script in section 5 on `sell.curbio.com/expcon`.
3. Scan `docs/expcon/qr/curbio-expcon-qr.png` from a screen with a phone and
   confirm it lands on the giveaway. **Then** send the QR files to print.
4. Flip `/expcon`, `/expcon/rules` and `/admin/giveaway` from `stub` to `live`
   in `config/pageRegistry.ts`.

Optional, any time: when Rich confirms the app's "requested work" field can
hold the note, turn on **Deal note** on `/admin/giveaway`. HSMs then see
`eXpcon 2026 giveaway · Listing in next 90 days: Yes` on the deal and in their
new-lead email. It is off by default, and leads flow either way.

---

## 5. Test script

Use names starting `ZZTEST` and emails like `zztest+yes1@gmail.com` (never an
`@curbio.com` address). ZZTEST entries are flagged "ours" and are never drawn.

**On the preview link (safe — sandbox):**

| # | Do this | Expect |
| --- | --- | --- |
| P1 | Open the page on a phone | Confetti covers the whole hero once, for about three and a half seconds, and clears (none if the phone has "Reduce motion" on). Name, Email and Phone are on the first screen. The countdown shows seconds and ticks. The header button glides to the form and puts the cursor in the Name field. |
| P2 | Submit: Atlanta, **Yes** | "You're in!" with the manager and the booking offer. Staff screen: **both** "app (sandbox)" and "email list (sandbox)". |
| P3 | Submit a new email: Dallas, **Maybe** | Staff screen: "email list (sandbox)", no app badge. |
| P4 | Submit a new email: **My market isn't listed**, ZIP 59718 | Thank-you points to Booth #9, no booking offer. Staff screen: "email list (sandbox)", market "Not listed". |
| P5 | Submit P3's email again with **Yes** | "You were already in" message. Still one row (shown ×2), now "app (sandbox)" as well as "email list (sandbox)". |
| P6 | Staff screen → Add bonus entries → P4's email → "+5 · visited the booth" | Row shows 6 entries. |
| P7 | Enter a few made-up names **without** the ZZTEST prefix (the drawing skips ZZTEST; sandbox entries never touch the real list). Then staff screen → Practice drawing → Verify | Five winners ("Winner 1–5", all getting the same whole kit — there is no prize column), then ten alternates, and "Verified". No ZZTEST names among them. |
| P8 | Open `/expcon/rules` | Rules read correctly: sponsor Curbio, Inc.; five identical Listing-Ready Kits with every item listed, $500 each and $2,500 in total; Maryland law. No amber markers, no draft notice. |

**On production, once the ActiveCampaign keys and the Engaged list are in (real routing):**

| # | Do this | Expect |
| --- | --- | --- |
| T0 | Open the page in a private window on a phone (so the cookie notice shows) | The notice sits at the bottom of the screen. On a 390×844 phone (iPhone 12–15) the Name field is visible above it; on a shorter phone it may be partly covered until you scroll or tap "Enter to win" — the hero copy is longer than it was, so the form starts about 40px lower. Tap the field: the notice shrinks to about half its height. It only appears on the production site, so this is the first chance to see it. |
| T1 | Scan the QR. Submit ZZTEST, your market, **Yes** | **A "Yes" lead lands in BOTH systems.** Staff screen: "app" **and** "email list". In the app: a deal with ReferralSourceId `eXp realty`, LeadSource and FirstTouchCampaign filled; the HSM gets the new-lead email. Leads screen: channel Event, campaign `expcon-giveaway-oct`, source `expcon-giveaway-<market>`. In ActiveCampaign: the contact is on the market's list **and** the Engaged list, with the Market field set and tags `expcon-2026`, `expcon-2026-market-…`, `expcon-2026-listing-yes`. |
| T2 | New email, **Maybe** | Staff screen: "email list" only. **No** deal, **no** HSM email. In ActiveCampaign: on the market's list and the Engaged list, tagged `expcon-2026`, `expcon-2026-market-…`, `expcon-2026-listing-maybe`. |
| T3 | New email, **Not yet** | Same as T2, tagged `…-listing-not-yet`. |
| T4 | On T3's thank-you screen, book a call | "Booked. Your 5 bonus entries are in." Staff screen: 6 entries, "app" and "email list". A deal now exists. (Cancel the meeting in Calendly afterwards.) |
| T5 | Submit T2's email again, **Yes** | One row, now "app" and "email list". ActiveCampaign: the answer tag changes to `…-listing-yes`; the lists stay as they were. Exactly one deal. |
| T6 | Submit T1's email again, unchanged | No second deal; ActiveCampaign unchanged. |
| T7 | New email, **My market isn't listed**, a ZIP outside every market | "email list" only: on the Master Contact List and the Engaged list. No deal. |
| T8 | Open `sell.curbio.com/expcon` directly (no tags) and submit **Yes** — *attribution case 1, no tag* | The line under the headline is the Dirty Soda one. The lead lands as channel **Event**, medium `qr`, campaign `expcon-giveaway-oct`, ReferralSourceId **`eXp realty`**, marked defaulted. Check it in the app and on the Leads screen. |
| T9 | Load `sell.curbio.com/exp` and `sell.curbio.com/` | Unchanged. |
| T11 | Open the **Email (opt-in)** link from the Links screen — `…/expcon?utm_source=email&utm_medium=e&utm_campaign=nurture-expcon-oct` — and submit **Yes** (new ZZTEST address) — *attribution case 2, email tag* | The line under the headline is "Can't make it to Salt Lake? You can still enter. Enter in 20 seconds." The lead lands as channel **Email**, medium `e`, campaign `nurture-expcon-oct`, ReferralSourceId **`eXp realty`** (not "defaulted"). |
| T12 | Open the **Curbio LinkedIn** link — `…/expcon?utm_source=organic&utm_medium=social&utm_campaign=social-expcon-oct&utm_content=linkedin` — and submit **Yes** (new ZZTEST address) — *attribution case 3, LinkedIn tag* | Same "Can't make it" line. The lead lands as channel **Organic**, medium `social`, campaign `social-expcon-oct`, content `linkedin`, ReferralSourceId **`eXp realty`**. |
| T13 | Open the email link again with `&referral_source_id=Somebody%20Else` added, and submit **Yes** (new ZZTEST address) | ReferralSourceId is still **`eXp realty`**: a referral in the URL cannot change it. |
| T10 | *(Optional)* Submit an address that has unsubscribed in ActiveCampaign | Entry accepted; the staff screen shows "unsubscribed"; the contact is **not** added to any list or tagged. If they answer **Yes** they still go to the HSM. |

Clean up after testing: ask Rich to delete the ZZTEST deals; delete the
`zztest+…` contacts in ActiveCampaign (that takes them off their market list and
the Engaged list too); cancel any test Calendly meeting. The ZZTEST rows stay on
the staff screen under "Ours" and are excluded from the drawing — nothing needs
deleting there.

---

## 6. At the booth

- The QR code is the way in. Badge scans are the backup (section 9).
- **Free bonus entries.** Anyone who talks with the team at the booth gets the
  same +5 as booking a call. On `/admin/giveaway`: type their email → "Look
  up" → "+5 · visited the booth". They must have entered on the page first.
  The bonus is given once per person, whichever way it was earned.
- A written request (an email to the inbox named in the Official Rules) is
  added the same way with "+5 · written request".
---

## 7. Drawing day — Fri Oct 9, 12:00pm Mountain

At noon the page switches itself to "The giveaway has closed." The form keeps
working as a contact form; anyone in a market who uses it goes to the app (and,
like every entrant, to ActiveCampaign).

1. **Check bookings.** In Calendly, export the invitees for Oct 5–9 (each
   manager has their own Calendly, so this is one export per manager, or one
   from an organization admin). Leave out cancelled meetings and anything
   booked after noon. On `/admin/giveaway` → "Check bookings against
   Calendly": paste **all** the exports together (or just the emails) →
   **Check** → **Record** (it records eight at a time; press again while any
   are left). Then look at "Bonus rests on a booking that is not in this
   paste": those people hold the bonus only because the page reported a
   booking, and Calendly's list does not have them. Use "Remove bonus" on a
   row if the booking was not real.
2. **Add any booth or written bonuses** that were earned before noon and not
   yet typed in. (After the close only an owner can add one.)
3. **Run the official drawing.** It draws 5 winners and 10 alternates, from a
   frozen copy of the list, weighted 1 or 6 entries, and records the seed, the
   list's fingerprint, who ran it and when. **All five winners get the same
   whole Listing-Ready Kit** — the order they were drawn in assigns nothing,
   and no prize is recorded against any name. ZZTEST entries and anything
   submitted after noon are excluded. One win per person.
4. **Download record** and keep the file. **Verify** re-runs the same seed
   over the frozen list and confirms it gives the same names.
5. **Notify** each winner by email and phone within 48 hours. A winner has 7
   days to respond; after that the kit goes to the next alternate, in order.

A second official drawing is possible but asks for a written reason, and both
stay on record.

The drawing code has its own check: `node scripts/test-giveaway-draw.mjs`.

---

## 8. One-line edits

All in `config/giveaways/expcon.ts` unless it says otherwise:

| To change | Edit |
| --- | --- |
| The headline | `copy.hero.headline` (`*…*` is the amber word). The tab title and link preview are `meta.title`. |
| Rick's talk | `stage` (`speaker`, `role`, `day`, `time`, `place`). The page reads "Hear Rick Rudman, Curbio CEO" over "Thursday, Oct 8 · 11:30am MT" over "eXpo Live Stage". A `null` time is left out, never shown as a placeholder. |
| What is in the kit, and how many winners | `kit.items` and `kit.winners`. The rules, the kit section's "5 kits. 5 winners." line and the drawing all read `kit.winners`; the hero sentence says "Five agents" in words, so search `copy.hero.sub` for it. |
| A photo of a kit item | Put the image under `public/` and add `photo: "/path.jpg"` to that item in `kit.items`. Without one the icon shows. |
| Retail value, sponsor name and address, governing law | `kit.approxValueUsd` (per kit; the rules multiply it by the winners), `rules.sponsorName`, `rules.sponsorAddress`, `rules.governingLaw`. |
| The confetti | `components/giveaway/confetti.ts` (colours come from the site's tokens; it is skipped under "Reduce motion"). |
| Where written requests go | `rules.requestEmail`. The Official Rules follow. |
| The Calendly event booked | `booking.eventSlug`. The page promises no call length, so the event's length does not matter to the copy. |
| Keep people sent to the app OFF the email list | `routing.emailList`: `"everyone"` → `"not-sent-to-app"`. |
| The Engaged list's name | `AC_ENGAGED_LIST_NAME` in `config/emailLists.ts`. |
| Closing time | `closesAt` (UTC) and the four `drawing` lines that state it in words. |

The word "raffle" must not appear anywhere a visitor can see it (Utah) — and
that includes the campaign tag, which is shown in the address bar for a moment
after a scan. That is why the tag is `expcon-giveaway-oct` and not its original
working name.

---

## 9. After the show

- **Badge-scan import.** To be built when the sample Cvent export arrives:
  dry run → review → approve, same routing rules (only "Yes" or confirmed
  interest goes to the app; everyone goes to ActiveCampaign only if they
  consented). Lead `source` will be `expcon-booth-<market>`.
- **Dashboard (`feat/hub-live-leads`).** That branch decides Qualified vs
  Engaged from a lead's `source` using an allowlist (`lib/leadSource.ts`), and
  anything it does not recognise counts as Engaged. The new sources are:
  - `expcon-giveaway-<market>` — written by this page, only for entrants sent
    to the app (answered Yes, booked a call, or submitted after the close)
  - `expcon-booth-<market>` — the badge-scan import, later

  **Decided 2026-10-02:** expcon entries that reach the app (said Yes or booked
  a call) count as Qualified in `lib/leadSource.ts`, and badge-scan imports
  follow the same rule. To do that, add `expcon.attribution.source` from
  `config/giveaways/expcon.ts` to the `TEMPLATES` list in that file. Left
  alone, they count as Engaged.
- **Attribution backend (week of Oct 12).** Implement the partnership
  derivation from the spec in the live lead route: a lead with a
  ReferralSourceId and no real `utm_source` gets Channel `partnership` and the
  partner name as its campaign; real UTMs always win. Confirm `/exp` leads come
  through as `partnership`, with tests. This is what repairs `curbio.com/exp`
  — **not** a WordPress edit.
- **One delivery module.** `lib/giveaway/appDelivery.ts` is a deliberate copy
  of the delivery code in `app/api/lead/route.ts`, so that file did not have
  to change the week of the conference. If `/api/lead` changes its stored
  record, its delivery record or its app payload, change both.

---

## 10. The share image

The picture that appears when the link is shared (iMessage, Slack, LinkedIn) is
`public/og/expcon.png` — 1200×630, the prize only, no booth details. It is set in
`app/(site)/expcon/page.tsx` as an absolute `sell.curbio.com` URL. To change it,
replace that file (same name, same size). Apps cache previews: an old share keeps
the old picture, and a new one can need a fresh link or the app's cache refresh
(LinkedIn Post Inspector, Slack "unfurl"). The image is only served from
production once this is merged — a preview deployment's share image points at
production.
