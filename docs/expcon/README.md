# eXpcon 2026 giveaway — runbook

Everything a person needs to run the eXpcon giveaway: the short link, how to
go live, the test script, what to do on drawing day, and what is still open.

The page is `sell.curbio.com/expcon`. The Official Rules are at
`/expcon/rules`. The staff screen is `/admin/giveaway`.

Settings (dates, booth, prizes, copy, tags, routing) are in one file:
`config/giveaways/expcon.ts`.

---

## 1. The short link and the QR code

The printed QR code encodes **`https://curbio.com/expcon`** and nothing else.
Print files are in `docs/expcon/qr/` (PNG and SVG, high error correction).

The tags live in the WordPress redirect, not in the ink, so the destination can
change without a reprint.

WordPress redirect settings: **302**, ignore case, ignore trailing slash.

| When | Paste this as the destination |
| --- | --- |
| Now, until `/expcon` is live | `https://sell.curbio.com/exp?utm_source=event&utm_medium=qr&utm_campaign=expcon-raffle-oct&referral_source_id=eXp%20realty` |
| At go-live (Mon Oct 5) and after | `https://sell.curbio.com/expcon?utm_source=event&utm_medium=qr&utm_campaign=expcon-raffle-oct&referral_source_id=eXp%20realty` |

Separate fix, unrelated to eXpcon: `curbio.com/exp` lost its tags. Restore its
destination to
`https://sell.curbio.com/exp?utm_source=partnership&utm_campaign=exp-partner-landingpage&referral_source_id=eXp%20realty`.

If the redirect ever loses its tags again, the page fills them in itself
(Channel = event, medium = qr, campaign = expcon-raffle-oct, eXp referral), and
marks the entry as "defaulted" so it can be told apart.

To regenerate the QR files:

```
node scripts/make-qr.mjs https://curbio.com/expcon docs/expcon/qr/curbio-expcon-qr
```

---

## 2. Who goes where

One entry per email address. Submitting again updates the same entry; it never
makes a second entry or a second deal.

| The entrant | Giveaway entry | Sent to the app (HSM) | Added to the email list |
| --- | --- | --- | --- |
| In a market, answers **Yes** | 1 | Yes, immediately | No |
| In a market, answers **Maybe** or **Not yet** | 1 | No | Yes |
| **Market not listed** (any answer) | 1 | Never | Yes |
| **Books a call** (any answer, in a market) | 1 + 5 | Yes, when they book | Stays on it if they were added when they entered |
| Changes their answer to **Yes** later | still 1 | Yes, at that moment | Tags are updated |
| Uses the page **after the drawing** (in a market) | not in the drawing, unless they entered before it | Yes | No |

- **Email list** is ActiveCampaign. Each person goes on their market's list
  (Seattle and "not listed" go on the Master Contact List), with the `Market`
  field set and three tags: `expcon-2026`, `expcon-2026-market-<market>`,
  `expcon-2026-listing-<yes|maybe|not-yet>`.
- Anyone who has **ever unsubscribed** from a Curbio list is left alone. They
  are still in the drawing.
- "Not listed" plus a ZIP that Curbio does serve is treated as that market.
- A hand-off to the app that fails, times out (the app is given 8 seconds) or
  is cut off is **not repeated automatically** — the app would make a
  duplicate deal. It shows under "Needs attention" as "app failed" or "app
  unconfirmed" with a "Retry app" button, and a failure is also in the red
  banner on the Leads screen. Look for the person in the app first, then
  retry; a retry that lands clears the banner and the Leads screen still shows
  one row for them.
- **Curbio addresses and test names are "ours"**: kept, shown, never drawn. A
  `@curbio.com` entry is not sent to the app (it rejects them) or added to the
  email list.
- **No "New lead" email for each giveaway lead.** They would come out of the
  same email allowance as the alerts for the main lead forms. A failure alert
  is still sent. To get one per lead anyway: `leadEmails: "every-lead"` in the
  settings file.

Attribution on every lead sent to the app: Channel `event`, UtmSource `event`,
UtmMedium `qr`, UtmCampaign `expcon-raffle-oct`, ReferralSourceId `eXp realty`,
Origin `web_form`, first touch write-once. Lead `source` is
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
- [ ] **Call length.** The page says "Book 15 minutes". The Calendly event it
      opens (`general-meeting`) is 30 minutes for some managers and 20 for
      others. Either give every manager a 15-minute event under one shared
      name and put that name in `booking.eventSlug`, or change `minutes` and
      the three lines of copy that say "15 minutes".
- [ ] **Written requests.** The rules tell people to email `team@curbio.com`
      for the free bonus entries and the winners list. Someone has to read
      that inbox during the show.
- [ ] **Official Rules.** Sponsor legal name, sponsor address and four prize
      values are marked in amber on `/expcon/rules`. Fill them in
      `config/giveaways/expcon.ts` (`rules.sponsorName`, `rules.sponsorAddress`,
      each prize's `approxValue`). The amber draft notice disappears when none
      are left. Governing law and dispute terms are not drafted — that is for
      the reviewer.
- [ ] Everyone working the booth has a `/admin` login (they see only the
      bonus tool). Staff who try the form themselves should know a
      `@curbio.com` entry is kept but can never win.

Going live:

1. Merge the pull request in GitHub. Production deploys from `main`.
2. Run the test script in section 5 on `sell.curbio.com/expcon`.
3. Repoint the WordPress redirect to the go-live URL in section 1.
4. Scan the printed QR with a phone and confirm it lands on the giveaway.
5. Flip `/expcon`, `/expcon/rules` and `/admin/giveaway` from `stub` to `live`
   in `config/pageRegistry.ts`.

Optional, any time: when Rich confirms the app's "requested work" field can
hold the note, turn on **Deal note** on `/admin/giveaway`. HSMs then see
`eXpcon 2026 giveaway · Listing in next 90 days: Yes` on the deal and in their
new-lead email. It is off by default, and leads flow either way.

---

## 5. Test script

Use names starting `ZZTEST` and emails like `zztest+yes1@gmail.com` (never an
`@curbio.com` address). ZZTEST entries are flagged "test" and are never drawn.

**On the preview link (safe — sandbox):**

| # | Do this | Expect |
| --- | --- | --- |
| P1 | Open the page on a phone | Name, Email and Phone are on the first screen. The header button jumps to the form. |
| P2 | Submit: Atlanta, **Yes** | "You're in!" with the manager and the booking offer. Staff screen: "app (sandbox)". |
| P3 | Submit a new email: Dallas, **Maybe** | Staff screen: "email list (sandbox)", no app badge. |
| P4 | Submit a new email: **My market isn't listed**, ZIP 59718 | Thank-you points to Booth #9, no booking offer. Staff screen: "email list (sandbox)", market "Not listed". |
| P5 | Submit P3's email again with **Yes** | "You were already in" message. Still one row (shown ×2), now "app (sandbox)". |
| P6 | Staff screen → Add bonus entries → P4's email → "+5 · visited the booth" | Row shows 6 entries. |
| P7 | Enter a few made-up names **without** the ZZTEST prefix (the drawing skips ZZTEST; sandbox entries never touch the real list). Then staff screen → Practice drawing → Verify | Names drawn in prize order, then alternates, and "Verified". No ZZTEST names among them. |
| P8 | Open `/expcon/rules` | Rules read correctly; amber markers on what legal still owes. |

**On production, Mon Oct 5 (real routing):**

| # | Do this | Expect |
| --- | --- | --- |
| T0 | Open the page in a private window on a phone (so the cookie notice shows) | The notice sits at the bottom of the screen and the Name field is visible above it. Tap the field: the notice shrinks to about half that height. It only appears on the production site, so this is the first chance to see it. |
| T1 | Scan the QR. Submit ZZTEST, your market, **Yes** | Staff screen: "app". Leads screen: channel Event, campaign `expcon-raffle-oct`, source `expcon-giveaway-<market>`. The HSM gets the new-lead email. In the app: a deal with ReferralSourceId `eXp realty`, LeadSource and FirstTouchCampaign filled. |
| T2 | New email, **Maybe** | Staff screen: "email list". **No** deal, **no** HSM email. In ActiveCampaign: on the market's list, tagged `expcon-2026`, `expcon-2026-market-…`, `expcon-2026-listing-maybe`. |
| T3 | New email, **Not yet** | Same as T2, tagged `…-listing-not-yet`. |
| T4 | On T3's thank-you screen, book a call | "Booked. Your 5 bonus entries are in." Staff screen: 6 entries, "app". A deal now exists. (Cancel the meeting in Calendly afterwards.) |
| T5 | Submit T2's email again, **Yes** | One row, now "app". ActiveCampaign tag changes to `…-listing-yes`. Exactly one deal. |
| T6 | Submit T1's email again, unchanged | No second deal. |
| T7 | New email, **My market isn't listed**, a ZIP outside every market | "email list", on the Master Contact List. No deal. |
| T8 | Open `sell.curbio.com/expcon` directly (no tags) and submit **Yes** | Lead still lands as channel Event with the campaign and eXp referral. |
| T9 | Load `sell.curbio.com/exp` and `sell.curbio.com/` | Unchanged. |

Clean up after testing: ask Rich to delete the ZZTEST deals; delete the
`zztest+…` contacts in ActiveCampaign; cancel any test Calendly meeting. The
ZZTEST rows stay on the staff screen under "Tests" and are excluded from the
drawing — nothing needs deleting there.

---

## 6. At the booth

- The QR code is the way in. Badge scans are the backup (section 9).
- **Free bonus entries.** Anyone who talks with the team at the booth gets the
  same +5 as booking a call. On `/admin/giveaway`: type their email → "Look
  up" → "+5 · visited the booth". They must have entered on the page first.
  The bonus is given once per person, whichever way it was earned.
- A written request (email to `team@curbio.com`) is added the same way with
  "+5 · written request".

---

## 7. Drawing day — Fri Oct 9, 12:00pm Mountain

At noon the page switches itself to "The giveaway has closed." The form keeps
working as a contact form; anyone in a market who uses it goes to the app.

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
3. **Run the official drawing.** It draws 5 winners in prize order and 10
   alternates, from a frozen copy of the list, weighted 1 or 6 entries, and
   records the seed, the list's fingerprint, who ran it and when. ZZTEST
   entries and anything submitted after noon are excluded. One win per person.
4. **Download record** and keep the file. **Verify** re-runs the same seed
   over the frozen list and confirms it gives the same names.
5. **Notify** each winner by email and phone within 48 hours. A winner has 7
   days to respond; after that the prize goes to the next alternate, in order.

A second official drawing is possible but asks for a written reason, and both
stay on record.

The drawing code has its own check: `node scripts/test-giveaway-draw.mjs`.

---

## 8. One-line edits

All in `config/giveaways/expcon.ts`:

| To change | Edit |
| --- | --- |
| Rick's stage time | `stage.time`: `null` → `"2:15pm"`. Until then the page shows "Thursday, Oct 8 · eXpo Live Stage" with no placeholder. |
| A prize photo | Put the image under `public/` and add `photo: "/path.jpg"` to that prize. Without one the icon shows. |
| Prize values, sponsor name and address | `approxValue`, `rules.sponsorName`, `rules.sponsorAddress`. |
| Booking event or length | `booking.eventSlug`, `booking.minutes`, and the copy lines that say "15 minutes". |
| Also email the people sent to the app | `routing.emailList`: `"not-sent-to-app"` → `"everyone"`. |
| Closing time | `closesAt` (UTC) and the four `drawing` lines that state it in words. |

The word "raffle" must not appear in anything a visitor can read (Utah). The
only place it exists is the internal campaign tag `expcon-raffle-oct`, which is
never sent to the browser.

---

## 9. After the show

- **Short link.** Leave `curbio.com/expcon` pointing at `/expcon`. The closed
  page keeps collecting contacts with the eXpcon tags.
- **Badge-scan import.** To be built when the sample Cvent export arrives:
  dry run → review → approve, same routing rules (only "Yes" or confirmed
  interest goes to the app; the rest go to the email list only if they
  consented). Lead `source` will be `expcon-booth-<market>`.
- **Dashboard (`feat/hub-live-leads`).** That branch decides Qualified vs
  Engaged from a lead's `source` using an allowlist (`lib/leadSource.ts`), and
  anything it does not recognise counts as Engaged. The new sources are:
  - `expcon-giveaway-<market>` — written by this page, only for entrants sent
    to the app (answered Yes, booked a call, or submitted after the close)
  - `expcon-booth-<market>` — the badge-scan import, later

  To count them as Qualified, add `expcon.attribution.source` from
  `config/giveaways/expcon.ts` to the `TEMPLATES` list in that file. Left
  alone, they count as Engaged.
- **One delivery module.** `lib/giveaway/appDelivery.ts` is a deliberate copy
  of the delivery code in `app/api/lead/route.ts`, so that file did not have
  to change the week of the conference. If `/api/lead` changes its stored
  record, its delivery record or its app payload, change both.
