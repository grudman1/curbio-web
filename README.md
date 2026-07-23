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

1. Add an entry to `CAMPAIGN_MARKETS` in `lib/campaignMarkets.ts`.
2. Add a slug alias in `getCampaignMarket()` if the old `lib/markets.ts` slugs differ.
3. Drop HSM headshots in `public/hsm/` and sold photos in `public/sold/`.
4. Add a catalog entry to `BY_MARKET_NAME` in `lib/markets.ts` to show the market
   in the ZipModal chooser grid.

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

- **Acworth $497,000** — marked `unverified: true` in `campaignMarkets.ts`.
  Confirm this is a verified sale price before a real send.
- **Joshua Collins' Calendly** event is named "General Meeting" — other HSMs use
  "Call with Curbio Project Manager." Rename in Calendly admin for consistency.
- **CRM webhook** — set `CURBIO_CRM_WEBHOOK_URL` in Vercel env vars to start
  receiving leads in the CRM. Until then they log server-side only.
