# ActiveCampaign — warm email

ActiveCampaign is Curbio's long-term home for **all warm email**. This app
writes people to it through **one module**: `lib/marketingContacts.ts`
(`syncMarketingContact`). No other code talks to the contacts API. The eXpcon
giveaway is the first caller (`lib/giveaway/emailList.ts`); the public lead
route does not call it.

The module never sends email and never creates or edits campaigns, automations
or segments.

## What it writes

Everything is looked up **by exact name** (ids are for reference only). If the
list, any field, any dropdown option, or a tag cannot be found, **nothing is
written** for that person (fail closed) and the caller records the error.

**List:** `Curbio Marketing` (id 10). The only list anyone is subscribed to.

**Fields**

| Field | Type | Value written | Existing contact |
|---|---|---|---|
| Contact Type | dropdown: Agent / Team Lead / Broker/Owner / Partner / Homeowner | caller's (eXpcon: `Agent`) | only if empty |
| Market | text | market config display name, e.g. `Atlanta, GA`, or `Not listed` | **never overwritten** (only if empty) |
| Brokerage | text | caller's (eXpcon: `eXp Realty`) | only if empty |
| HSM Name | text | market config `hsm.name`; blank if not listed | only if empty |
| HSM Email | text | market config `hsm.email`; blank if not listed or not yet supplied | only if empty |
| Lifecycle Stage | dropdown: Subscriber / Engaged / Sales Qualified / Customer | see below | **only moves up** |
| Listing Timeline | dropdown: Within 90 days / 3-6 months / Not yet | Yes → Within 90 days · Maybe → 3-6 months · Not yet → Not yet | latest answer |
| First Source | text | `<channel> / <campaign>` of the first touch | **set once** (only if empty) |
| Latest Source | text | `<channel> / <campaign>` of this submission | every time |
| Consent Source | text | where the box was ticked, e.g. `eXpcon 2026 giveaway form (checkbox)` | every time |
| Consent Date | date | day the box was ticked, `YYYY-MM-DD` (Mountain time) | every time |

Standard fields: first name, last name, phone, email. An existing contact's
**name and phone are never changed.**

**Tags:** exact names in the form `<kind>:<name>`, e.g. `event:expcon-2026`
(id 54). Tags must already exist; the module never creates one. No per-market
or per-answer tags.

**Ignored on purpose:** the account's leftover fields (Market Slug,
Sentence1–7, Source, …), old tags, the market lists, "Master Contact List" and
"Engaged". Nothing reads or writes them.

## Rules

- **Consent first.** Call the module only for someone who ticked an email box.
  The caller stores the consent evidence (box text, time, page, IP).
- **Never synced:** `@example.com` and `@curbio.com` addresses (enforced in the
  module), plus whatever the caller excludes (eXpcon: manual entries, tests,
  deleted entries).
- **One contact per email.** Look up, then create or update.
- **Unsubscribed or bounced on any list → left alone.** Nothing is created,
  changed, subscribed or tagged; the result is `unsubscribed`.
- **Lifecycle never moves backwards.** Order: Subscriber < Engaged < Sales
  Qualified < Customer. eXpcon writes `Sales Qualified` when the entry was sent
  to the app (an HSM has it), otherwise `Engaged`. When an entry reaches the app
  later, it is queued for a re-sync so the stage rises.
- **Source format** is always `<channel> / <campaign>` from the closed channel
  list (e.g. `event / expcon-giveaway-oct`, `email / nurture-expcon-oct`) —
  never `activecampaign` or any platform name.
- **Order** for eXpcon: entry saved → app delivery → ActiveCampaign. A failure
  never blocks or changes the entry, app delivery, routing, attribution or the
  drawing; it shows under **Needs attention** on `/admin/giveaway`, and
  **Sync now** retries.

## Where it runs

- Keys: `ACTIVECAMPAIGN_ACCOUNT_URL` and `ACTIVECAMPAIGN_API_KEY`, in Vercel
  **Production only**. Never logged or committed.
- Calls are made only when `VERCEL_ENV === "production"`, or when the account
  URL is on this machine (a local stand-in for tests). **Previews never call
  ActiveCampaign** (they share production data): even with keys, a preview
  gets `not_configured`, and the giveaway additionally runs in sandbox mode
  there.
- Heads-up: the existing read-only crons (`/api/cron/email-sync`,
  `/api/cron/contact-sync`) use the same keys and will start reading campaign
  stats and contacts once the keys are added.

## Adding a new form

```ts
import { sourceLabel, syncMarketingContact } from "@/lib/marketingContacts";

// After the form's own record is saved — and only if the person ticked the box.
const result = await syncMarketingContact({
  email, firstName, lastName, phone,
  contactType: "Homeowner",
  market: marketDisplayNameOr("Not listed"),
  brokerage: "",
  hsmName, hsmEmail,
  lifecycle: "Subscriber",
  listingTimeline: null,
  firstSource: sourceLabel(firstTouchChannel, firstTouchCampaign),
  latestSource: sourceLabel(channel, utmCampaign),
  consentSource: "<form name> (checkbox)",
  consentDate: "2026-10-07",
  tags: ["form:<name>"], // create the tag in ActiveCampaign first
});
// result.status: "synced" | "unsubscribed" | "skipped" | "not_configured" | "failed"
```

Store `result` on your record, show `failed` to a person, and give them a way
to retry. Serialise calls for one email (the giveaway holds a per-email lock),
and run the call after responding to the visitor (Next's `after()`).

## Tests

`node scripts/test-marketing-contacts.mjs` (Node 24+) runs the module against an
in-process stand-in ActiveCampaign API: new contact, existing contact (no
overwrite), lifecycle up/never down, unsubscribed, missing list, missing field,
missing option, missing tag, API down, timeout, double submit, previews blocked.
