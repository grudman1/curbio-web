# Plan knowledge

Distilled from `docs/knowledge/` — the 2026 Marketing Strategy, the CEO memo,
Attribution System v3.2 (Aug 26 2026), and Website Migration Plan v10 (Aug 17
2026) — reconciled against what the codebase actually implements. Loaded into
the assistant's system prompt; the source documents are not read at runtime.

**Where a document and the code disagree, the code wins and this file says so.**

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

`lib/channels.ts` — **nine values, as implemented today:**

```
email · paid_search · paid_social · creator · hsm_field
partnership · organic · referral · direct
```

Derivation rule: channel is derived from `utm_source` against this list.
**Absent source → `direct`. Unrecognized source → `direct`.** Never null, never
"landing page," never a phantom channel minted from a typo. The raw value still
travels in `utmSource` for audit.

> **Spec/code drift — state this when it matters.** Attribution spec v3.2
> (Aug 26 2026) adds a **tenth** value, `event`, so the October event push
> launches attributed, and documents `mail` as next in line for the direct-mail
> launch. **`lib/channels.ts` still has nine.** Until the code is updated, an
> `event` UTM would silently derive to `direct` — which is exactly the failure
> the closed list exists to prevent. Treat nine as the runtime truth and ten as
> the spec.

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
  Lowercase, no spaces.
- `utm_campaign` is `[tactic]-[descriptor]-[market-or-date]`, lowercase,
  hyphens not underscores — `nurture-payatclosing-jun`, `cookie-q3-nova`,
  `expcon-booth-oct`. Email splits on the leading token: cold sends begin
  `cold-`, opt-in sends begin `nurture-`.
- `utm_medium` is one of `e · cpc · social · print · qr · collateral`.
- Validate at the boundary so a malformed UTM cannot create a phantom channel.
- **Trailing whitespace fractures a campaign silently.** Two live values carry
  a trailing non-breaking space (`price-jul ` and `halfway-jul `) and will not
  aggregate with their clean twins. Fix at the link source.

### Enforcement

Channel required, closed-list, no free text, no blank. **Kill "OTHER" as a
resting state** — unclassifiable leads route to a triage queue cleared weekly;
every permanent OTHER is unattributable spend.

### The unattributed problem — the standing caveat

Roughly **80% of qualified leads carry no usable channel**, and the honest
reason is that most of the funnel predates or bypasses the web door.

Measured state as of the v3.2 window (848 deals, Jan 2 – Aug 27 2026):

- `Channel` populated on **55 / 848 (6%)** — all from July onward, i.e. the web
  door working from the moment it shipped. Values: email 45, partnership 7,
  direct 3.
- `ReferralSource` populated on 716 / 848 (84%) — and it is the junk drawer:
  `www.curbio.com` (331), `Phone Call` (53), `landing page` (50), `Other` (49),
  `lonewolf` (45), `Inbound Email` (38).
- `Origin`, `UtmContent`, `FirstTouchCampaign`: **0%** — three casualties of a
  key-name mismatch in the payload, root-caused and fixed Aug 26. Expected to
  populate from that date forward.
- **52 deals Won in 2026, and zero carry channel attribution.** The first fully
  attributed closed-won is still ahead.

**Therefore: every channel-level comparison carries this caveat.** A channel
that looks small may simply be unattributed. Never present a channel ranking as
conclusive.

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
(what the CRM expects in the payload). App market codes not mapped to a market
(SEA, SD in the snapshot) aggregate under **"Other markets"** and never become
market rows.

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
- **Phase 2 complete** — the `/admin` Control Room shipped (page registry +
  read-only lead viewer). Foundation work done.
- **Phase 3 in progress** — pages and content. The homepage exists as a real
  page at `/home-preview`, noindexed, **waiting on sign-off**, and is the
  single item blocking Week 3.

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

## 7. The reporting gap — the highest-leverage remaining build

Nothing today joins CRM + email platform + paid spend into one **channel ×
market** view. That view is what lets us say "creator leads in Atlanta close at
4% at $50 each; email nurture in DC closes at 11%; partner-sourced leads in
NOVA close at 18% over 60 days" — and reallocate accordingly. It also answers
the open sales question directly: whether a low close rate is a rep problem or
a lead-source problem. Today that is invisible.

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
compliance framing (Adam) · paid agency select-or-in-house · CRM ↔ email
identity match capability · self-reported attribution field: add now and A/B
test, or keep deferring for friction · reporting layer tool and owner · creator
program size per market · events cadence and which markets go first.

Cadence: **monthly marketing review** with the team. The channel × market
report is the agenda.
