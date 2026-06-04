# Curbio — Pre-listing landing page

A personalized lead-capture landing page for Curbio (pre-listing home improvement).
The page greets each visitor with their **local Home Services Manager** — name, photo,
bio, and phone — and routes leads to the right market.

Built with **Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS**.

## How market personalization works

The visitor's market + HSM is resolved **server-side** on every request, in priority order:

1. `?market=<slug>` — campaign / email links (e.g. `?market=baltimore`)
2. `?zip=` / `?code=` — an explicit ZIP the visitor entered
3. **Vercel IP geolocation** — the `x-vercel-ip-postal-code` header (production only)
4. Neutral **"choose your market"** state — never a wrong HSM during detection

Each ZIP is resolved against Curbio's live operator API
(`app.curbio.com/api/Operator/GetOperatorLead`) for the authoritative market, HSM, phone,
Calendly, and business-hours status. Calls fail closed to the neutral state, so the page
never errors if the API is slow or unreachable. See `lib/operator.ts`, `lib/resolveMarket.ts`,
and `lib/markets.ts`.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

Try `/?market=baltimore`, `/?zip=75201`, or `/` for the neutral chooser.
(IP geolocation only works on Vercel, not localhost.)

```bash
npm run build        # production build
npm run lint         # eslint
```

**Requires Node 22.x** (pinned via `.nvmrc` and `package.json#engines`). With nvm: `nvm use`.

## Environment variables

All optional — the app builds and runs without them. Copy `.env.example` to `.env.local`:

| Variable | Purpose |
|---|---|
| `CURBIO_CRM_WEBHOOK_URL` | Where `/api/lead` POSTs captured leads. Until set, leads are logged server-side. |
| `CURBIO_CRM_API_KEY` | Optional `Authorization: Bearer` token for the CRM webhook. |
| `CURBIO_OPERATOR_API` | Override for the operator API endpoint (defaults to the Curbio production URL). |

## Deployment (Vercel)

Auto-detected as a **Next.js** project — defaults are correct:

- Build Command: `next build` · Output: *(default)* · Install: `npm install` · Node: **22.x**

Pushes to `main` deploy to production; pull requests get preview URLs. Add the environment
variables above in **Project → Settings → Environment Variables** when the CRM endpoint is ready.

## Project structure

```
app/            App Router pages, layout, and the /api/lead route
components/      LpSections (nav/hero/proof/closer/footer), LpModals (chooser + quote),
                 LpKit (shared primitives), PageShell (client orchestration)
lib/            markets (catalog + view model), operator (live API), resolveMarket (priority resolution)
public/         logos, HSM headshots, before→after video, lead-magnet downloads
```

## Open items

- Real CRM webhook endpoint (`/api/lead` payload is ready to map)
- HSM bio/headshot for the DC-metro markets (Joshua Collins) — currently a graceful placeholder
- Lead-magnet PDFs in `public/downloads/`
