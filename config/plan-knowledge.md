# Plan knowledge

Distilled from `docs/knowledge/` — Marketing Strategy v1.1 (Aug 29 2026), the
CEO memo, Attribution System v3.3 (Aug 29 2026), and Website Migration Plan v11
(Aug 29 2026) — reconciled against what the codebase actually implements.
Loaded into the assistant's system prompt; the source documents are not read at
runtime.

**Where a document and the code disagree, the code wins and this file says so.**
There is one such disagreement right now, in §3 — the backfill counts.

---

## 1. The 2026 targets, and how they are measured

### The business goal

From the CEO memo: execute the Magnificent Seven well and **quadruple sales
over the next 12 months**; then apply the same blueprint across an expanding
market footprint toward **$100M in sales** and a **$400–500M exit**.

### The marketing operating target

> **50 qualified leads per market per month.**
> 8 markets × 50 = **400 qualified per month** company-wide.

"Qualified" means a valid, in-market RFQ (estimate request) that the *average*
HSM — not just the best one — can work. Volume below that bar is not progress.
`QUALIFIED_TARGET_PER_MARKET_PER_MONTH = 50` in `config/marketingHub.ts` is the
single definition; nothing hardcodes 50 anywhere else.

### Why 50

At the A-player close rate (~14.5%), 50 qualified ≈ 7 deals/month/market. At
today's team average (~6%), the same 50 produce 3.

### The second lever — close rate, not volume

Moving the team from ~6% to ~10% close at ~$25k ACV is roughly **$400k
incremental per quarter**. No amount of top-of-funnel work matches that.
Marketing therefore owns qualified lead volume **and** rep enablement.
Optimizing for raw form-fills floods HSMs with leads the average rep can't
close.

### How pace is measured

Pace is actual vs. target **prorated to the snapshot's as-of day**, not vs. the
full-month target — comparing 14 days of August against a 50-lead month
manufactures a collapse. Month-over-month deltas cut the prior month at the
**same day-of-month**. Both comparisons are stated in the labels on screen.
(`paceRead` in the Marketing Hub; see `app/(site)/admin/(dashboard)/page.tsx`.)

---

## 2. The channel plan — the Magnificent Seven

Two different axes, and they must never be collapsed:

- **The planning taxonomy** (`config/channelPlan.ts`) — the CEO's seven
  motions, each with a tier, an owner, a budget and a target *before* it has a
  single lead.
- **The measurement taxonomy** (`lib/channels.ts`) — the closed list of values
  a lead can actually be tagged with at the boundary.

They do not map 1:1. Paid explodes into three measured channels. Events maps to
none — it is attributed by campaign code. Content maps to none — it is an input
the other six spend. `referral` and `direct` belong to no planning channel at
all.

| # | Channel | Tier | Owner | Role | Budget | Metric held to |
|---|---|---|---|---|---|---|
| 1 | **Email** (opt-in + cold) | 1 | Gavin / Levi | The primary engine and the one channel fully under our control. Opt-in and cold split onto separate domains so cold can get aggressive without risking opt-in deliverability. | Domains, warming, list acquisition — **TBD, Gavin to price** | Qualified/market/month (50). Inbox placement >95%, bounce <2%, spam <0.1% on the opt-in domain. Cold list ~100k names — **unconfirmed**. Click-to-RFQ is the known gap. |
| 2–3 | **Partnerships** (brokerages + super agents/teams) | 1 | Aaron / Gavin / Levi / HSMs | The multiplier. One brokerage deal can seed a market's entire 50. One good enterprise account ≈ $250k annual sales. HSMs close **meetings**, not quotes. | $100 per proposal marketing fee (**pending Adam**); $15 Starbucks card per mailing | **$150 cost per meeting.** 10 mailings + 10 calls per week per HSM → 1 meeting/week. |
| 4 | **Paid** — search, social, creator | 2 | Gavin (+ agency) | Cheapest at low volume and lifts conversion across every other channel. Search and social outsourced; creator kept in-house. | **~$2,000/mo** to start; creator **~$50+ per valid in-market SQL** | CAC per channel. Creator paid per qualified lead, never per post and never per form-fill. |
| 5 | **Organic / SEO** | 2 | Gavin | The compounding asset the website rebuild directly serves — site, landing pages, local SEO, reviews. | ~$20/mo hosting + tooling (already running) | Landing page conversion ~10% (sell.curbio.com baseline). |
| 6 | **Events** | 3 | Gavin / HSMs | Strongest CTA for engagement. Webinar registration is also a clean opt-in source. | **~$25 per attendee.** Top 15% of agents only. | Cost per attendee. **Attributed by campaign code, not channel** — without call tracking and per-event codes, event leads land as `direct`. |
| 7 | **Content** | 3 | Gavin / freelancers | The raw material every other channel spends. Messaging platform first, then subject and form. | **TBD** — priced per piece once the messaging platform exists | **No leads of its own.** Measured on the other channels' screens. Monthly newsletter once the platform exists. |

Tier meanings: **Tier 1** carries the number. **Tier 2** compounds fast.
**Tier 3** builds the engine that feeds the other six.

### Other known budget lines

Call tracking: low hundreds/mo (CallRail-class) — **required before any offline
channel can be measured**. Consent/privacy tooling: ~$25/mo per domain
(CookieYes Pro).

---

## 3. The attribution spec

### The principle

Every lead — email click, paid ad, creator link, QR code, inbound call, or a
rep entering it by hand — answers the same five questions: what channel drove
it, what campaign specifically, what format delivered it, what door it entered
through, and what originated it if different from what converted it.

**Core rule:** the channel field must always contain a real funded motion or an
honest `direct`. It must never contain the landing page, the entry method, or
the format. Those are separate fields.

### The closed channel value list

`lib/channels.ts` — **ten values, as implemented today:**

```
email · paid_search · paid_social · creator · hsm_field
partnership · organic · referral · direct · event
```

`event` was added Aug 26 (spec v3.2) so the October event push launches
attributed, and the code now carries it — the nine/ten drift that stood in the
previous distillation is **resolved**. `mail` is next in line, to be added only
when direct mail actually launches.

Derivation rule: channel is derived from `utm_source` against this list.
**Absent source → `direct`. Unrecognized source → `direct`.** Never null, never
"landing page," never a phantom channel minted from a typo. The raw value still
travels in `utmSource` for audit.

### The CRM field model

| Concept | CRM column | Values | Constraint |
|---|---|---|---|
| channel (last touch) | `Channel` | the closed list | Required. Derived, never raw. |
| campaign | `UtmCampaign` | `nurture-payatclosing-jun` | Naming convention below. Nullable. |
| medium | `UtmMedium` | `e · cpc · social · print · qr · collateral` | Nullable. |
| entry point | `Origin` | `web_form · phone · manual · inbound_email` | Required. Set by the door that creates the lead. |
| first-touch channel | `LeadSource` | same set as channel | Write-once. Legacy writers still colliding. |
| first-touch campaign | `FirstTouchCampaign` | same convention as campaign | Write-once. |
| variant / creative | `UtmContent` | `control`, `treatment`, creative ids | Nullable. |
| partner | `ReferralSourceId` | `eXp realty`, brokerage names | **Verbatim, never normalised.** Also derives `channel = partnership`. |
| market | `Market` | display name from `config/markets.ts` | The config is the source of truth — the spec deliberately does not enumerate markets. |
| — reserved — | `PromoCode` | real promo codes | Untouched by attribution. Reserved for the creator/affiliate per-creator code. |
| — unused — | `UtmTerm` | — | Accepted if present. Nothing is built on it. Stays empty by design. |

### Why channel and entry point are separate

One channel uses many doors; one door carries many channels. The test for which
field a fact belongs in: **would we change spend based on it?** Yes → channel.
Just plumbing → entry point. Collapsing them is the root defect in the old
system, which recorded *where a lead landed* rather than *what marketing caused
it*.

### Why first-touch is kept separately

The channels we most want to grow — creator, events, field, partnership — sit
at the top of the funnel and rarely get the final click. Store only last-touch
and those channels look worthless and get defunded. `Channel` holds what
converted; `LeadSource` holds what originated.

### The three doors

| Door | Status | How attribution is set |
|---|---|---|
| Web form | **LIVE** | UTMs read synchronously on arrival, **before** the URL strip — ordering is load-bearing. First-touch from a write-once 90-day store. |
| Phone | **NOT BUILT** | Needs call tracking: a number per channel/campaign, with a whisper announcing the source. Gating dependency for events and direct mail. |
| Manual (rep-created) | **NOT BUILT** | Channel and campaign must be mandatory, pre-defaulted per HSM — confirm, don't type. Gating for the super-agent mail-then-call motion. |
| Inbound email reply | **LIVE, unattributed** | Routes through the market distribution group into leads@curbio.com. `channel = email` set by the door; campaign best-effort from the subject line. |

### Naming convention

- `utm_source` is always one of the closed channel values, spelled exactly.
  Lowercase, no spaces. **Both email platforms send `utm_source=email`** —
  ActiveCampaign (opt-in) and Instantly (cold). A platform name in `utm_source`
  would mint a phantom channel and derive to `direct`; the `cold-` / `nurture-`
  campaign prefix is what separates the two domains, never the source.
- `utm_campaign` is `[tactic]-[descriptor]-[market-or-date]`, lowercase,
  hyphens not underscores — `nurture-payatclosing-jun`, `cookie-q3-nova`,
  `expcon-booth-oct`. Email splits on the leading token: cold sends begin
  `cold-`, opt-in sends begin `nurture-`.
- `utm_medium` is one of `e · cpc · social · print · qr · collateral`.
- Validate at the boundary so a malformed UTM cannot create a phantom channel.
- **Trailing whitespace fractures a campaign silently.** Two live values carry
  a trailing non-breaking space (`price-jul ` and `halfway-jul `) and will not
  aggregate with their clean twins. Fix at the link source.
- **Normalize before every match, and never fall through silently** (v3.3).
  The same fracture recurred on referral values: two `landing page` rows with
  trailing whitespace missed the backfill mapping and were routed to `direct`.
  Rule: every string match against lead data normalizes first — trim, collapse
  internal whitespace, strip non-breaking and zero-width characters, lowercase
  — and any value that still fails to match is logged in the import report
  **with its raw bytes**. Silent fallthrough to `direct` is banned.
- **QA tags are excluded, not documented.** `testcampaign-`, `phase2-` and
  similar prefixes are filtered out of lead-facing reporting and the
  undocumented-tags banner (`config/campaignHygiene.ts`). Genuine undocumented
  tags are auto-created in the Links registry with first-seen date, lead count
  and inferred channel, flagged **auto-documented** for review — evidence
  awaiting confirmation, never presented as authored documentation.

### Enforcement

Channel required, closed-list, no free text, no blank. **Kill "OTHER" as a
resting state** — unclassifiable leads route to a triage queue cleared weekly;
every permanent OTHER is unattributable spend.

### The §8 backfill — EXECUTED Aug 29, and what it did and did not fix

The one-time import ran on Aug 29: **852 deals, Jan 2 – Aug 29**, tagged
`source: app-import` and superseded record-by-record (keyed on Deal ID) when
the API sync lands. The mapping is versioned code
(`config/referral-backfill.ts`, v1.0.0), applied at ingest, **never edited
per-lead**.

> **The Marketing Strategy's own §4 backfill table is SUPERSEDED** (v1.1 says
> so explicitly). The implemented mapping differs from that sketch in two
> places: `landing page` (all case variants) maps to **email**, because an
> email CTA click is the only path onto those pages; and `lonewolf` maps to
> **partnership**, flagged low-confidence for reclassification. The authority
> is the config file, not the table in the strategy doc — do not quote that
> table.

Referral values map to channel + entry point per §3c: landing-page variants →
`email` / `web_form`; `Inbound Email` → `email` / `inbound_email`; `Phone Call`
→ `direct` / `phone`; partner labels → `partnership` with campaign = the
partner name (lonewolf's 45 rows flagged **low-confidence**); `www.curbio.com`,
`curbio.com/*` pages and the Webflow city LPs → `direct` per §4/§9 — the
surface is preserved in `landing_page_url`, the channel is never minted.

**Result, and the one place the spec and the code disagree:**

| | Attribution spec v3.3 | The code today | Why |
|---|---|---|---|
| email | 87 (10.2%) | **90 (10.6%)** | see below |
| partnership | 123 (14.4%) | **123 (14.4%)** | — |
| direct | 642 (75.4%) | **639 (75.0%)** | see below |
| provenance | 58 measured · 757 inferred · 37 inferred-by-date | **55 measured · 758 inferred · 39 inferred-by-date** | — |

v3.3 records the first import run. Three rows have moved since: the CRM writes
`Channel = "direct"` as a **default** on web-form leads, not as a measurement,
so rows carrying `Referral source = "landing page"` were being treated as
measured-direct and never reached the mapping. The import now trusts `Channel`
only when it is non-direct, or direct with real UTM data behind it. Two of the
three rows then picked up Mailchimp correlations, which is why
inferred-by-date rose to 39. **Quote the code's numbers; mention the spec's if
precision matters.**

That **75% direct is the honest ceiling for history, not a defect.** Most of
the funnel predates or bypasses the web door, and dark traffic is not
convertible into a channel by inference.

**Provenance is load-bearing — never present inferred as tracked.**
`measured` = a real captured signal. `inferred` = the §8 mapping. 
`inferred-by-date` = a Mailchimp send-time correlation. The Attribution page
carries a Measured/Inferred filter and states both numbers; any answer about
historical channel performance must say which kind it is resting on.

**Mailchimp campaign correlation.** Backfilled email leads get `utm_campaign`
by date-correlation against the send log: the most recent qualifying campaign
within **72h** before lead creation, market-named campaigns must match the
lead's market, test sends excluded. **39 of 39 eligible leads matched, 15
flagged ambiguous.** Historical email rows carry `utm_source = mailchimp` for
audit.

**Therefore: every channel-level comparison still carries a caveat.** A channel
that looks small may be unattributed, and most historical attribution is
inferred rather than tracked. Never present a channel ranking as conclusive.

### Revenue keys to Won date, never created date

Revenue aggregates by the month a project was **won**. August won **$126,903**
across 5 projects; the created-in-August view showed $15.3k — the same money
filed under the month the lead arrived. Negative rows (Final Credits, Change
Orders, including Excel's leading-apostrophe minus) are **real money** and
count in monthly totals even when they cannot join to a lead.

Booked revenue by won month: Jan 42,840 · Feb 84,345 · Mar 410,810 ·
Apr 221,372 · May 185,812 · Jun 369,364 · Jul 243,256 · Aug 126,903.
Total $1,684,702.

Two series exist and are not interchangeable: the **authoritative** total
(every sales row, no join needed) and the **attributed** slice (joined to a
lead, the only part splittable by channel). Jun–Aug are fully attributed;
Jan–May are not — March has $77,575 that cannot be placed in a market × channel
cell. Channel-level revenue therefore under-totals the month, and the surfaces
say so rather than letting the grid total stand in for booked revenue.

### Stage casing

New app exports changed funnel-stage casing ("Spoke with agent" vs "Spoke with
Agent"). Ordinal lookups are case-insensitive; a casing drift must never
silently demote a deal to stage 0.

### Dark traffic — the four recovery methods

An agent who reads an email and later types curbio.com is indistinguishable
from a cold visitor. No system solves this; the goal is to shrink the unknown
bucket and estimate what's in it.

1. **Self-reported attribution** — one "How did you hear about us" dropdown.
   Highest-ROI single fix; recovers the email-typer directly. Deliberately
   deferred to keep the form frictionless — worth A/B testing now that the 10%
   baseline exists.
2. **Email-only destinations** — sell.curbio.com already serves this role.
3. **Identity matching** — match a web lead's email against recent campaign
   sends. Open question: does the CRM ↔ email platform match capability exist?
4. **Holdout tests** — withhold a campaign from a random 10% of a market; the
   lift in the other 90%, including `direct`, is that campaign's true
   contribution.

Mental model: last-click tells you where leads finished; self-report and
holdouts tell you what actually caused them. The gap is dark traffic — keep it
measured and shrinking, never assume it's zero.

---

## 4. The funnel

```
Lead → Spoke with agent → Meeting scheduled → Completed walkthrough
     → Proposal sent → Contract sent → Waiting on deposit → Won
```

Two rules that change how counts read:

- **Stages are not strictly sequential.** A deal can skip stages or be recorded
  out of order. Counts are **cumulative reached-at-least**: a deal at Proposal
  sent has passed Meeting scheduled. Post-proposal production stages (Contract
  sent, Waiting on deposit, Design, WIP, Completed) mean the deal got at least
  as far as Proposal sent.
- **Closed means status Won, exclusively.** Nothing else counts as closed.

---

## 5. Markets

Eight live markets, from `config/markets.ts` — **the only place a market is
named.** Adding a market is a row in that array and nothing else.

| Slug | Display name | Operator (app) key | CRM name |
|---|---|---|---|
| `atlanta` | Atlanta, GA | Atlanta | Atlanta |
| `washington-dc` | Washington, DC | DC | DC |
| `dallas` | Dallas, TX | Dallas | Dallas |
| `maryland` | Maryland, MD | Maryland | Maryland |
| `los-angeles` | Los Angeles, CA | Los Angeles | Los Angeles |
| `northern-virginia` | Northern Virginia, VA | NOVA | NOVA |
| `riverside` | Riverside, CA | Riverside | Riverside |
| `seattle` | Seattle, WA | Seattle | Seattle |

Three systems name markets and only one is authoritative for the public slug:
`slug`/`displayName` (marketing's naming, live and converting — verbatim, do
not tidy), `operatorName` (app.curbio.com's ZIP→HSM lookup key), `crmName`
(what the CRM expects in the payload).

**The app-code rollup lives in `config/market-map.ts`** — the authority for
which app market code reports as which market:

- **Seattle opened.** It is one of the 8 active markets.
- **San Diego is CLOSED.** Its history is retained and shows in trends under
  "Other / closed markets", and it is excluded from pace, targets, and the
  active-market denominator.
- **SMD / NMD / BAL consolidate into one Maryland.** The CRM code stays `BAL`.

Any app code the rollup does not place on an active market aggregates under
**"Other markets"** and never becomes a market row.

**No per-market special cases anywhere.** If something is true of one market
and not another, it is a field in `config/markets.ts`, not a branch elsewhere.

Launch status: the plan assumes growth from 8 markets toward **50**, and from
~10 partners toward 50+. The CEO memo directs hiring stager/HSM candidates in
the next top 5 markets plus top-ups in Dallas and Maryland.

---

## 6. Site structure and migration state

### The replatform

WordPress (WP Engine) + HubSpot + Webflow → **one Next.js platform on Vercel,
one repo, one domain**, architected for 50 markets rather than 7.
`app.curbio.com` is **not in scope** — it is the CRM and sales platform, and
appears here only as the endpoint lead forms submit to.

### Locked decisions

Hosting Vercel Pro · Next.js App Router + TypeScript + Tailwind, **no CMS** ·
one domain, everything on curbio.com · three-tier URL namespace · route groups
`app/(site)/` and `app/(campaigns)/` · sell page at `curbio.com/lp/sell` · eXp
at `curbio.com/exp` as an **indexed partner page**, not a campaign page ·
PostHog + GA4 + Search Console · consent shipped (CookieYes, Consent Mode v2,
GPC honored).

### The three page tiers

| Tier | Path convention | Indexed | Lifespan |
|---|---|---|---|
| Site pages | `/how-it-works`, `/markets/*`, … | Yes (at cutover) | Permanent |
| Partner pages | `/exp`, and the 40 vanity URLs porting into the same template | Yes | Long-lived; earn inbound links |
| Campaign pages | `/lp/:campaign`, `/lp/:campaign/m/:market` | **Never** | Disposable |

Page count on a domain is not a cost. Three independent switches: on the domain
· in the navigation · indexed by Google. A nav cannot list 50 markets — index
pages and search do that job.

### Phase state

- **Phase 1 complete** — redirect export landed (219 rules).
- **Phase 2 complete** — the `/admin` Control Room shipped. It has since grown
  well past the original page registry + lead viewer into a full ops dashboard
  (§7). **v10 deferred the Marketing Hub to post-cutover; v11 records that
  decision reversed — it was built early.**
- **Phase 3 in progress** — pages and content; the homepage design pass has
  begun. The public-site redesign runs on `feat/site-redesign` in a git
  worktree owning `app/(site)/(chrome)/`, `/lp/` and `public/`.

### Working agreements that now govern the repo (v11)

- **`main` is the source of truth. Production deploys from `main` only — never
  a Vercel branch promotion.** Adopted after production was found running an
  unmerged branch tip, and written into `CLAUDE.md`.
- **Shared-files freeze list**, requiring a stop-and-ask from either branch:
  `package.json`, `tailwind.config.ts`, `globals.css`, `tokens.css`, the root
  layout, `middleware.ts`, `next.config.js`, `lib/channels.ts`,
  `config/markets.ts`.
- **Two token systems are deliberate.** The public site keeps Google's
  subsetted WOFF2 on `--font-serif` / `--font-sans`; admin keeps self-hosted
  TTFs on `--ops-font-*` (605KB unsubsetted — never promoted global). A Phase 3
  design pass must **not** "consolidate" either.
- **`/marketing/executive/<token>`** renders the exec review to a token holder:
  aggregates only, PII stripped at the import boundary, token rotatable by env
  var, comparison timing-safe at both middleware and page.

### Known open items

- **Homepage gaps before it can go to `/`:** the hero ZIP field and CTAs are
  stubs that do not call `/api/lead` or `/api/resolve`; stats are unsourced;
  one placeholder photo; the results marquee needs real photography. **Do not
  promote a homepage with a dead form.**
- **Four nav pages promised but missing:** `/how-it-works/agents`,
  `/how-it-works/sellers`, `/pay-at-closing`, `/brokerages` are all linked from
  the shipped audience router and none exist. Build them or remove the links —
  a live nav pointing at 404s is worse than a shorter nav.
- **Formstack is live, not dormant:** 42 forms, 30,373 lifetime submissions,
  three estimate forms still taking traffic in 2026, one near its plan cap. The
  "ZIP ONLY – Market Pages" form is embedded on market pages and still
  collecting. Cannot be switched off until each embed has a replacement.
- **HubSpot inventory:** 547 landing pages on a 30-page plan (publishing
  frozen) and 763 forms, most untracked since October 2025. 35 flagged
  submissions on a 90-day deletion clock — export before anything else.
- **GA4 account owner UNKNOWN.** Search Console is self-serviceable via DNS.

### The standing rule

**Every new page gets a row in `config/pageRegistry.ts`, added as `stub`.**
Only Gavin flips a row to `live`. The registry also maintains its own backlog:
anything the navigation links to that the app does not implement appears
automatically as `planned`.

---

## 7. The reporting layer — BUILT, with one gap left

**"Nothing today joins CRM + email + spend" is no longer true.** The ops
dashboard at `sell.curbio.com/admin` joins the CRM snapshot and Mailchimp into
the channel × market view: Qualified / Engaged / Closed / Revenue by market and
channel, first-touch beside last-touch, Attribution Health with a
Measured/Inferred filter, a Links registry that auto-documents live campaign
tags, email list health, and an Ask assistant grounded in these documents. One
merged lead store (`lib/leadStore.ts` — import + live, deduped on Deal ID)
feeds every surface, verified to agree across Home, Email, Performance and
Attribution.

**The remaining gap is the paid-spend join, and it blocks CAC everywhere.**
Also outstanding: the two email webhooks, wired at the September migration.
Until spend lands, CAC renders as an em-dash and must never be estimated.

The view exists to say "creator leads in Atlanta close at 4% at $50 each; email
nurture in DC closes at 11%; partner-sourced leads in NOVA close at 18% over 60
days" — and to answer whether a low close rate is a rep problem or a
lead-source problem. The channel and market halves are now real; the cost half
is not.

### Email platform migration — in flight

**Mailchimp is retiring.** Sends ran through it up to Aug 29 (6 market
audiences, 648 campaigns YTD; **Seattle and Riverside have no audience** — that
is absent, not zero, and it never counts toward Qualified). Migration begins the
**first week of September**: opt-in to **ActiveCampaign**, cold to
**Instantly**. Both send `utm_source=email`; the `cold-` / `nurture-` prefix
separates the domains. Historical Mailchimp attribution is preserved through
the Aug 29 backfill (`utm_source: mailchimp`). Mailchimp joins the Phase 8
retirement list once the two webhooks are live and the send history is
archived.

### What the data actually is right now

The Qualified numbers come from **`config/appLeadsSnapshot.json`** — a
one-time, PII-stripped export of every estimate request in app.curbio.com YTD.
It is a **snapshot, not a sync**: accurate through its `asOf` date and drifting
after. It contains no Engaged data, no spend, and no first-touch history, so
those metrics stay em-dashes. Every surface rendering from it labels it as
such, and it never invents what it does not have.

### The five priorities

1. **Finish attribution before scaling spend.** Clean inputs first.
2. **Optimize for qualified RFQ, not form-fills.**
3. **Weight partnerships and the enterprise motion** — the two places where one
   win supplies a market's entire number.
4. **Protect top-of-funnel channels with first-touch.**
5. **Treat HSM enablement as marketing's job** — the ~$400k/quarter lever.

### Open decisions

Cold list size (~100k, Gavin to confirm) · partner marketing fee structure and
compliance framing (Adam) · paid agency select-or-in-house · self-reported
attribution field: add now and A/B test, or keep deferring for friction ·
creator program size per market · events cadence and which markets go first.

**Closed since v1.0:** the reporting layer's tool and owner (built in-repo,
§7), and the CRM ↔ email identity-match question — the Mailchimp send-time
correlation answers it for history, though it is correlation, not a true
identity match, and it retires with Mailchimp.

Cadence: **monthly marketing review** with the team. The channel × market
report is the agenda.
