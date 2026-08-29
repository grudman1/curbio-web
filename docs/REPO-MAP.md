# Repo map — `curbio-web`

Read-only survey. Every claim below is from the source files and `git log`
named beside it; where a claim is a count, the count was taken mechanically.

State: `origin/main` at `7f589d1`, 2026-08-29.

Stack: Next.js 15 App Router, React 19, Tailwind (JIT, config-driven tokens),
Upstash Redis, deployed on Vercel pinned to region `cle1` (`vercel.json`).

**Two known duplications are recorded here as deliberate deferrals, not as
defects to fix now** — the font double-load (§4) and the admin token
declarations in the global sheet (§5). Both are blocked on the same thing: the
v2 migration of the screens the ops sheet names as pending — Leads, Markets,
Performance and Channels — plus Attribution, which is in the same position as a
re-export of a hub screen. Each section states exactly what breaks if the
duplication is collapsed before that migration lands.

---

## 1. Route inventory

The root layout `app/layout.tsx` wraps **every** route. Group layouts nest
under it. Three groups exist at the top of `app/`: `(campaigns)`, `(site)`,
`api`.

### Group `(campaigns)` — layout `app/(campaigns)/layout.tsx`

An explicit pass-through; campaign chrome is rendered inside the page
components (`PageShell` → `LpSections.Header`).

| Path | Public/gated | Layouts | Renders |
|---|---|---|---|
| `/lp/[campaign]` | Public | root → `(campaigns)` | The campaign landing page. One route, N configs; `config/campaigns/index.ts` registers exactly one (`sell`), so `/lp/sell` is the only instance. Fully prerendered. |
| `/lp/[campaign]/m/[market]` | Public | root → `(campaigns)` | Per-market prerendered twin, `revalidate = 120`, `dynamicParams = false`. Picker-enabled campaigns × the 8 markets in `config/markets.ts`. Rewrite target for `?market=`. |
| `/lp/[campaign]/confirm` | Public | root → `(campaigns)` | Post-submit Calendly confirmation. Dynamic — reads the `curbio_confirm_prefill` cookie and the Host header. |
| `/lp/[campaign]/v/[variant]` | Public | root → `(campaigns)` | **Unreachable by routing.** A/B edge twin; middleware only rewrites here when `ACTIVE_EXPERIMENT.surface === "edge"`, and `lib/ctaVariant.ts:74` sets `"client"`. Resolves if typed directly. |
| `/lp/[campaign]/v/[variant]/m/[market]` | Public | root → `(campaigns)` | Same, per-market. Same unreachability. |

Related, not a route: `CTA_COPY.control` and `CTA_COPY.treatment`
(`lib/ctaVariant.ts:51-54`) are the identical string, so the one registered
experiment is not currently testing anything.

### Group `(site)` — layout `app/(site)/layout.tsx`

Also a pass-through. Under it: the nested `(chrome)` group, `/exp`, `/admin`.
(`/marketing` no longer exists as a tree — see §2.)

#### `(site)/(chrome)` — layout `app/(site)/(chrome)/layout.tsx`

Mounts `components/site/SiteHeader`, `SiteFooter`, imports
`components/site/site.css`. A nested group rather than the `(site)` layout
itself so `/exp` and `/admin` can be siblings without site chrome.

| Path | Public/gated | Layouts | Renders | Status |
|---|---|---|---|---|
| `/` | Public | root → `(site)` → `(chrome)` | Placeholder homepage plus a QA-links list to the campaign tier. Noindex. | **Stub** — real homepage is `/home-preview` |
| `/home-preview` | Public but unlinked | root → `(site)` → `(chrome)` | The approved Aug-2026 homepage design. `unlisted: true` keeps it out of the QA list; noindex; 404s on `sell.curbio.com` via the campaign allowlist. | Built, not promoted |
| `/how-it-works` | Public | root → `(site)` → `(chrome)` | Ticker, five-step sticky rail, scope picker, before/after, FAQs, pay-at-closing. | **Stub** — real copy, `NEEDS FACT` markers |
| `/services` | Public | root → `(site)` → `(chrome)` | Ten services grouped by category from `config/services.ts`. Anchors, not routes. | **Stub** |
| `/brokers` | Public | root → `(site)` → `(chrome)` | Brokerage-leadership pitch; primary CTA `/contact?topic=brokerage`. | **Stub** |
| `/contact` | Public | root → `(site)` → `(chrome)` | Contact form → `/api/lead` with `source: "contact"`, plus a market/manager rail. | **Stub** |
| `/markets` | Public | root → `(site)` → `(chrome)` | Market index from `MARKETS`. Calls `assertMarketListIsCoherent()` at build time. | Live |
| `/markets/[slug]` | Public | root → `(site)` → `(chrome)` | One data-driven template, `dynamicParams = false`, 8 prerendered slugs. | **Stub** (all 8) |

#### `(site)` — no chrome

| Path | Public/gated | Layouts | Renders |
|---|---|---|---|
| `/exp` | Public | root → `(site)` | Partner tier (eXp). Campaign template, own co-branded `ExpShell` header. Indexable at cutover. |
| `/exp/m/[market]` | Public | root → `(site)` | Per-market twins, `revalidate = 120`, `dynamicParams = false`, canonical → `/exp`. |

#### `(site)/admin` — gated

Middleware session gate (§4). `/admin/login` and `/admin/signup` are viewable
without a session; everything else redirects to `/admin/login`.

| Path | Public/gated | Layouts | Renders |
|---|---|---|---|
| `/admin/login` | Public, noindex | root → `(site)` | Sign-in. `force-dynamic`. Bounces a signed-in visitor to `/admin`. **Outside `OpsShell`** — see §4. |
| `/admin/signup` | Public, noindex | root → `(site)` | Access request, `@curbio.com` only (`config/adminAccess.ts`). **Outside `OpsShell`.** |
| `/admin` | Gated | + `admin/(dashboard)` | Control Room Home: pace vs. Qualified target, channel rollup, alert banner, Ask assistant. |
| `/admin/leads` | Gated | + `(dashboard)` | Lead feed from Redis `leads:v1`, PII masked by role, delivery state, waitlist panel. |
| `/admin/waitlist` | Gated | + `(dashboard)` | Out-of-area signups (never posted to CRM), by state. |
| `/admin/experiments` | Gated | + `(dashboard)` | A/B results from stored lead `variant`. |
| `/admin/pages` | Gated | + `(dashboard)` | Page registry with live previews, per-page views/leads/conversion. |
| `/admin/design-system` | Gated | + `(dashboard)` | Token reference from `config/designTokens.ts`. `/design-system` 301s here. |
| `/admin/settings` | Gated | + `(dashboard)` | Spend entry, UTM builder, sync health — owned here. |
| `/admin/markets` | Gated | + `(dashboard)` | Per-market trajectory, pace, notes — owned here. |
| `/admin/attribution` | Gated | + `(dashboard)` | Attribution health + Measured/Inferred filter — owned here. |
| `/admin/performance` | Gated | + `(dashboard)` | Channel × market grid — owned here. Renamed from Funnel. |
| `/admin/site/links` | Gated | + `(dashboard)` | Tracked-link registry — owned here. |
| `/admin/site/forms` | Gated | + `(dashboard)` | Forms registry cards from `config/formRegistry.ts`. |
| `/admin/site/forms/[slug]` | Gated | + `(dashboard)` | One form's submission table. `notFound()` on unknown slug. |
| `/admin/channels/[slug]` | Gated | + `(dashboard)` | Channel brief. `generateStaticParams` = `CHANNEL_PLAN` minus `partnerships`/`email` → `paid`, `organic`, `events`, `content`. `notFound()` otherwise. |
| `/admin/channels/email` | Gated | + `channels/email/layout.tsx` | Email overview + list-health table. |
| `/admin/channels/email/database` | Gated | + email layout | `ContactsScreen` from the hub, heading overridden to "Database". |
| `/admin/channels/partnerships` | Gated | + `channels/partnerships/layout.tsx` | Partnerships overview. |
| `/admin/channels/partnerships/call-plan` | Gated | + partnerships layout | Brokerage call plan, editable — owned here. |
| `/admin/channels/partnerships/outreach` | Gated | + partnerships layout | Per-HSM outreach cadence — owned here. |

`app/(site)/admin/(dashboard)/loading.tsx` gives every screen in that group a
skeleton.

Handled in middleware, so not routes: `/design-system`, every `/marketing/*`
and `/admin/marketing/*` (301 to the /admin home of each retired hub screen —
the exec share redirect preserves its token segment), 
`/admin/attribution/{links,forms,contacts}`, `/admin/funnel`.

#### The exec share and review — the one token-gated entry

| Path | Public/gated | Layouts | Renders |
|---|---|---|---|
| `/admin/executive` | Gated | + `(dashboard)` | Operator view of the exec review; agenda editable. |
| `/admin/executive/[token]` | **Token-gated, no session** | root → `(site)` → `admin/(share)` | Read-only exec review for projection. See §7. |

`admin/_ui/notes/` has `actions.ts` and `NotesPanel.tsx` but no `page.tsx` —
the panel is embedded in screens (Markets), not routed.

`app/sitemap.ts` derives from `config/routes.ts` and currently emits **zero**
entries — every route has `indexed: false`.

---

## 2. Where `app/(site)/marketing/` went

**Deleted — the codebase is two trees now.** Public (`(chrome)`, `(campaigns)`,
the partner pages) and Admin (`app/(site)/admin/`, everything internal). The
hub was an internal marketing-operations control room whose name suggested it
was public; once the 2026-08 v2 rollout moved its screen implementations into
admin, what remained was consolidated and the tree removed.

**History, for archaeology.**

- `app/(site)/admin/` first appears `c0df4fa`, **2026-07-28** (#20).
- The hub was first built *inside* admin as `app/(site)/admin/(dashboard)/marketing/` in `a81a921`, **2026-08-14** (#56).
- It moved to top-level `app/(site)/marketing/` in `585d3d4`, **2026-08-17** (#59).
- It was consolidated back into `/admin` in the two-tree pass, **2026-08-29**.

**Where its pieces live now.** Shared modules → `admin/_ui/` (`timeframe` was
already there; `pacing`, `hubUi`, `notes/`, `ArchivedNote`, `opsActionUtils`
joined it). Screens → their admin consumers: call plan and outreach under
`channels/partnerships/`, contacts under `channels/email/database/`, the event
log under `channels/_events/`, spend actions under `settings/`, the exec
review at `(dashboard)/executive/` with the tokened share at
`(share)/executive/[token]`. The hub's own chrome (sidebar, landing, charts)
was superseded by the ops shell and deleted.

**Old URLs.** Middleware 301s every `/marketing/*` (and the older
`/admin/marketing/*`) to the /admin home of its screen — the map lives in
`middleware.ts` (`HUB_TO_ADMIN`). The exec share redirect preserves the token
segment, because those links are held by people outside this codebase and must
keep working indefinitely.

**Linked from any public surface? No**, unchanged: `config/navigation.ts` and
the sitemap carry no internal hrefs, and every gated response gets
`X-Robots-Tag: noindex, nofollow`.


## 3. The admin/public boundary

### admin → public trees

**None.** No file under `app/(site)/admin/` imports
from `@/components/*`, `(chrome)`, `(campaigns)`, or `exp`.

### public/shared → admin or marketing

Three, all into utility modules rather than UI:

| Importing file | Imported file | What |
|---|---|---|
| `config/adminNav.ts:29` | `admin/_ui/timeframe` | `type Grain` — type-only, into a config only admin consumes |
| `app/api/admin/page-stats/route.ts:5` | `admin/_ui/timeframe` | `bucketFor`, `dayRange`, `monthsFor`, `parseTimeframe` |
| `app/api/admin/ask/tools.ts:36` | `marketing/(hub)/pacing` | `paceRead` |

Both API files live under `app/api/admin/` and gate themselves, so no
public-facing page pulls admin code.

### admin ↔ marketing (both gated) — heavily crossed both ways

**admin → marketing (12 files).** Nine are one-line route re-exports:
`settings`, `markets`, `attribution`, `performance` (← `report`), `site/links`
(← `links`), `channels/partnerships/call-plan` (← `partners`),
`channels/partnerships/outreach` (← `outreach`), `channels/email/database`
(← `contacts/ContactsScreen`), `channels/[slug]` (← `events/EventLogPanel`).
Plus `(dashboard)/page.tsx`, `_ui/PaceRail.tsx` and `app/api/admin/ask/tools.ts`
importing `(hub)/pacing`.

**marketing → admin (24 files).** The hub renders entirely on admin's `_ui`
library and the older `(dashboard)/ui.tsx` constants — `AppShell`, `Button`,
`DataTable`, `Disclosure`, `Drawer`, `Field`, `InfoPopover`, `InlineCell`,
`Logged`, `primitives`, `SegmentedControl`, `Skeleton`, `StatCard`, `Toast`,
`tone`, `EmptyLog`, `UndocumentedCampaignsBanner`; and `SCAN`, `MUTED`,
`SUBTLE`, `FAIL`, `WARN`, `Meta`, `Panel`, `eyebrow` from `(dashboard)/ui.tsx`.

The two trees are one application by import graph; the directory split is a URL
and history artifact, not a module boundary. **This is the coupling that blocks
§5** — see there.

### Imported by *both* the public tree and admin

Only two modules directly: `config/markets.ts` and `lib/channels.ts`. Two more
transitively — `config/routes.ts` and `config/campaigns/` + `navigation.ts`
reach admin through `config/pageRegistry.ts`. `lib/adminSession.ts` and
`lib/ctaVariant.ts` are additionally imported by `middleware.ts` by relative
path, which runs for both trees.

---

## 4. Global surface

### `app/layout.tsx` — every route, gated or not

- **Fonts**: `next/font/google` — Lora 600 → `--font-serif`; Libre Franklin 400/600/700/800 → `--font-sans`. Both variable classes on `<html>`.
- **Metadata**: `metadataBase = SITE_ORIGIN` (`https://curbio.com`), default title/description/OG, favicons. **Viewport**: `maximumScale: 5`.
- **Head**: CookieYes (prod + ID only), preconnect/dns-prefetch for CookieYes / `app.curbio.com` / Calendly, preload of `/logo/curbio-white.svg`.
- **Body**: `<Analytics />`, `<SpeedInsights />`, GA4 loader (prod + ID, `lazyOnload`), `<ClarityLoader />` and `<PostHogProvider />` (both consent-gated), `<ScrollDepth />`.
- **CSS**: `./globals.css` then `./tokens.css`.

Worth stating plainly: Vercel Analytics, Speed Insights, GA4, Clarity, PostHog,
CookieYes and scroll-depth all mount on `/admin` too — there is
no branch on route.

### The font double-load — deliberate, deferred

Both Lora and Libre Franklin load twice on `/admin` pages: the Google cuts from
the root layout, and self-hosted variable TTFs from
`app/(site)/admin/_ui/v2/fonts.ts` (Lora 212KB, Libre Franklin 187KB, Italic
206KB — 605KB raw; `next/font/local` does no subsetting).

**They are not the same variables.** Google binds `--font-serif` /
`--font-sans`. Self-hosted binds `--ops-font-serif` / `--ops-font-sans`, applied
via `opsFontVars` on exactly one element — the `OpsShell` root
(`_ui/v2/OpsShell.tsx:55`). Neither name is an alias of the other.

**The Google-bound names are used 137 times inside the admin tree**, so this is
not a redundant download that can simply be scoped away:

- **114** Tailwind `font-sans` / `font-serif` classes. `tailwind.config.ts:173-174` binds those utilities to `var(--font-serif)` / `var(--font-sans)` deliberately, with a comment explaining it points at the primitives so emitted CSS stays byte-identical to production.
- **23** direct `var(--font-sans)` / `var(--font-serif)` / `var(--font-family-*)` references.
- **`/admin/login` and `/admin/signup` render entirely outside `OpsShell`** — they are siblings of `(dashboard)`, so no `.ops` exists on those pages at all. They account for most of those 23 direct references.
- Bare `<h1>/<h2>/<h3>` in **13** admin files render in **Google Lora**: `_ui/v2/tokens.css` declares no heading selectors, so the global `h1, h2, h3 { font-family: var(--font-serif) }` in `globals.css:132` wins at specificity 0,0,1 over inherited `.ops { font-family: var(--ops-font) }`. Includes `(dashboard)/ui.tsx:71` and `:164`, `_ui/v2/OpsCard.tsx:46`, `_ui/v2/ChannelsTable.tsx:91`, `design-system/page.tsx:32,108`.

`.ops` covers the body font for most of the dashboard; headings, both auth
pages, and every `font-sans` utility still resolve to Google.

**Consequences of collapsing it, either direction:**

- *Remove the Google load.* Breaks the entire public site — 45 rules in `globals.css` and 109 in `site.css` depend on `--font-*`. Plus the 137 admin usages above, and the exec-share layout renders on the public families by design.
- *Promote the self-hosted files to global.* Ships 605KB of unsubsetted TTF on every campaign landing page, against Google's subset woff2 — unacceptable for the tier the TTFB architecture exists for.
- *Scope the Google load off `/admin` only.* Would require adding heading selectors to the ops sheet, rewriting 114 utility classes, and giving login/signup their own font wrapper — which also puts the two auth pages on a different typeface stack from the site they belong to.

**Deferred.** The duplicate costs `/admin` only, and both sets are genuinely in
use there. Revisit when the pending screens migrate to v2 and the ops sheet owns
its own headings.

### `app/globals.css` (453 lines)

Global. `@tailwind` directives; the `:root` primitive palette
(navy/amber/teal/stone/sage/cloud) plus an app-primitive block — `--slate-*`,
`--green-*`, `--red-*`, `--blue-*`, `--scrim`, `--shadow-app-*` — added for
`/admin`; `--font-mono`; shadow/easing/duration primitives; `--z-sticky`;
`html`/`body` base rules; the global `h1,h2,h3` serif rule; the amber-emphasis
rule; a global amber `:focus-visible` shadow; `::selection`; a global
`prefers-reduced-motion` override; keyframes for both the marketing pages and
the admin shell; then the legacy `.lp-*` layer.

### `app/tokens.css` (247 lines)

Semantic layer, all `var()`s onto the primitives, all on bare `:root`. Brand,
surfaces, text, borders, state, type scale, spacing, radii, elevation, motion,
layout, z-index; then the `/admin`-scoped-by-convention blocks — see §5.

### `tailwind.config.ts` (289 lines)

`content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"]` — `config/**`
deliberately excluded. Every theme value is a `var()`. Colour namespaces:
semantic (`brand`, `accent`, `surface`, `content`, `edge`, `state`), admin
(`tone`, `app`, `nav3`, `pill`, `ui2`), legacy primitives (`navy`, `amber`,
`teal`, `sage`, `stone`, `cloud`).

### `middleware.ts`

**Matcher, verbatim:**

```
matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"]
```

**Covers** every path not starting with `api`, `_next/static`, `_next/image`,
`favicon.ico`, and not ending in a file extension: `/`, all campaign paths, all
site pages, `/exp*`, `/admin*` (old `/marketing*` URLs are 301s, rule 1b).

**Skips** everything under `/api/*` (so no API route is session-gated by
middleware — §7), Next's static and image pipelines, `favicon.ico`, and any path
whose last segment contains a dot — which is how everything under `public/` is
excluded.

**Order:**

1. `/design-system*` → 301 `/admin/design-system*`.
2. `/admin/marketing/*` → 301 `/marketing/*` (`monthly` → `executive`).
3. Executive share-token bypass — §7.
4. Five nav-move 301s: `/admin/attribution/{links,forms,contacts}`, `/admin/executive` → `/admin`, `/admin/funnel` → `/admin/performance`.
5. **Auth gate** for `/admin` and `/admin/*` (old `/marketing*` never reaches it — 1b redirects first). Requires `ADMIN_SESSION_SECRET`, `UPSTASH_REDIS_REST_KV_REST_API_URL`, `..._READ_ONLY_TOKEN` — any missing → 404, fail closed. Verifies cookie HMAC + idle expiry, then confirms `admin:session:<sid>` exists in Redis on the **read-only** token; Redis failure fails closed. `/admin/login`, `/admin/signup`, and a token-matching `/admin/executive/<token>` (rule 1c, constant-time) exempt. Adds `X-Robots-Tag`. Sliding reissue under half the idle window.
6. **Campaign-host allowlist** for `sell.curbio.com` (and, in production, any host not in `SITE_HOSTS`): only `/`, `/m/*`, `/confirm*`, `/exp*`, `/lp/*`. Everything else 404s unless the request carries a valid admin session (QA pass-through).
7. Legacy `/markets/<old-slug>` → 301 from `LEGACY_SLUG_REDIRECTS`.
8. `?market=<slug>` → rewrite to the prerendered per-market path; the only rewrite allowed to drop the query string.
9. A/B edge rewrite — only when `ACTIVE_EXPERIMENT.surface === "edge"`, which it is not.
10. Sets `curbio_vid` (1 year, `sameSite: lax`, not httpOnly) on first visit, generating the id *before* bucketing.

---

## 5. Design tokens

### Where they are defined

| Layer | File | Scope | Contents |
|---|---|---|---|
| Primitives | `app/globals.css` `:root` | Global | Brand ramps, `--bg/--fg/--border`, `--error`, the app-primitive block (`--slate-*`, `--green-*`, `--red-*`, `--blue-*`, `--scrim`, `--shadow-app-*`), `--font-mono`, `--shadow-*`, `--ease-out`, `--dur-*`, `--z-sticky` |
| Semantic | `app/tokens.css` `:root` | Global | `--color-*`, `--font-family-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--weight-*`, `--space-*`, `--radius-*`, `--elevation-*`, `--duration-*`/`--easing-*`, `--container-*`, `--z-*`; **then `--ops-*`, `--app-*`, `--tone-*`, `--pill-*`, `--nav3-*`** |
| Utility surface | `tailwind.config.ts` | Global | Maps every token to a class. Nothing literal. |
| Documentation | `config/designTokens.ts` | — | Hand-maintained manifest of `app/tokens.css`; `/admin/design-system` renders from it. Does **not** cover `_ui/v2/tokens.css`. |
| Ops system | `admin/_ui/v2/tokens.css` (694 lines) | `.ops` only | `--ops-gray-25…900`, `--ops-success/error/warning-*`, `--ops-brand*`, `--ops-accent*`, `--ops-ch-*`, `--ops-r-*`, `--ops-shadow-*`, `--ops-text-*`, plus component classes. Imported **only** by `OpsShell.tsx`. |
| Ops fonts | `admin/_ui/v2/fonts.ts` | `.ops` root | Self-hosted variable TTFs → `--ops-font-serif` / `--ops-font-sans` |
| Site CSS | `components/site/site.css` (1858 lines) | `(chrome)` layout | Public-site component classes |
| Hub CSS | `marketing/(hub)/layout.tsx` inline `<style>` | `.mk-*` | Hub shell, consuming `--color-*` / `--font-family-*` |

### Admin-only tokens live in `app/tokens.css`, not `globals.css`

Declaration counts, taken mechanically:

| Family | `app/globals.css` | `app/tokens.css` | `_ui/v2/tokens.css` |
|---|---|---|---|
| `--ops-*` | 0 | 18 | 77 |
| `--app-*` | 0 | 7 | 0 |
| `--tone-*` | 0 | 5 | 0 |
| `--pill-*` | 0 | 10 | 0 |

All 40 are in `app/tokens.css`. `globals.css` holds only the primitives they
reference. Anyone looking for them in `globals.css` will not find them.

### The `.ops`-sheet move is UNBLOCKED — but not done

The historical blocker was `/marketing`: its screens consumed these families
163 times outside `.ops` scope (155 Tailwind utilities + 8 raw `var(--tone-*)`
in `hubUi.tsx`). The two-tree consolidation (2026-08-29) deleted that tree, and
a repo-wide audit confirms **zero** `--app-*`/`--tone-*`/`--pill-*`/`--ops-*`
consumers outside `app/(site)/admin/` now.

What the move still has to handle, which is why it did not happen in the same
pass:

- The Tailwind indirection. `tailwind.config.ts` maps utilities like
  `text-tone-bad` and `bg-app-well` onto these vars; utilities are emitted
  unscoped, so the *definitions* must stay reachable wherever those class
  names render. Everything rendering them is under `/admin` now, but the vars
  must either stay on `:root` or the utilities must be re-pointed.
- `admin/(share)/layout.tsx` and the login/signup pages render OUTSIDE
  `OpsShell`, so a sheet loaded only by `OpsShell` cannot carry anything they
  need. (Verified: the share layout uses only public `--color-*`/`--font-*`
  tokens, and the auth pages use the public families too.)

Moving the four families is now a contained admin-only change instead of a
cross-tree one.

### Who reads what

- **Public site**: primitives via `.lp-*`, semantic tokens via Tailwind and `site.css`, `--font-serif` / `--font-sans`.
- **Marketing Hub**: semantic tokens in `.mk-*` CSS, plus every admin `_ui` component (which read `--app-*`, `--ops-*`, `--pill-*`, `--tone-*`) — all from the global sheet.
- **Admin**: the same tokens for v1 screens, plus the `.ops` scope from `_ui/v2/tokens.css` for the redesigned shell.

### Same value defined twice

1. **Two neutral ramps** — `--slate-25/50/100/200` (globals, via `--app-*`) and `--ops-gray-25…900` (v2). Both are admin greys, both live, on different screens.
2. **Two status ramps** — `--green-700/50`, `--red-700/50` (globals, via `--pill-*`) and `--ops-success/error/warning-*` (v2). Different hex for the same roles.
3. **The same two typefaces loaded twice** — §4.
4. **`--nav3-*` duplicates v2 values by design** — `app/tokens.css` says so outright: "same values as their `ui2-*` counterparts, just reachable where `.ui2` isn't applied". E.g. `--nav3-child-active-bg: #eef1f6` and `--ops-brand-50: #eef1f6`.
5. **Radii and shadows in both** — `--radius-sm/md/lg` vs `--ops-r-sm/md/lg`; `--shadow-app-*` vs `--ops-shadow-*`.

### Dangling references

`tailwind.config.ts` contains **26** references to `--ui2-*` custom properties
(colour namespace `ui2`, font family `ui2`, six `ui2-*` font sizes,
`--ui2-radius-card`, `--ui2-shadow-card`). **No file defines any `--ui2-*`
variable**, and no `ui2-*` utility class is used anywhere in `app/` or
`components/`; the only other mentions are two comments in `app/tokens.css`.
Its comments also point at `admin/_ui/v2/font.ts`, which does not exist — the
file is `fonts.ts`, and it declares `--ops-font-*`, not `--ui2-font`. No deleted
`ui2` token file appears in git history, so whether these were renamed to
`--ops-*` or never landed is not determinable from the repo.

---

## 6. Page types

Structural distinction exists at three levels; the registry status field is a
fourth axis, not the only one.

**1. Route groups and physical prefixes.** `(campaigns)` — landing pages,
physically prefixed `/lp/` (route groups add no URL segment, so only one group
can own `/`; the site owns it and campaigns take a prefix that also marks the
tier). `(site)/(chrome)` — permanent pages with global chrome. `(site)/exp*` —
partner tier at a real path, outside `(chrome)` because it renders its own
co-branded shell. `(site)/admin`, `(site)/marketing` — internal.

**2. Separate layouts.** `(campaigns)`, `(site)`, `(site)/(chrome)`,
`admin/(dashboard)` (`OpsShell`), `marketing/(hub)`, `marketing/(share)`.

**3. Separate registries and config directories.** `config/campaigns/` (one
file per campaign — adding a landing page is a config file, not a route);
`config/routes.ts` (the tier map, with `tier: "campaign" | "partner" | "site"`,
`internalPath`, `cutoverPath`, `indexed`, `canonicalPath`, `unlisted`);
`config/navigation.ts` (site nav/footer only); `config/pageRegistry.ts` (a
*derived* view over all of the above).

**4. The registry status field.** `PageStatus` is `"live" | "stub" | "planned"`;
`PageGroup` is `"campaigns" | "site" | "internal"`. `buildPageRegistry()`
derives every row from `routes.ts`, `campaigns/`, `markets.ts` and
`navigation.ts` — the gap between "linked in the nav" and "exists in the app"
becomes the `planned` rows automatically. It distinguishes *build state*, not
page type.

---

## 7. Data and API

### The executive share route

`/marketing/executive/[token]` is the one gated-tree path reachable without a
session. It renders `<ExecutiveReview editable={false} share />`.

**Aggregates only — no lead-level data.** Its sources are `aggregateSnapshot()`,
`funnelCounts()` over `config/appLeadsSnapshot.json`, and `readExecNotes(month)`.
Nothing reads `leads:v1`, `readRecentLeads`, or `leadStore`. The snapshot's 852
records carry `dealId`, `marketCode`, `date`, `month`, `stage`, `status`,
`referralSource`, `dealType`, `value`, `channel`, `entryPoint`, `attribution`,
`utmCampaign` — verified: no name, email, phone or address key on any record;
identity fields are stripped at the import boundary. What renders is a
per-market scorecard, per-channel rollups and funnel stage counts. The one
free-text surface is the operator-authored agenda (`wins`, `concerns`,
`decisions`).

**Token handling.** One env-configured string — `EXEC_SHARE_TOKEN`, with the
legacy `MARKETING_EXEC_SHARE_TOKEN` honored as a fallback (`lib/execShare.ts`,
the single reader both middleware and the page go through) — read at request
time, so rotation is an env-var change plus a redeploy, no code change. The
route is `/admin/executive/[token]`; old `/marketing/executive/<token>` links
301 with the token preserved. Both comparisons are constant-time: the page
uses `timingSafeEqualStr`, and middleware does too (the edge check runs
*before* the `/admin` gate, so it is the only comparison an unauthenticated
caller can reach; a `===` there would leak a prefix-match oracle and the
page's check would never run for them). Fails closed — env unset means the
bypass does not exist. Caveats: one shared token, no expiry, no per-recipient
issuance, so rotating invalidates every outstanding link at once.

### Routes under `app/api/`

Middleware's matcher excludes `/api` entirely, so **no API route is gated by
middleware**. Gating is per-route.

| Route | Runtime | Gated? | What |
|---|---|---|---|
| `POST /api/lead` | `nodejs` | **Public by design** | The lead form. Writes Redis `leads:v1` + `leads:delivery:v1`, emails via Resend, POSTs the CRM webhook (skipped for `source: "waitlist"`). Header documents four removed anti-abuse mechanisms and the rule that it may never reject a submission it cannot prove is fake. |
| `GET /api/resolve` | `force-dynamic` | **Public by design** | Request-time market resolution (`?market`/`?zip`/`?code`/`?status` + Vercel IP geo) for the prerendered homepage, called client-side after paint. |
| `GET/POST /api/notable-estimate` | — | **Public by design** | Server-side CORS proxy to `api.notablefi.com/framer/curbio`. Three numbers and a state code; no PII, no writes. |
| `GET /api/admin/page-stats` | — | **Gated** — `requireAdminApiSession()` | Per-page views/leads/conversion for `/admin/pages`. |
| `POST /api/admin/ask` | `nodejs`, `maxDuration = 60` | **Gated** — `requireAdminApiSession()` | The Ask assistant. SSE frames, manual tool loop against the Anthropic API, `MAX_TURNS = 8`. |

`lib/adminApiAuth.ts` mirrors the middleware's two checks and names the three
public routes explicitly as not to be "fixed".

Server actions also write: `admin/actions.ts`, `admin/login/actions.ts`,
`admin/signup/actions.ts`, and the hub's `events`, `executive`, `links`,
`notes`, `outreach`, `partners`, `settings` actions.

### Data stores and external services

| Store / service | Read | Write | Credentials |
|---|---|---|---|
| **Upstash Redis** (one database) | Middleware (session existence), all admin/hub reads via `lib/opsStore.ts` + `lib/admin*.ts` | `/api/lead`, admin/hub server actions | `UPSTASH_REDIS_REST_KV_REST_API_URL` + `..._READ_ONLY_TOKEN` for reads and the edge; `..._TOKEN` for writes. Keys: `leads:v1`, `leads:delivery:v1`, `waitlist:leads`, `admin:users`, `admin:user:<email>`, `admin:session:<sid>`, `ops:<object>:v1` + `ops:<object>:audit:v1`, `marketing:links:v1`, `marketing:execnotes:v1`. `lib/opsStore.ts` states the discipline: reads on read-only, writes only from owner-checked actions, no deletes (`archived: true`). |
| **Curbio operator API** (`app.curbio.com`) | Campaign/exp/confirm pages, `lib/resolveMarket.ts` | — | `CURBIO_OPERATOR_API` (defaults to the hardcoded URL); no key |
| **Curbio CRM webhook** | — | `/api/lead` | `CURBIO_CRM_WEBHOOK_URL`, `CURBIO_CRM_API_KEY` |
| **Resend** | — | `/api/lead` | `RESEND_API_KEY`, `RESEND_TO_EMAIL`, `LEAD_NOTIFY_EMAIL`. `app/api/lead/route.ts:306` falls back to the literal `grudman1@gmail.com` when neither is set. |
| **Vercel Web Analytics REST API** | `lib/vercelAnalytics.ts` → `lib/pageStats.ts` → `/admin/pages` | — | `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` |
| **Anthropic API** | `/api/admin/ask` | — | `ANTHROPIC_API_KEY` |
| **Notable** (`api.notablefi.com`) | `/api/notable-estimate` | — | none |
| **PostHog** | — | client, consent-gated | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |
| **GA4 / Clarity / CookieYes** | — | client | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_COOKIEYES_ID` |
| **Committed snapshots** (not services) | admin + hub | offline scripts | `config/appLeadsSnapshot.json` (`asOf` 2026-08-29, 852 deals, refreshed by `scripts/import-app-leads.mjs`), `config/linkRegistrySeed.json`, `config/emailListHealth.ts` (transcribed from `data/imports/mailchimp-audience-summary.csv`), the CSVs under `data/imports/` |

Session signing: `ADMIN_SESSION_SECRET`. Exec share link: `EXEC_SHARE_TOKEN`
(legacy `MARKETING_EXEC_SHARE_TOKEN` honored — `lib/execShare.ts`).

---

## 8. State of completion

### Public site

| Screen | State |
|---|---|
| `/lp/sell` (+ `/m/[market]`, `/confirm`) | **Wired.** Operator API for HSM routing, `/api/lead` → Redis + CRM + Resend. |
| `/exp`, `/exp/m/[market]` | **Wired.** Same template and pipeline. Noindex until cutover. |
| `/` | **Stub.** Placeholder plus QA links. |
| `/home-preview` | **Built, not promoted.** Unlinked, noindexed; becomes `/` only by a deliberate edit to `config/routes.ts`. |
| `/how-it-works`, `/services`, `/brokers`, `/contact` | **Partial.** Built with real copy; all four `stub` in the registry for outstanding `NEEDS FACT` markers. `/contact` posts to the live `/api/lead`. |
| `/markets` | **Wired** to `config/markets.ts`. |
| `/markets/[slug]` (×8) | **Stub.** Template data-driven end to end; content not written. |
| `app/sitemap.ts` | Correct but **empty** — every route is `indexed: false`. |
| `/lp/*/v/[variant]*` | **Built, dormant.** Routed to only when `surface === "edge"`; it is `"client"`. Both CTA variants are the same string. |

### Admin (Control Room)

| Screen | State |
|---|---|
| `/admin` (Home) | **Partial.** Live Redis leads + `mergedSnapshotDeals` + campaign-orphan check; the deal/funnel half reads the one-time snapshot, not a live sync. |
| `/admin/leads` | **Wired** — Redis `leads:v1`, live submissions, delivery state, role-based PII masking. `leads:v1` is capped at 5,000 entries and the reader scans the newest N. |
| `/admin/waitlist` | **Wired** — Redis waitlist entries. |
| `/admin/experiments` | **Wired** to stored lead `variant`, but reporting on an experiment whose variants are identical. |
| `/admin/pages` | **Wired** — Vercel Analytics views + Redis leads, joined in `lib/pageStats.ts`, which refuses a conversion rate when the lead window is truncated. |
| `/admin/site/forms`, `/[slug]` | **Stub.** `config/formRegistry.ts` states no submission counts, delivery status or last-submission dates exist — `/api/intake` is not built. Em-dashes. |
| `/admin/site/links` | **Partial** — see `/marketing/links`. |
| `/admin/channels/email` | **Partial.** List health is a hand-transcribed Mailchimp snapshot; Seattle and Riverside have no audience and render "no audience", never 0%. |
| `/admin/channels/email/database` | **Stub** — the Contacts screen. |
| `/admin/channels/partnerships` + tabs | **Partial** — see `/marketing/partners`, `/marketing/outreach`. |
| `/admin/channels/{paid,organic,events,content}` | **Brief only.** Events is the only channel with a working surface today. |
| `/admin/performance`, `/markets`, `/attribution`, `/settings` | Re-exports of hub screens; state as below. |
| `/admin/design-system` | **Wired** to `config/designTokens.ts` — which documents `app/tokens.css` only, not the v2 sheet. |
| `/admin/login`, `/admin/signup` | **Wired** — accounts in Redis, bcrypt, owner approval. |

### Marketing Hub

`config/marketingHub.ts` carries an explicit `WiringStatus` per surface with a
`needs` list. **No surface is marked `live`.**

| Surface | Status | Missing (abridged) |
|---|---|---|
| `/marketing` (Today) | `partial` | Live app sync (interim: snapshot); Engaged sources; webhook heartbeats |
| `/marketing/report` | `partial` | Live app sync; contact store with first/last touch (first-touch fields empty → em-dash); spend entry for CAC; AC + Instantly webhooks |
| `/marketing/channels` | `partial` | Live app sync (last-touch only); spend entry; AC + Instantly webhooks |
| `/marketing/markets` | `partial` | Live app sync; spend entry per month × market |
| `/marketing/attribution` | `partial` | UTM discipline on links in the wild; call-tracking numbers; first-touch capture |
| `/marketing/links` | `partial` | Click counts for `go.curbio.com` redirects; lead-traffic join beyond the recent-leads window |
| `/marketing/contacts` | `waiting` | Contact store; status field; Instantly webhook |
| `/marketing/forms` | `waiting` | `/api/intake`; form-type registry; asset-delivery events |
| `/marketing/partners` | `partial` | Partner-page inquiry events from `/api/intake` — agents reached and meetings typed in until then |
| `/marketing/outreach` | `waiting` | Mailing log; meeting-booked events; spend entry for card cost |
| `/marketing/events` | `waiting` | Event log store; `event_rsvp` from `/api/intake`; call-tracking per event; spend per event |
| `/marketing/executive` | `partial` | Live app sync; Engaged sources; event and outreach logs |
| `/marketing/settings` | `partial` | Spend store; webhook health checks; app-sync heartbeat |

Sync surfaces (`SYNC_SURFACES`, on Settings): **App sync** `partial` (one-time
snapshot, not a live sync); **ActiveCampaign** `waiting`; **Instantly**
`waiting`; **`/api/intake`** `waiting`.

`/api/intake` does not exist in `app/api/` and is named as a blocker by six
surfaces.

---

## Ambiguities

1. **`--ui2-*` tokens.** 26 references in `tailwind.config.ts`, no definition anywhere, no consuming class, no deleted file in git history. Renamed to `--ops-*` or never landed — not determinable from the repo.
2. **`admin/_ui/v2/font.ts`**, referenced twice in `tailwind.config.ts` comments, does not exist. The file is `fonts.ts`, declaring `--ops-font-*`.
3. **"Magnificent Seven" channels.** `config/channelPlan.ts` defines six slugs; comments in `channels/[slug]/page.tsx` say "Magnificent Seven" and `config/adminNav.ts` says "the six". Which count is intended is unresolved.
4. **Duplicate screens.** Nine `/admin/*` routes re-export `/marketing/(hub)/*` implementations; both URLs are reachable and linked from their own navs. Whether the hub's own sidebar survives the migration is not stated anywhere in the repo.
5. **Analytics on gated pages.** GA4, Clarity, PostHog, Vercel Analytics and CookieYes mount in the root layout with no route branch, so they run on `/admin` and `/marketing`. No comment says whether that is intended.
6. **`grudman1@gmail.com` fallback** at `app/api/lead/route.ts:306` — a personal address as last-resort lead recipient. Whether that is deliberate for production is not determinable from the code.
