# Decisions

Standing decisions and the reasoning behind them. Things here were chosen
deliberately and look wrong without the context — read before "fixing" them.

Newest first.

---

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

## Tailwind is configured but unused

`tailwind.config.ts` is a complete, well-built config that **nothing consumes**.
Zero Tailwind utility classes appear in any component; all styling is `lp-*`
classes plus inline styles. Only `@tailwind base` (preflight) has any effect.

Left in place because Phase 3's design work is expected to use it. Do not
assume a value in that config is reflected anywhere in the rendered output.

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
