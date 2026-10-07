# Decisions

Standing decisions and the reasoning behind them. Things here were chosen
deliberately and look wrong without the context — read before "fixing" them.

Newest first.

---

## Qualified = the website sent it to the app — not a list of sources

The Hub's Qualified count is every lead the website handed to the app (CRM),
decided from the delivery record in `leads:delivery:v1` (`lib/leadSource.ts`).
`source` is a label for breakdowns and is never a rule: an allowlist of sources
was tried first and was wrong both ways — it dropped a new campaign's leads
until someone listed it, and said nothing about whether the app got them.

- A delivery that FAILED or is unconfirmed still counts (the person asked for an
  estimate) and is listed under "needs attention" on Home. Never silently
  counted as fine, never dropped.
- Never in `leads:v1`, so never Qualified: waitlist (`waitlist:leads`), toolkit
  and webinar signups, and eXpcon entrants who were not handed to an HSM (only
  Yes / booked / after-close are written there; a "Maybe" is not).
- The Aug 29 fence is a UTC date compare, because BOTH sides are UTC: the app
  export's "Created date" values are `+00:00`, and `submittedAt` is an ISO `Z`.
  Converting either to Eastern moves leads across the fence.
- Close rate stays by lead-created month and is marked "still maturing" for a
  month younger than 60 days (52 wins: median 19 days to first win, 90% inside
  52). The alternative — by month the deal closed — divides wins from older
  leads by this month's leads, so numerator and denominator are different
  people.

---

## PII masking is role-gated, not absolute

`lib/adminLeads.ts` masked every identity at the MODULE BOUNDARY: `maskEmail`,
`maskPhone`, `maskName` were the only way to read a lead, so nothing rendered
under `/admin` could show a full record. That was deliberate and the reasoning
still holds — the page stays safe to screenshot, share in a ticket, or leave
open on a laptop, and unmasking should be a decision rather than a default.

**What was wrong with it:** the boundary applied to everyone, so the owner —
accountable for the data, on a READ-ONLY view, already able to read the store
directly with a Redis client — could not read the record they own. The masking
was not protecting anything from that person; it was only making them go
around it.

Masking is now decided by ROLE, from the server-derived session:

    owner      full email, full name, full phone on the expanded record
    everyone   masked, exactly as before

Three properties keep this honest:

- The role comes from `currentAdminUser()` reading the signed session cookie —
  never a prop, never a query param, never client state.
- The visibility argument DEFAULTS TO MASKED, so a caller that forgets it
  fails closed rather than leaking.
- Nothing about the read-only credential changes. This widens what one role can
  SEE; it does not widen what anything can DO.

The list view stays masked for every role. Only the expanded record unmasks,
so a shoulder-surfed screen or an accidental screenshot of the feed still
carries nothing.

## Waitlist signups live in two stores, split by date

Not drift — history, and the count that disagreed was reading only half of it.

    leads:v1        waitlist submissions written BEFORE 2026-08-20. They went
                    into the lead store and WERE posted to the CRM, which
                    answered 404 (a waitlist entry has no market to match).
    waitlist:leads  every signup since commit 4169ad8 split them out.
                    Authoritative going forward.

Neither store alone answers "how many waitlist signups are there", so the
Leads filter chip counts both and the waitlist view renders both, with the
pre-split rows marked `legacy`. The chip previously showed only the new store
while the feed showed only the old ones, which is how one screen managed to
state two different numbers for the same thing.

## Expected non-delivery is not a delivery failure

A waitlist entry has no market, so the CRM has nothing to match and rejects
it. Nothing failed. Counting that as a failure made a working system look
broken and put a red number on the top-line tile — the same category error the
tone scale exists to prevent: this is `unknown`, not `bad`.

`expectedNonDelivery()` in `lib/adminLeads.ts` is the single place that
judgement is made, so the tiles, the row chips and the alert banner cannot
disagree. It is deliberately narrow — it returns a reason only when the record
PROVES one — because wrongly calling a real failure "expected" is a lost lead
nobody chases. Two cases qualify today:

- `source === "waitlist"` — no market by design.
- a **404** on a lead carrying **no market** — the CRM had no destination.
  Narrowed to 404 specifically: a 5xx or an auth failure on a marketless lead
  is still a real failure.

The alert banner skips these too, or it would report historical waitlist 404s
as live incidents on every page load.

## The market source was never recorded, and cannot be reconstructed

`resolveMarket()` returns exactly five sources — `param` (a `?market=` campaign
link), `zip` (visitor-entered), `geo` (Vercel IP headers), `out-of-area`, and
`none` — and it computes that at page render and **throws it away**. The form
posts `market` and never the reason.

So for every lead already in the store, which signal decided the market is
genuinely unrecoverable, and `lib/marketSignals.ts` reports `unknown` rather
than inferring one. Two signals agreeing does not prove which the resolver
used, and a fabricated provenance is worse than an absent one.

Corrections to the guessed enum, because they change what the field can claim:

- `campaign` and `url_param` are the SAME signal. Nothing parses a campaign
  name for a market; the campaign sets `?market=<slug>`, and that is `param`.
- `operator_api` is not a source. Every branch calls it to ENRICH the match
  (HSM, CRM market name); none lets it decide.
- `manual` does not exist — the attribution spec lists rep-created leads as a
  door that is NOT BUILT.

What IS recoverable retroactively is which signals were PRESENT and whether
they DISAGREED — a campaign naming Atlanta on a lead whose market is Seattle
is visible in the stored record. That half is the half that catches real
problems, and it works on history.

`marketSource` is persisted from now on.

## The Magnificent Seven and the ten channels are different axes

The CEO memo names seven channels. `lib/channels.ts` holds a closed list of
ten. These are NOT the same taxonomy and collapsing them breaks both.

| Magnificent Seven | ten-channel list |
|---|---|
| 1. Direct Email | `email` (+ the opt-in/cold split, a VIEW not a channel) |
| 2. Partnerships | `partnership` |
| 3. Super Agents & Teams | `hsm_field` |
| 4. Paid | **three** — `paid_search`, `paid_social`, `creator` |
| 5. Organic | `organic` |
| 6. Events | **none** — attributed by campaign code |
| 7. Content | **none** — an input to the other six |

And in the other direction `referral` and `direct` belong to no channel of the
Seven. `direct` is the unattributed bucket, which is the number the whole
attribution effort exists to shrink — a structure spined only on the Seven
orphans the most important measurement concept in the system.

**The Seven is the PLANNING taxonomy** — tiers, owners, budgets, targets, the
monthly review agenda. **The Ten is the MEASUREMENT taxonomy** — what a lead
can actually be tagged with at the boundary. The strategy doc keeps them apart
too: "the report that runs the budget" is sliced by *channel* × market, using
the closed ten-value list, and `CHANNEL_FUNNEL_ORDER` is ten long for the
same reason.

So the admin navigation is grouped by the Seven (that is how the business is
planned and reviewed) while every number underneath is computed on the Ten
(that is what the data can honestly support). Two screens carry an explicit
label saying their attribution does not work like the others:

- **Events** — `attributed by campaign code, not channel`. Without call
  tracking and event-specific codes every event lead lands as `direct`.
- **Content** — `measured on other channels' screens`. Content has no channel
  value because it is raw material the other six spend.

Content keeps a nav row despite never showing a lead count of its own. The CEO
wrote seven; a dashboard showing six invites "where did the seventh go?" at
every monthly review, which is a worse conversation than a row reading `—`.

## The SITE group expires at cutover — trigger, not vibes

Pages and Experiments sit in their own `SITE` group even though the website is
Organic, one channel out of seven, Tier 2. That is deliberate and TEMPORARY.

A migration in flight needs its own surface; a steady-state channel does not.
The curbio.com replatform is IN FLIGHT and carries a checklist with a
legal-blocking item (`/privacy-policy`, linked from the TCPA consent text on
every lead form). While that is true, the site is a project. After it lands,
the site is a channel.

**The trigger is a specific state, not a feeling:** when every box in the
Cutover checklist at the foot of this file is checked, `SITE_GROUP_ACTIVE` in
`config/adminNav.ts` flips to `false`. Pages and Experiments move under
Organic and the group disappears. The flag exists so this is one edit rather
than a judgement call that never gets made — a temporary group with no expiry
condition is a permanent group.

## One tone scale in /admin, and `unknown` is not on it

Three colour vocabularies had grown for the same four states:

| where | vocabulary |
|---|---|
| `hubUi.tsx` `PACE_TONE` | on / behind / risk |
| `hubUi.tsx` `STATUS_TONE` | live / partial / waiting |
| `adminLeads.ts` `deliveryState` | ok / warn / fail / unknown |

They resolve to the same three constants, so green already meant three
different things depending on which panel you were looking at.

**One scale, four tones, for every admin surface:**

| tone | colour | pace | delivery | wiring |
|---|---|---|---|---|
| `good` | green | on pace | delivered | live |
| `warn` | amber | behind | stored, CRM not configured | partial |
| `bad` | red | under half pace | CRM failed | — |
| `unknown` | **grey, dashed** | no data | never attempted | not wired |

**`unknown` is never rendered on the good/warn/bad ramp.** It is grey, and its
border is dashed. This is the honesty rule the lead reader already enforces in
data — a lead predating the delivery hash is reported "unknown", never
"failed" — expressed in colour so it survives a glance. A missing number and a
bad number must not look alike.

Corollary, and the reason `CHANNEL_COLORS` in `lib/channels.ts` already avoids
these three hues: green/amber/red carry state meaning and nothing else.

### Amber is signal-only inside /admin

`WARN` is `--color-accent`, and amber was simultaneously the active-nav
indicator, the rule under the Control Room `h1`, and button fills. A colour
that means "behind" and "you are here" at once means neither.

Inside `/admin`: nav active state is navy, the decorative rule under the title
is gone, buttons keep amber (a button is not a status). Amber that is not on a
button is a warning.

**The public site is untouched.** Its amber is the brand accent and stays
exactly as it is; this is an admin-shell rule only.

Accessibility: amber never renders as small text on white. `warn` appears as a
dot, or as a chip with `--color-accent-active` text on a tinted fill.

## Vercel Web Analytics: aggregate is bucket-limited, count is not

Verified against the live API 2026-08-25, because getting this wrong is silent.

`visits/count` returns one total and has **no window limit** — a full year
returns fine. `visits/aggregate` returns rows grouped by `by=` and is capped on
**bucket count, not date range or plan retention**:

| `by=` | max buckets | max span |
|---|---|---|
| `hour` | 168 | 7 days |
| `day` | 62 | ~2 months |
| `week` | 26 | ~6 months |
| `month` | 13+ | 12 months+ |

Over the cap it is a `400 invalid_group_by`, not a truncated result — the one
merciful part of this API.

Two traps worth the comment they get in the client:

- **The date params are `since`/`until`.** `from`/`to` are silently ignored and
  the API returns `200` with its own default window. Wrong params look like
  success.
- **`groupBy=` is silently ignored.** The parameter is `by=`. Passing
  `groupBy=route` returns ungrouped totals with a `200`.

Consequences encoded in the timeframe options: **90d cannot render daily
points** (90 > 62), so its trend is 13 weekly buckets and the UI says so. Two
dimensions in one call (`by=day&by=route`) is supported and returns the whole
Pages table with trends in a single ~134 KB request — which is why there is no
per-card fetch and no per-path fan-out.

## config/markets.ts is the only place a market is named

Six lists had drifted. The Maryland market alone carried SEVEN spellings:

| where | spelling |
|---|---|
| operator API `marketName` | `Maryland` |
| `lib/markets.ts` slug | `baltimore` |
| `lib/campaignMarkets.ts` slug | `baltimore` |
| CRM name map | `Baltimore` |
| `markets.json` (untracked) | `maryland-suburbs` |
| live WordPress URL | `dmv-maryland` |
| live WordPress 404 | `baltimore` (19 internal links still point at it) |

`baltimore` did NOT come from the operator API — verified: every Maryland ZIP
including Baltimore city itself returns `"Maryland"`. It came from the
WordPress site's old page slug and was copied into the initial commit
(`c70001d`, 2026-06-04), then propagated into four files.

**Three systems name markets; only one is authoritative for public naming.**

- **sell.curbio.com's market modal** — marketing's names, chosen deliberately,
  live and converting. THE source of truth for `slug`, `displayName`,
  `coverage`. Verbatim; do not "tidy" them.
- **WordPress `/markets/` slugs** — legacy URLs needing 301s. Never naming input.
- **Operator API** — internal ZIP→HSM lookup keys (`NOVA`, `DC`, `Maryland`).
  Never a public slug. Letting it decide URLs is why `/markets/wdc/` exists.

Five name fields per market, because one string doing five jobs is what
produced this: `slug`, `displayName`, `coverage`, `operatorName`, `crmName`.

`lib/markets.ts`, `lib/campaignMarkets.ts`, the coordinates map, the HSM/card
maps and the CRM name map all DERIVE from it now. Reconciling six lists still
leaves six lists.

## markets.json is deleted

An untracked 5.7 KB file at the repo root, dated 2 June — two days before the
initial commit. Nothing read it, nothing wrote it, it was never in version
control, and its only reference was the `.gitignore` line hiding it. It was a
naming authority that looked official and answered to nobody. A gitignored
source of truth is how the drift above happened; if per-market data is needed
it belongs in `config/markets.ts`, in git.

## No market drift monitoring

No daily CI job, no live-URL guard, no operator API call at build time.

At seven markets a human makes every change, so this would be monitoring for a
problem nothing can introduce automatically. And build-time third-party calls
have already broken this project once — a hung operator fetch failed every
deploy on 2026-07-23 (see `lib/operator.ts`). The only gate is
`config/markets.guard.ts`: offline, deterministic, internal-consistency only.

## Two styling systems coexist, on purpose (Phase 2)

`globals.css` holds ~385 lines of hand-written `lp-*` rules with hardcoded
values (45 hex literals, ~338 px literals, 14 ad-hoc breakpoints). Alongside
it there is now a formal semantic token layer.

**Both are live at once, and that is the intended state, not drift.**

The `lp-*` rules style `sell.curbio.com` and `/exp` — pages converting at ~10%
and the only lead-generating web properties Curbio has. The final visual design
of curbio.com is still being worked out, so rewriting those rules to consume
tokens now would take real risk on live revenue pages for a stylesheet that
gets replaced again in Phase 3. The risk would be paid twice.

- **New work uses tokens.** Anything built from Phase 2 onward.
- **Legacy `lp-*` rules are left alone** until the real design lands in Phase 3,
  at which point they are replaced wholesale rather than migrated.

Corollary: **breakpoints are deliberately not tokenized.** CSS custom
properties do not work in `@media` conditions — that is a spec limitation, not
a build problem. The 14 existing widths stay as they are; consolidating them
into a scale would shift layout on live pages.

## Tailwind is the styling system for new work

Supersedes "Tailwind is configured but unused" (Phase 2), which was true when
written and is now wrong: 68 files carry `className`, including the admin
shell's buttons, and `tailwind.config.ts` has `colors`, `fontSize` and
`spacing` extended against the token layer.

**New work uses Tailwind classes against the token theme, not inline `style`
objects.** The Control Room and Marketing Hub were built with inline styles
because Tailwind genuinely wasn't consumed yet; the admin redesign converts
them as it touches them.

Unchanged: the `lp-*` rules in `globals.css` are still left alone until the
Phase 3 design lands, and are still replaced wholesale rather than migrated.
That decision is about live revenue pages and this one does not touch it.

## Route tiers live in one config object

`config/routes.ts` is the single source for the tier map. The middleware, page
metadata, and the cutover 301 set all read it.

Indexability and canonical are **derived together** from one `indexed` field.
Flipping the partner tier at cutover removes the noindex and emits the
canonical in the same edit. This is deliberately impossible to do
half-way — a duplicate-content rewrite target that gets un-noindexed without
gaining a canonical is invisible until it has already cost rankings.

`go.curbio.com` is **not** a rewrite host. It is a separate platform being
retired and will be a redirect *source*.

## `/api/lead` may not reject a submission it cannot prove is fake

Four guards have been removed from this endpoint, each after it ate real leads:
honeypot, blocking time trap, per-IP rate limit, origin/referer allowlist. See
the header comment in `app/api/lead/route.ts` for the full history.

Curbio receives no spam. If filtering is ever genuinely needed the rule is
**quarantine and alert** — never discard, never 4xx.

## Test leads must not use `@curbio.com` addresses

The CRM rejects `@curbio.com` email addresses outright with a `403` — an
internal-domain guard that is indistinguishable from an auth failure by status
code alone. Confirmed by submitting the same lead twice five minutes apart,
changing only the email domain.

**Convention:** `ZZTEST <label>` for the name, `zztest+<label>@gmail.com` for
the email. The `ZZTEST` prefix keeps them filterable in Redis and the CRM.

## Vercel project lives under the `curbio` team, not the personal account

    project   curbiolandingpage
    projectId prj_2guQ6WFQbvQcrNGltMStrOZee22D
    org       curbio  →  team_LkyvRf9HQKlOtcW0fRIAlzHv

`.vercel/project.json` is gitignored, so this can rot again. It was found
holding the **correct projectId with the wrong orgId** (it named
`gavin-rudmans-projects`, `team_K2aFpe8AzszNixQoMlyarfI2`). Every `vercel`
command run from the repo then resolved the wrong scope, found no project, and
offered to create one — which is how a stray project got created previously.

Always pass `--project curbiolandingpage`, and if the CLI claims the project
doesn't exist, check the orgId above before letting it create anything.

## Node stays on 22.x

`engines: { node: "22.x" }` in `package.json` **overrides** the Vercel project
setting, and the build log says so explicitly. The dashboard said 24.x while
production actually ran 22.x.

Aligned the dashboard **down** to 22.x rather than bumping the repo up: the
repo value was already what production ran, so this changed nothing at
runtime. Moving to 24 is a separate, deliberate decision — not a side effect of
clearing a warning.

---

# Cutover checklist

Must be true before DNS moves curbio.com off WordPress.

- [ ] **`/privacy-policy` exists on the new site — LEGAL-BLOCKING, not cosmetic.**
      `components/FormCard.tsx` links the TCPA consent text to
      `https://curbio.com/privacy-policy`. If that path 404s at cutover, the
      consent disclosure on every lead form points at nothing.
- [ ] Flip `indexed: true` for the partner tier in `config/routes.ts` (removes
      the noindex and adds the canonical together).
- [ ] Publish `CUTOVER_REDIRECTS` from `config/routes.ts` as the 301 set.
- [ ] Point `go.curbio.com` at its redirect target and retire it.
- [ ] Re-verify the CookieYes installation checker against the new domain.

## Leads are measured; operational records are claimed

The Control Room writes now: partners, and in coming rounds outreach, events,
spend, notes. These operational records live in the SAME Upstash database as
everything else, under the `ops:` key prefix — one database, deliberately.
A second database was considered (it would make lead-store isolation
structural rather than conventional) and rejected: one instance, one set of
credentials to rotate, one place to look.

The convention that carries the decision:

- **The lead store stays read-only.** `lib/adminLeads.ts` and
  `lib/adminWaitlist.ts` keep the read-only token forever. Ops code never
  reads or writes a `leads:*` or `waitlist:*` key.
- **Why the wall exists:** a lead that arrived over the wire is *measured*; a
  meeting someone typed in is *claimed*. They are different kinds of fact,
  and the store boundary keeps that distinction structural. In the UI, every
  self-reported number carries the `logged` marker
  (`app/(site)/admin/_ui/Logged.tsx`) — a claim must never impersonate a
  measurement, same rule as the tone scale.
- **Writes are owner-gated**, re-checked server-side in every mutation via
  the one shared guard (`lib/adminGuards.ts`). This closed a hole: exec
  notes and registry links were signed-in-gated only, so any approved member
  could write them.
- **No deletes.** Records archive (`archived: true`); nothing is ever
  silently gone. Every write stamps who and when, and appends to a capped
  audit list (`ops:<object>:audit:v1`).

The plumbing lives in `lib/opsStore.ts` and is written ONCE — Partner
established the pattern, and Outreach, Event, Note and Spend inherit it
rather than copying it. An object is a type plus its validation; the store
discipline is not re-implemented per object, so it cannot drift per object.

Notes attach to ops records, markets and leads. A note on a lead points at
the lead's id FROM the ops store and never writes to the lead record — an
editable field inside a measurement is exactly what the two-store rule
exists to prevent.

## Test leads carry the `TEST` name prefix

Every intentional test submission uses a name starting with `TEST ` and a
`utm_campaign` starting with `testcampaign-` (e.g. "TEST Attribution
DoNotWork" / `testcampaign-lasttouch-v2`). Detection keys on the NAME prefix
first — campaign values also arrive from real links, name is the convention
we control. This is what lets the admin exclude test leads from every count
by rule instead of by patching per-lead patterns after each intake test.

## A giveaway entry is not a lead

The eXpcon prize drawing (`/expcon`, `config/giveaways/`) has its own form, its
own endpoints (`/api/giveaway/*`) and its own store (`giveaway:<slug>:*` keys,
`lib/giveaway/store.ts`). It does **not** post to `/api/lead`, and that route
was not edited to make room for it.

- **Why not a campaign page.** The campaign template deliberately cannot vary
  the form or the `/api/lead` contract — that is what keeps `/exp` and
  `/lp/sell` from drifting. A drawing needs a market dropdown, a 90-day
  question, an in-place confirmation and a closing time. Building it beside
  the template, sharing only the plumbing (attribution capture, channel rules,
  markets, HSM lookup), means the two pages that earn every week changed by
  zero bytes.
- **One entry per email.** The store is a hash keyed by the normalised
  address, written with `HSETNX`. A second submission updates the first; it
  cannot become a second entry or a second deal. This matters because the app
  does not deduplicate a lead with a market and no ZIP — every POST is a deal.
- **Most entrants never reach the app.** Only an in-market entrant who answers
  "Yes", or who books a call, is handed to an HSM (plus anyone in a market who
  uses the form after the drawing, when it is a plain contact form). Everyone
  else is an entry and an email-list contact — and since 2026-10-01 the ones
  handed to an HSM are email-list contacts too (see the next section). An
  entrant handed over is ALSO written to `leads:v1` / `leads:delivery:v1` in
  the existing shapes, so the Leads screen and the CRM-failure banner see it
  like any other lead.
- **`lib/giveaway/appDelivery.ts` duplicates `/api/lead`'s delivery, on
  purpose.** The alternative was a new optional field and a skip-the-CRM
  branch in the lead route days before a conference. If `/api/lead` changes
  the stored record, the delivery record or the app payload, change both.
  After eXpcon the right fix is one shared delivery module.
- **One writer per person.** Every change to an entry is read → modify →
  write of one JSON value, so each runs inside a per-email lock
  (`withEntryLock`, a `SET NX PX`) and reads the entry after it holds the
  lock. Without it, two overlapping requests for one person — a retry on bad
  Wi-Fi, a booking landing mid-submit — both read "not sent yet" and both post
  to the app. Six simultaneous submissions now produce one deal.
- **A hand-off is written down before it is made.** The entry is saved as
  `sending`, then posted, then saved as `sent` or `failed`. The app's intake
  is given 8 seconds. A hand-off that failed, timed out, or was cut off
  mid-flight is **never repeated automatically** — same reason as the dedupe
  note: repeating a request that actually landed makes a second deal. It is
  alerted, shown under "Needs attention", and retried by an owner from
  `/admin/giveaway` after looking in the app. Every attempt for a person
  re-uses one lead id, and the `leads:v1` row is written once per id, so the
  person stays one row and their delivery record flips from failed to
  delivered.
- **No "New lead" email per entrant.** Those share a Resend account with
  `/api/lead`'s alerts; a busy afternoon at a booth must not spend the
  allowance that reports a real lead failing. The failure alert is always
  sent. `leadEmails: "every-lead"` in the giveaway's settings turns the
  per-lead email on.
- **Who is never drawn is decided once, at creation.** Test names
  (`ZZTEST …`, `Test …`) and Curbio addresses. Not re-evaluated on a
  re-submission: the form is public, so otherwise anyone who knew a rival's
  email could re-submit it as "Test" and remove them from the drawing. A
  Curbio address is also not sent to the app (it rejects them with a 403) or
  added to ActiveCampaign.
- **The 90-day answer is not sent to the app.** (Reversed 2026-10-06. It used
  to travel in `workDetails`, behind a switch that was off until Rich
  confirmed the field; the switch and the code behind it are gone.) Anything
  that reaches the app is assumed to have a listing, so the note would say
  nothing new. The answer stays on the entry. Never put anything in `Message`:
  a non-empty one keeps an estimate out of deal creation.

## The giveaway writes to ActiveCampaign

Until now this app only read ActiveCampaign (the contact mirror, the email
sync crons). `lib/giveaway/emailList.ts` is the first write: an entrant is
added to the opt-in lists and tagged.

- **Everyone, including "Yes" leads (decided 2026-10-01).** Every entrant
  goes to ActiveCampaign, and the ones an HSM is also working go to both. The
  app is where a person is worked; the list is where they are nurtured; the
  answer tag (`expcon-2026-listing-yes`) is what lets Marketing's automations
  treat the two differently. The first version left the "Yes" leads off the
  list; `routing.emailList` is the one-line switch between the two. Only a
  Curbio address is skipped.
- **Where.** Two lists per contact. Their market's list, with the `Market`
  field set (`config/emailLists.ts`, checked against the live account
  2026-10-01; Seattle has no list, and an out-of-area agent has no market, so
  both go to the Master Contact List) — and the **Engaged** list, every
  entrant, in every market.
- **The Engaged list is found by name, and the sync fails closed without it.**
  The list did not exist on 2026-10-01 (only lists 3–9), so there was no id to
  write down. `AC_ENGAGED_LIST_NAME` names it; ActiveCampaign's name filter is
  a substring match, so the match is exact in code. If it cannot be found, the
  sync writes NOTHING for that entry — no contact, no market list, no tags —
  rather than leaving people on a market list and off Engaged. The entry is
  kept, marked failed with the reason, and "Sync now" completes it once the
  list exists. Pin an id in place of the name if the list is ever renamed
  during an event.
- **Tags.** `expcon-2026`, `expcon-2026-market-<slug>`,
  `expcon-2026-listing-<yes|maybe|not-yet>`. A changed answer swaps the tag.
- **Consent.** A notice line under the submit button ("You'll also receive
  occasional emails from Curbio. Unsubscribe anytime."), not a checkbox.
  CAN-SPAM is an opt-out law and does not ask for a checkbox, and the drawing
  is US-only by its rules — an engineering reading, not legal advice; the
  rules reviewer confirms it. A page aimed outside the US would need the
  checkbox.
- **A prior unsubscribe wins.** Anyone who has ever unsubscribed from, or
  bounced on, any list is left completely alone: not re-subscribed, not
  updated, not tagged. A notice line is not consent to undo an opt-out.
- **An existing subscriber keeps their own record.** The form is public —
  anyone can type anyone's email — so for a contact already active on a list,
  the only writes are the three tags and the Engaged list. Their name, phone,
  Market and market-list memberships stay as they were. Only a contact new to
  ActiveCampaign is created from what was typed.
- **It runs after the response** (`after()`), because it is several calls to a
  rate-limited third party and must not sit between a tap and "You're in!".
  Its outcome is written back onto the entry, and the entries screen can
  re-run whatever failed.

## A giveaway is live only on Production

Vercel's Preview environment shares Production's Upstash, Resend key and CRM
webhook (`vercel env ls`, 2026-10-01), so a form submitted on a preview link
is by default a real submission. For a page that exists to be clicked through
on a preview before it goes live, that is the wrong default.

`lib/giveaway/mode.ts` therefore makes delivery live only when
`VERCEL_ENV === "production"`. Everywhere else entries go under separate
`:sandbox` keys, nothing is posted to the app, nothing is sent to
ActiveCampaign, no notification is emailed, and each entry records what WOULD
have happened.

`GIVEAWAY_DELIVERY` overrides the DELIVERY half only. `live` is for local runs
against mock services. `sandbox` on production pauses deliveries without a
deploy — and deliberately does not move the entries: someone who enters while
it is set is still in the real drawing, shown as "(sandbox)", and is sent from
the entries screen once it is lifted. A brake that diverted entrants into a
different list would quietly remove them from a prize drawing.

This applies to the giveaway only. `/api/lead` behaves on a preview exactly as
it always has — which is still worth knowing before testing a lead form there.

## "Giveaway", never "raffle"

Utah prohibits gambling, raffles included, and eXpcon 2026 is in Salt Lake
City. Every string a visitor can read — page, buttons, confirmation, Official
Rules — says "giveaway" or "drawing".

The internal campaign tag began as `expcon-raffle-oct`, because the redirect
was being set up with it before the wording was settled. It was renamed
**`expcon-giveaway-oct`** (2026-10-01) before launch: the tag sits in the
address bar for a moment after a QR scan, so it is visible after all. The page's
client components also receive `publicGiveaway()`
(`config/giveaways/types.ts`), which leaves the routing rules and tags out, so
none of them is in the page source either. The server applies the tag when a
visitor arrives without one.

## The giveaway has one prize — the whole kit — and five winners

Decided 2026-10-02. Each of the five winners receives the **entire Listing-Ready
Kit**: AirPods, a $100 Amazon gift card, and the Curbio duffel, tumbler and
notepad. The first version had five different prizes, one per winner, drawn "in
this order"; that is gone from the page, the Official Rules and the drawing.

- **Settings.** `config/giveaways/expcon.ts` has a `kit` (name, `winners`,
  `items`, `approxValueUsd`), not a list of prizes. Nothing in the settings
  can say "the first name drawn gets item 1".
- **The drawing records no prize.** `lib/giveaway/service.ts` draws
  `kit.winners` + 10 alternates in one pass; a `DrawRecord`'s winners are
  people with their entry counts, and nothing else. The order they were drawn
  in is still stored, because the recorded seed reproduces the names in exactly
  that order and Verify depends on it — but it is labelled on the staff screen
  as assigning nothing. One win per person comes from drawing without
  replacement and is unchanged. A drawing recorded before this change may carry
  stale `position` and `prize` fields; they are ignored.
- **The rules say it plainly.** Five identical kits, every item listed, about
  $500 each and $2,500 in total (`kit.approxValueUsd` × `kit.winners`), and a
  limit of one kit per person.
- **Still a judgement for the rules' reviewer:** the eligibility clause limits
  entry to real estate professionals, as the first draft did.

## Confetti is our own canvas, and link previews are set per page

Decided 2026-10-02. The page's confetti (`components/giveaway/confetti.ts`) is
about 5 KB (about 2 KB compressed) of canvas code, not a library: the audience is on a phone on
conference Wi-Fi, a dependency means a `package.json` and lockfile change (shared
files) for a page that lives a week, and the behaviour that matters is ours to
guarantee — gone within about three and a half seconds on the wall clock, never takes a
tap, half the pieces on a phone, nothing at all under `prefers-reduced-motion`,
colours read from the site's tokens. It is fetched only after the page is
interactive.

Found in the same pass: the root layout declares Open Graph and Twitter tags
for the whole site, and a page that sets only `title` inherits them, so a shared
`/expcon` link read "Curbio — Get your home market-ready" whatever the tab said.
`app/(site)/expcon/page.tsx` now sets `openGraph` and `twitter` from the same
settings as the title, and follows the closed state too. Any other page that
wants its own link preview has to do the same.

**Confetti, round two (2026-10-02).** The first version read as three separate
clumps — two side poppers and a top spray of 7–12px pieces. It is now built like
a poster: a full-width curtain from above the screen, a radial burst from behind
the headline and another from the form (so the right-hand column is covered
too), poppers at each side as accents, and pieces roughly twice the size
(12–22px, with 30–52px streamers). About 460 pieces on a desktop, about 185 on a
phone, ~3.5 s. Measured on the live canvas: no region of a 4×3 grid of the
screen stays empty. The headline is briefly hidden at peak — that is the moment.

## The eXpcon QR goes straight to the page — no short link, no redirect, no tags

Decided 2026-10-02, before anything was printed. The QR encodes
`https://sell.curbio.com/expcon` and nothing else (`docs/expcon/qr/`, level H,
read back with the OS's own detector). The WordPress `curbio.com/expcon`
redirect was dropped, and so was restoring `curbio.com/exp`'s tags in
WordPress — that is fixed in code after the show (the partnership derivation in
the live lead route). This reverses the earlier "short link so the tags can be
corrected after printing" reasoning: the page now supplies its own tags, so
there is nothing in the ink to correct.

Attribution (Attribution Spec v3.3), in `lib/giveaway/attribution.ts`:
1. No tags → Channel `event`, medium `qr`, campaign `expcon-giveaway-oct`,
   marked defaulted; first touch written once.
2. Real tags always beat the page's channel and campaign defaults.
3. **ReferralSourceId is always `eXp realty`** — the page is only promoted to
   eXp agents. A `referral_source_id` in the URL is ignored, not trusted.
Every other way the page is promoted (email, social, HSM LinkedIn, paid) is a
row on the Links screen so nobody types a UTM by hand.

The "Enjoying your Dirty Soda?" line is shown only to visitors with no
`utm_source`; everyone else sees "Can't make it to Salt Lake? You can still
enter. Enter in 20 seconds." The line is kept invisible (its space reserved)
until the browser has looked at the URL's tags, then faded in, so nobody sees
the wrong version flash. (First version swapped the text after load; changed
the same day.)
