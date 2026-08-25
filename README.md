# Curbio Email Landing Page

Single-purpose conversion page for Curbio pre-listing home improvement campaigns.
Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Vercel**.

**Live:** https://curbiolandingpage.vercel.app  
**Repo:** https://github.com/grudman1/curbio-web

---

## Page flow

```
/ (landing page)
  ↓  form submit → /confirm?market=<slug>   (HSM card + Calendly)
                        ↓  "No thanks, I'll wait" → /

?zip=<code>       → correct market page, or waitlist if unserved
?status=waitlist  → waitlist capture form
?market=<slug>    → that market's page directly
```

**Email prefill params**

Append `&n=First%20Last&e=agent%40brokerage.com` to any campaign link to
pre-populate the name and email fields. Use your ESP's merge tags to inject
per-recipient values at send time. Params are short to keep URLs clean:

| Param | Field |
|---|---|
| `n` | Full name |
| `e` | Work email |

Fields are pre-filled but fully editable. Phone stays blank (not collected at send time).
Prefilled fields show a subtle amber border until the user edits them.

**Mailchimp:**
```
/?market=atlanta&n=*|FNAME|*%20*|LNAME|*&e=*|EMAIL|*
```

**HubSpot:**
```
/?market=atlanta&n={{ contact.firstname }}%20{{ contact.lastname }}&e={{ contact.email }}
```

---

## Project structure

```
app/
  page.tsx              Landing page (server — resolves market from params/ZIP/geo)
  confirm/page.tsx      Post-submit confirmation (HSM card + Calendly iframe)
  api/lead/route.ts     Lead capture endpoint (POSTs to CRM webhook)
  globals.css           Design tokens + all lp-* component styles
  layout.tsx            Fonts (Lora + Libre Franklin) + Vercel Analytics

components/
  PageShell.tsx         Client shell — market picker modal state
  ConfirmShell.tsx      Client shell — HSM card + Calendly iframe
  WaitlistShell.tsx     Client shell — out-of-area waitlist page
  LpSections.tsx        All page sections: Hero, FormCard, SoldProofStrip,
                        HowItWorks, Closer, Header, Footer, WaitlistPage
  LpModals.tsx          ZipModal (market card grid + ZIP lookup + waitlist link)
  LpKit.tsx             Shared primitives: Icon, PillButton, Field, Modal

lib/
  campaignMarkets.ts    Market registry + sold listings data (photos, prices)
  markets.ts            Curbio operator catalog (HSM bios, photos, Calendly URLs)
  operator.ts           Live Curbio operator API client
  resolveMarket.ts      ZIP / geo → market resolution (handles all URL params)
  flags.ts              A/B flag: cta-copy (control vs treatment)

middleware.ts           Sets curbio_vid cookie for stable A/B bucketing

public/
  logo/                 Curbio wordmark (navy + white SVG)
  hsm/                  HSM headshots
  sold/                 Atlanta sold listing photos
```

---

## Sections (desktop order)

| Section | Background | Notes |
|---|---|---|
| Header | Cloud white | Logo → / · Market picker opens ZipModal |
| Hero | Cloud white | 3-line headline, lead form right column |
| Sold proof strip | Stone | 5 Atlanta listings, real photos + prices |
| How it works | Cloud white | 3 steps, Lucide icons in stone discs |
| Closer | Navy | Headline + amber CTA pill |

---

## Market system

Clicking the market tag (top right) opens a modal with 7 market cards + a ZIP
input. Selecting a market navigates to `/?market=<slug>`. Entering a ZIP calls
the live Curbio operator API — matched ZIPs show the right market, unmatched
ZIPs route to the waitlist.

**Served markets:** Atlanta · Dallas · Los Angeles · Riverside ·
Northern Virginia · Washington DC · Maryland

Sold listings and proof data per market: `lib/campaignMarkets.ts`.
Other markets currently show placeholder proof — add real sold data there.

---

## A/B test (Vercel Analytics)

Flag: `cta-copy`

| Variant | Copy |
|---|---|
| control | "See how we'd prep your listing" |
| treatment | "Show me how you'd prep my listing" |

Bucketed server-side via `curbio_vid` cookie (set in `middleware.ts`).
Drives both the form submit button and the closer CTA.
Track results in Vercel Web Analytics → `lead_submit` event, filter by `variant`.

> One send won't reach significance — run across multiple sends.

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `CURBIO_CRM_WEBHOOK_URL` | Optional | Where `/api/lead` POSTs leads. Logs to console if unset. |
| `CURBIO_CRM_API_KEY` | Optional | `Bearer` token for the webhook. |
| `CURBIO_OPERATOR_API` | Optional | Override the live operator API base URL. |

Copy `.env.example` to `.env.local` for local development.

---

## Local development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build check
```

Try `/?market=dallas`, `/?zip=75201`, or `/?zip=80202` (Denver → waitlist).  
IP geolocation only works on Vercel, not localhost.

**Node 22.x required** — pinned via `.nvmrc` and `package.json#engines`.

---

## Deployment

Auto-deploys to Vercel on push to `main` via GitHub integration.

- Framework: **Next.js** · Build: `next build` · Node: **22.x**
- Add `CURBIO_CRM_WEBHOOK_URL` and `CURBIO_CRM_API_KEY` in Vercel → Settings → Environment Variables.

---

## Adding a new market

Verified against Seattle (market #8, 2026-08-25). The previous version of this
section described editing `CAMPAIGN_MARKETS`, `getCampaignMarket()` and
`BY_MARKET_NAME` — none of which have owned market data since the list-driven
refactor (#16).

**Before you edit anything, ask the operator API what it already knows.** The
market must be live in app.curbio.com first — this codebase reads its market
name, HSM, phone and Calendly URL live, per request:

```bash
curl -s "https://app.curbio.com/api/Operator/GetOperatorLead?code=<canonical-zip>"
```

Use that response as the source for `operatorName` (its `marketName`, EXACTLY)
and to confirm the HSM's name spelling. Do not copy the HSM's phone or Calendly
URL into config — they are not stored here, and the operator admin's "Edit
Market" form can disagree with what the API actually serves. The API wins.

**1. Add one row to `config/markets.ts`.** That is the only place a market is
named. Field sources:

| Field | Comes from |
|---|---|
| `slug`, `name`, `displayName`, `coverage`, `cities` | Marketing. The sell.curbio.com picker is authoritative for public naming — verbatim, do not tidy. |
| `operatorName` | The API's `marketName`, exactly. |
| `crmName` | What the CRM expects. Usually matches the picker name; confirm, don't assume — an unknown market is worse than none. |
| `appMarketCodes` | app.curbio.com's report codes. |
| `state`, `coordinates` | Geo fallback. `displayName` must end in `, ${state}` — the guard checks it. |
| `canonicalZip` | Any served ZIP that resolves. Must be unique across markets. |
| `hsm` | Name + headshot path only. Live identity comes from the API. |
| `legacySlugs` | See the gotcha below. Usually `[]`. |
| `sold` / `placeholder` | See step 4. |

**2. Drop the HSM headshot at the path `hsm.photo` names** (`public/hsm/`).
Existing ones are ~1100-1320px, 75-250KB JPEGs. Every render site uses
`object-fit: cover`, so square sources are fine. Convert PNGs — don't ship a
2MB file behind a `.jpg` path.

**3. Add the HSM to `TEAM` in `lib/markets.ts`**, keyed by the EXACT `pmName`
the operator API returns. This does NOT derive from the market row: without an
entry the confirm-page card silently falls back to a templated bio and a
branded placeholder, even with the headshot on disk. Use `{market}` in the bio
only if they cover more than one market.

**4. Sold proof.** With verified sales: listings in `sold`, photos under
`public/sold/<slug>/`. Without them: `sold: []` and `placeholder: true`. The
strip is then suppressed rather than rendering an empty row. NEVER borrow
another market's listings or invent a price. `markets.guard.ts` enforces that
`placeholder` and `sold` agree in both directions, so clear the flag in the
same commit that adds real proof.

**That's the whole edit.** These all derive from the row with no further work,
and each was confirmed for Seattle: the `/markets/<slug>` page and its
`generateStaticParams`, the `/lp/<campaign>/m/<slug>` and `/exp/m/<slug>`
prerenders (and their `/v/<variant>` twins), nav and footer entries, the
sitemap URL, the ZipModal picker card, legacy 301s, ZIP and geo resolution, the
CRM market string, the Control Room page registry and its `×N markets` badge,
the homepage market/HSM lists, and the `N markets` counts in copy.

### Gotchas

- **`legacySlugs` only models `/markets/<old>` → `/markets/<new>`.** Putting the
  market's OWN slug there 301s its page to itself — an infinite loop. The guard
  catches it, but only when `/markets` renders. A root-level legacy path like
  `/seattle` is a different URL shape this field does not handle.
- **The guard runs on the `/markets` page, not on every build.** Hit
  `/markets` after adding a row; a coherence failure throws there.
- **No `if (slug === "…")`, ever.** If it is true of one market and not
  another, it is a field in `config/markets.ts`.

---

## Consent & privacy

CookieYes (`NEXT_PUBLIC_COOKIEYES_ID`) is the consent banner and the sole
consent cookie store. `lib/consent.ts` is the single authority the rest of
the app reads it through — `getConsentState()`, `hasGpc()`, `onConsentChange()`.
Nothing else touches the CookieYes cookie or its APIs directly.

**Gated on consent:**

| Signal | Mechanism |
|---|---|
| GA4 (`NEXT_PUBLIC_GA_ID`) | Google Consent Mode v2 — a `consent` `default`/`update` signal pushed onto the gtag dataLayer queue in `lib/analytics.ts`, ahead of `config` by construction. The GA4 *script* always loads; Consent Mode is what tells it to stay cookieless when denied, rather than the script being blocked outright. |
| Microsoft Clarity (`NEXT_PUBLIC_CLARITY_ID`) | Full injection gate (`components/ClarityLoader.tsx`) — Clarity has no consent-mode equivalent, so it is simply never injected until analytics consent is `true`. `clarity('stop')` fires if consent is revoked after injection. |

**Deliberately NOT gated** (first-party, functional, or cookieless — no
consent gate applies):

- **Vercel Analytics** (`<Analytics />` in `app/layout.tsx`) — cookieless by design.
- **Lead attribution** — UTM capture, `channel` derivation (`lib/channels.ts`),
  first-touch `localStorage` (`lib/analytics.ts`), and the `/api/lead`
  payload. First-party data collection under the site's own privacy policy,
  not third-party tracking.
- **IP / market resolution** — `/api/resolve`, `lib/resolveMarket.ts`, the
  middleware `?market=` rewrite, and all ZIP/geo handling. Entirely
  server-side and cookie-independent; a visitor who declines everything
  still gets their market resolved and their HSM shown.
- **Form prefill and the `/confirm` handoff** — the `?n=`/`?e=` merge-tag
  prefill, `captureAttribution()`'s ordering relative to the URL strip, and
  the `curbio_confirm_prefill` cookie that carries name/email/phone to
  `/confirm` for the Calendly iframe. All first-party functional behavior;
  none of it is analytics or advertising.

**Pre-banner default:** `CONSENT_DEFAULT` in `lib/consent.ts` — the state
used before a visitor has interacted with the banner and no GPC signal is
present. Currently `"granted"` (US state-privacy-law opt-out posture).
**Legal owns this value** — it's the one line to check or change.

**Global Privacy Control (GPC):** a GPC signal (`navigator.globalPrivacyControl
=== true`) always overrides everything else, including an existing "yes"
decision cookie. Under GPC: Consent Mode reports `denied` for all four
signals, Clarity never injects, and there is no separate custom UI — CookieYes's
own GPC handling (dashboard setting, see below) additionally records the
opt-out against the visitor's session.

**CookieYes dashboard checklist** (screenshot this section for legal):

- [ ] Banner template: **US State Laws** (matches `CONSENT_DEFAULT: "granted"` — switch both together if the posture ever changes to GDPR-style).
- [ ] **Respect GPC** enabled.
- [ ] Opt-out preference center enabled and linked (footer or banner).
- [ ] Categories in use: **Analytics**, **Advertisement** (mapped 1:1 in `lib/consent.ts`).
- [ ] Auto-blocking: **off / not relied upon** — this app gates its own scripts in code; CookieYes is banner UI + cookie store only.

---

## Open flags

- **Acworth $497,000** — `unverified: true` in `config/markets.ts` (the flag was
  dropped in e052048 when the photo was added, and restored 2026-08-25; it had
  been rotating unflagged in the homepage ticker in between). Confirm this is a
  verified sale price before a real send. It still shows on the Atlanta campaign
  strip; only the homepage ticker filters unverified prices.
- **`/seattle` → `/markets/seattle/`** — an active WordPress rule with 31
  inlinks. The destination is live in this app, so nothing is needed now, but
  the ROOT-level `/seattle` path is not served here. Phase 5 must carry the rule
  over, and any bulk "market 404 → /markets" sweep must not swallow the live
  destination.
- **Confirm-page phone — BY DESIGN, do not "fix".** `components/ConfirmShell.tsx`
  labels the call box "Call {firstName} directly" and serves `(844) 944-2629` for
  every market. That is a DELIBERATE tracked line, not a missed personalisation:
  `hsm.hsm.phone`/`phoneRaw` carry the HSM's real direct number from the operator
  API and are intentionally unused here. Wiring the box to `phoneRaw` would
  silently drop call attribution across all markets.
- **Calendly event slugs — RESOLVED, do not re-file.** A previous flag here
  claimed Joshua Collins' "General Meeting" was an outlier against a
  "Call with Curbio Project Manager" standard. It had it backwards:
  `ConfirmShell.tsx` builds `<profileUrl>/general-meeting` for EVERY HSM, and
  `general-meeting` resolves on every profile checked (Christine, Bill). That
  slug is the standard. A new HSM's Calendly event must use it — the fix for a
  mismatch is renaming the event, never a per-HSM slug override.
- **CRM webhook** — set `CURBIO_CRM_WEBHOOK_URL` in Vercel env vars to start
  receiving leads in the CRM. Until then they log server-side only.
