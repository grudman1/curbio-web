# Repo map

A read-only orientation document for `curbio-web`. Nothing here was changed to
produce it; every claim below was checked against the code or against the live
site, and the checks are named so you can re-run them.

Accurate as of 2026-08-29, against `main` at `37c8294` plus the two open PRs
(#101, #99).

> **A note on the brief.** This was asked for as "the repo map from the earlier
> brief, all eight sections". I could not find that brief — it is not in
> `curbio-claude-code-brief.md` (the local build brief, which covers the
> landing page and has 15 sections of its own), not in any `.md` in the repo,
> and not in any prior session transcript. The eight sections below are
> therefore **my proposal**, not a recovered spec. If the original named
> different sections, point me at it and I will restructure.

---

## 1. What this repo is

One Next.js App Router project on Vercel that serves **three different
audiences from one codebase**, separated by route group rather than by
deployment:

| Audience | Where | Public? |
|---|---|---|
| Lead-generation visitors (agents, sellers) | `app/(campaigns)/` | Yes, noindexed |
| Website visitors | `app/(site)/(chrome)/` | Yes, noindexed until cutover |
| Curbio staff | `app/(site)/admin/`, `app/(site)/marketing/` | **No — session-gated** |

It is also mid-migration: `curbio.com` still runs WordPress, and
`sell.curbio.com` is the only production host until cutover. That single fact
explains most of the apparent oddities in the routing.

**Scale:** 8 public site pages · 5 campaign page shapes · 21 admin screens ·
14 marketing-hub screens · 5 API routes · 15 config modules · 32 lib modules.

---

## 2. `app/(site)/marketing/` — what it is and whether it is reachable

**It is the Marketing Hub: an internal, staff-only operations console. It is
not marketing pages, and it is not public.**

The name is the trap. Everything under `app/(site)/(chrome)/` is the public
marketing *website*. Everything under `app/(site)/marketing/` is the internal
*hub for the marketing team* — a second control room beside `/admin`, with
14 screens:

```
/marketing                 the hub root
/marketing/report          the channel × market report
/marketing/executive       the executive summary
/marketing/attribution     attribution health
/marketing/channels        per-channel views
/marketing/markets         per-market views
/marketing/contacts        the contact database
/marketing/forms           forms inventory
/marketing/links           tracked-link registry
/marketing/partners        partner pipeline
/marketing/outreach        the HSM mail-then-call loop
/marketing/events          event log
/marketing/notes           working notes
/marketing/settings        wiring health
```

### Is it publicly reachable? No.

Three independent checks, all agreeing:

**1. The middleware gates it identically to `/admin`.** `middleware.ts` treats
both prefixes in one branch:

```ts
if (pathname === "/admin"    || pathname.startsWith("/admin/") ||
    pathname === "/marketing" || pathname.startsWith("/marketing/")) {
  if (!adminEnvReady()) return notFoundResponse();   // fails closed
  const session = await validSession(req);
  if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
}
```

Note `adminEnvReady()`: a missing env var yields **404, never open access**.

**2. Live production responses.** Unauthenticated `GET` against
`sell.curbio.com`:

| Path | Response |
|---|---|
| `/marketing` | `307 → /admin/login` |
| `/marketing/report` | `307 → /admin/login` |
| `/marketing/executive` | `307 → /admin/login` |
| `/admin` | `307 → /admin/login` |

**3. Every gated response carries `X-Robots-Tag: noindex, nofollow`**, so it
cannot be indexed even if a URL leaked.

### The one deliberate exception, and it is currently inert

`app/(site)/marketing/(share)/executive/[token]/` is a **read-only executive
summary reachable without a login**, for sharing with someone who has no admin
account. It is gated by a single env-configured secret path:

```ts
const shareToken = process.env.MARKETING_EXEC_SHARE_TOKEN;
if (shareToken && pathname === `/marketing/executive/${shareToken}`) { … }
```

Two properties worth knowing:

- **It fails closed.** With the env var unset, the condition can never match —
  there is no bypass at all, not even a guessable one.
- **`MARKETING_EXEC_SHARE_TOKEN` is not set in the Vercel project today**
  (verified via `vercel env ls production`; zero matches). **So no public
  share URL currently exists.** If you ever set it, you are creating a live,
  unauthenticated, permanent URL exposing company performance data — treat the
  value as a password, and note the page still re-validates the token itself
  rather than trusting the middleware alone.

---

## 3. Routing and the three public tiers

`config/routes.ts` is the tier table; `middleware.ts` enforces it.

| Tier | Paths | Indexed | Lifespan |
|---|---|---|---|
| **Campaign** | `/` , `/m/:market`, `/confirm`, `/lp/:campaign/*` | Never | Disposable |
| **Partner** | `/exp`, `/exp/m/:market` | `false` — flips at cutover | Long-lived |
| **Site** | `/markets`, `/markets/:slug`, `/how-it-works`, `/services`, `/brokers`, `/contact`, `/home-preview` | `false` — flips at cutover | Permanent |

Everything is `indexed: false` today because `curbio.com` is still WordPress
and `sell.curbio.com` is the only live host. Flipping a tier to `indexed: true`
also updates the canonical automatically — one switch, not two.

### The campaign-host allowlist

`sell.curbio.com` serves **only** explicitly allowlisted paths (`/`, `/m/*`,
`/confirm`, `/exp`, `/lp/*`). Everything else 404s — *unless* the request
carries a valid admin session, which passes through unchanged. That is what
lets staff QA site-tier pages in production while the public sees nothing.

This exists because of a real leak: the host previously used a rewrite list
that let everything else fall through, publicly serving `/markets/*` and
`/design-system` with no auth.

### Middleware execution order (six jobs, order is load-bearing)

1. Internal-surface redirects (`/design-system` → `/admin/design-system`)
2. The `/admin` **and** `/marketing` session gate
3. Campaign-host allowlist
4. Legacy `/markets/<old-slug>` 301s
5. Campaign-link rewrite + the stable `curbio_vid` A/B cookie
6. Optional A/B edge path

**The matcher excludes `/api`** — see §6.

---

## 4. Configuration is the source of truth

`config/` is where facts live, and the codebase is deliberately structured so
adding a thing is a row in a file, not a branch in code.

| Module | Owns |
|---|---|
| `markets.ts` | **The only place a market is named.** 8 markets. Five name fields per market because three systems name markets differently (public slug, operator API key, CRM name). Adding a market is one row. |
| `routes.ts` | The tier table, hosts, indexability |
| `pageRegistry.ts` | Every page, its status (`live`/`stub`/`planned`) and indexability. The `planned` rows self-maintain from `navigation.ts` — anything the nav links to but the app doesn't implement appears automatically as backlog. |
| `channelPlan.ts` | The Magnificent Seven **planning** taxonomy — tier, owner, budget, target |
| `marketingHub.ts` | Targets, funnel stages, form types, wiring status |
| `appLeadsSnapshot.ts/.json` | The interim Qualified data source (see §5) |
| `linkRegistry.ts` | Tracked links, imported from the WordPress redirect export |
| `formRegistry.ts`, `campaigns/`, `designTokens.ts`, `navigation.ts`, `services.ts`, `scopeRanges.ts` | as named |

**The standing rule:** no per-market special cases anywhere. Any
`if (slug === "…")` is a bug against `config/markets.ts`.

### Two taxonomies that must never be collapsed

- `config/channelPlan.ts` — the **planning** channels (the CEO's seven motions)
- `lib/channels.ts` — the **measurement** channels, a closed nine-value list a
  lead can actually be tagged with

They do not map 1:1. Paid explodes into three measured channels; Events maps to
none (attributed by campaign code); Content maps to none (it is an input).
A compile-time guard in `channelPlan.ts` asserts every claimed measured channel
really exists in the closed list.

> **Known drift:** Attribution spec v3.2 (26 Aug) adds a **tenth** value,
> `event`. `lib/channels.ts` still has nine, so an `event` UTM currently
> derives to `direct` — the exact failure the closed list exists to prevent.

---

## 5. Data — what is real, what is a snapshot, what does not exist

This is the section to read before trusting any number on any screen.

| Source | Backing | Status |
|---|---|---|
| **Qualified leads / funnel / revenue** | `config/appLeadsSnapshot.json` | **A one-time PII-stripped export of app.curbio.com, not a live sync.** Accurate through its `asOf` date and drifting after. Every surface labels it. |
| **Leads (individual)** | Upstash Redis `leads:v1`, `leads:delivery:v1` | Live |
| **Sessions / accounts** | Redis `admin:session:*`, `admin:users` | Live |
| **Tracked links** | Redis `marketing:links:v1` + `config/linkRegistry.ts` seed | Live |
| **Exec notes** | Redis `marketing:execnotes:v1` | Live |
| **Waitlist** | Redis `waitlist:leads` | Live |
| **Ops records** | Redis via `lib/opsStore.ts` (`spend`, `outreach`) | Partially built |
| **Page traffic** | Vercel Analytics API | Live, rate-limited |
| **Spend / CAC** | — | **Does not exist.** No spend store, so CAC is null everywhere and Blended CAC renders as an em-dash. |
| **GA4** | — | **Not wired.** Account owner unknown. |
| **Email events** | ActiveCampaign / Instantly | **Not wired.** Both `waiting`. |
| **Form submissions** | `/api/intake` | **Not built.** All 8 non-estimate form types are uncounted. |

**Read-only credential discipline:** pages that render use the Upstash
**read-only** token (`lib/adminLeads.ts`, `marketingLinksStore.ts`). Writes use
the read-write token and happen only inside session-checked server actions. The
edge verifies sessions with the read-only token so it can never mint one.

**External services:** `app.curbio.com` (operator API — ZIP→HSM lookup and the
CRM lead endpoint), `api.vercel.com` (analytics), `api.notablefi.com` (partner
financing estimator), `us.i.posthog.com` (product analytics).

---

## 6. API routes — and the gate that does not cover them

**`middleware.ts`'s matcher excludes `/api`:**

```
"/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"
```

So the `/admin` session gate **does not protect route handlers**. Each one is
responsible for itself.

| Route | Auth | Notes |
|---|---|---|
| `/api/lead` | **Public by design** | The lead form. Its header is explicit: it may not reject a submission it cannot prove is fake. Four anti-abuse mechanisms were removed after each ate real leads. |
| `/api/resolve` | **Public by design** | Request-time market resolution for the prerendered homepage, called client-side after paint. |
| `/api/notable-estimate` | **Public by design** | Server-side CORS proxy to Notable. Three numbers and a state code; no PII, no writes. |
| `/api/admin/page-stats` | Gated *(PR #101/#99)* | **Was publicly readable** — it claimed middleware protection in a comment it never had. |
| `/api/admin/ask` | Gated | The assistant. |

Both admin routes use `requireAdminApiSession()` from `lib/adminApiAuth.ts`,
which verifies the cookie HMAC **and** re-checks the Redis session record — so
logout is a real revocation, not just an expiring signature.

**Rule for new routes:** anything under `app/api/admin/` must gate itself, and
must never be cacheable (no `revalidate`, no `s-maxage`) — cache the upstream
data instead, where it is shared and user-agnostic.

---

## 7. Auth and sessions

Cookie format: `<sid>.<expiryMs>.<hmacSha256Hex(sid.expiryMs)>`

`lib/adminSession.ts` is **edge-safe by construction** — Web Crypto only, no
Node imports — so the edge middleware and the Node login action share one
implementation and cannot disagree about the format.

Two layers, deliberately:

- **The cookie** carries the idle window (400 days, the RFC 6265bis / Chrome
  ceiling; a larger Max-Age is silently clamped). It slides — reissued once
  more than a day old.
- **The Redis record** carries revocation. Deleting `admin:session:<sid>` kills
  every copy of that cookie at once. This is what makes logout real.

The 400-day window is a deliberate, documented trade: an active user
effectively never logs in again, at the cost that a lifted cookie stays valid
while it keeps being used. `httpOnly`, `secure`, `sameSite=strict` still hold.
There is no "sign out everywhere" — `destroySession` only ends the sid it is
handed.

`/admin/login` and `/admin/signup` are viewable without a session and bounce a
signed-in visitor to `/admin`. Login/signup is the one place in this app where
rate limiting is correct (5/15min per IP, 10/hr per account, doubling backoff)
— the opposite call from `/api/lead`, for the opposite reason.

---

## 8. Conventions, and the traps that produced them

Most rules here exist because something broke. They are worth reading as
incident notes.

**Naming.** One string doing five jobs is what produced the market mess — the
Maryland market alone carried seven spellings across six drifted lists. Hence
five explicit name fields in `config/markets.ts`.

**Registries over ad-hoc rendering.** Pages, forms, and links each have a
registry so a screen shows *named rows*, not invented ones. Every new page
gets a `pageRegistry.ts` row as `stub`; only Gavin flips it to `live`.

**Honest empty states.** A metric with no source renders an em-dash and a
hollow status dot — never a zero, never an invented number. "Vercel read
failed" is displayed as *"not zero traffic"*, because a broken read must never
render as an absence of traffic.

**No explanatory prose on data screens.** Legends, axis labels, and column
headers carry the weight. Anything that genuinely needs explaining is a tooltip
or it is cut.

**Comparison honesty.** Pace prorates the target to the snapshot's as-of day;
month-over-month deltas cut the prior month at the same day-of-month. Comparing
14 days against a full month would manufacture a collapse.

**Two design token systems, on purpose.** `config/designTokens.ts` +
`docs/knowledge/design-system/` is the **public brand**; `app/(site)/admin/_ui/v2/tokens.css`
(`--ops-*`) is the **internal ops** system, derived from the brand but tuned
for dense data screens. Do not mix them.

**Squash-merge discipline.** This repo squash-merges, which puts branch content
on `main` under a new SHA while the originals live on. A branch whose PR has
merged is finished — commits added afterwards look merged and are not. This
cost a deliberate UI deletion that sat unmerged for a day. See `CLAUDE.md`.

**Deployment.** `main` is the source of truth. Production deploys from `main`
only; branch and preview promotion is prohibited. Also `CLAUDE.md`.
