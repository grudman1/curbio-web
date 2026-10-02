# eXpcon 2026 giveaway — runbook

Everything a person needs to run the eXpcon giveaway: the short link, how to
go live, the test script, what to do on drawing day, and what is still open.

The page is `sell.curbio.com/expcon`. The Official Rules are at
`/expcon/rules`. The staff screen is `/admin/giveaway`.

Settings (dates, booth, the kit, copy, tags, routing) are in one file:
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
| Now, until `/expcon` is live | `https://sell.curbio.com/exp?utm_source=event&utm_medium=qr&utm_campaign=expcon-giveaway-oct&referral_source_id=eXp%20realty` |
| At go-live (Mon Oct 5) and after | `https://sell.curbio.com/expcon?utm_source=event&utm_medium=qr&utm_campaign=expcon-giveaway-oct&referral_source_id=eXp%20realty` |

Separate fix, unrelated to eXpcon: `curbio.com/exp` lost its tags. Restore its
destination to
`https://sell.curbio.com/exp?utm_source=partnership&utm_campaign=exp-partner-landingpage&referral_source_id=eXp%20realty`.

If the redirect ever loses its tags again, the page fills them in itself
(Channel = event, medium = qr, campaign = expcon-giveaway-oct, eXp referral), and
marks the entry as "defaulted" so it can be told apart.

To regenerate the QR files:

```
node scripts/make-qr.mjs https://curbio.com/expcon docs/expcon/qr/curbio-expcon-qr
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

Attribution on every lead sent to the app: Channel `event`, UtmSource `event`,
UtmMedium `qr`, UtmCampaign `expcon-giveaway-oct`, ReferralSourceId `eXp realty`,
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
- [ ] **Create the Engaged list in ActiveCampaign.** It does not exist yet
      (the account has only the market lists and the Master Contact List,
      checked 2026-10-01). Name it exactly **Engaged**, or tell the developer
      the name and `AC_ENGAGED_LIST_NAME` changes. Until it exists, entries are
      kept and flagged "Needs attention"; **Sync now** completes them.
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

**On production, Mon Oct 5 (real routing):**

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
| T8 | Open `sell.curbio.com/expcon` directly (no tags) and submit **Yes** | Lead still lands as channel Event with the campaign and eXp referral. |
| T9 | Load `sell.curbio.com/exp` and `sell.curbio.com/` | Unchanged. |
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

- **Short link.** Leave `curbio.com/expcon` pointing at `/expcon`. The closed
  page keeps collecting contacts with the eXpcon tags.
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

  To count them as Qualified, add `expcon.attribution.source` from
  `config/giveaways/expcon.ts` to the `TEMPLATES` list in that file. Left
  alone, they count as Engaged.
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
