# Decisions

Standing decisions and the reasoning behind them. Things here were chosen
deliberately and look wrong without the context — read before "fixing" them.

Newest first.

---

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
