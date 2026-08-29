# Working rules for this repo

## Deployment — main is the source of truth

**Production deploys from `main`, and only from `main`.**

- Every change reaches production by being merged into `main` first.
- **Never promote a branch or a preview deployment to Production** in the
  Vercel UI. Not for a quick look, not to show someone, not "just this once".
- Preview deployments are for review. They are not a delivery mechanism.

### Why this rule exists

On 2026-08-29 production was found running `1a25456` — the tip of an open,
unmerged pull request. It had been promoted from the Vercel UI. Three things
were true at once and none of them were visible from the dashboard:

1. `main` did not contain the code that was live. The next deploy from `main`
   would have silently removed a shipped feature.
2. A deliberate deletion of the header search and notification components,
   committed to a branch after that branch's PR had already been
   squash-merged, was absent from `main` — so anything branched from `main`
   brought those components back. Promoting such a branch put deleted UI back
   in front of users.
3. Nobody could answer "what is in production?" by looking at `main`.

The failure was not any one promotion. It was that production and `main` were
allowed to disagree, so every later branch inherited the wrong baseline.

### The squash-merge trap that goes with it

This repo squash-merges. A squash-merge puts the branch's *content* on `main`
under a **new SHA**, and the original commits keep existing on the branch.

**After your PR is squash-merged, that branch is finished. Do not add to it.**
Commits pushed to an already-merged branch look merged (the PR says "Merged")
but are not in `main`, and they are easy to lose. That is exactly how the
header-chrome deletion went missing.

Start a fresh branch off the updated `main` for the next piece of work.

### Before pushing

1. `git fetch --prune origin`
2. Check whether the branch you are on has already been merged — a merged PR
   plus a still-existing branch is the trap above.
3. If it has, branch off `origin/main` instead of adding to it.

## Parallel workstreams — who owns which files

The codebase has exactly TWO trees, and every route belongs to one of them:

- **Public** — the marketing site and campaign landing pages. What visitors
  and agents see. `app/(site)/(chrome)/`, `app/(campaigns)/`, partner pages.
- **Admin** — everything internal: the ops dashboard, reporting, and the
  tokened exec share. All of it under `app/(site)/admin/`, all behind one
  session gate (plus login/signup and the exec share token as the only
  controlled unauthenticated entries).

There is no third category. `app/(site)/marketing/` used to be one — an
internal control room that wasn't in /admin and sounded public when it wasn't
— and was consolidated into /admin (2026-08). Old `/marketing/*` URLs 301 to
their /admin homes via middleware; do not recreate the tree.

Two branches are worked simultaneously, in separate git worktrees of this same
repo. The rules below are written in terms of **branches**, not whichever agent
or person happens to be driving one, because that assignment can change.

| Branch | Worktree | Owns |
|---|---|---|
| `feat/site-redesign` | `../curbio-site` | `app/(site)/(chrome)/` · `app/(campaigns)/lp/` · `app/(site)/exp/` and the partner-page templates · `public/` |
| dashboard work (branches off `main`) | `curbio-web` | `app/(site)/admin/` · `app/api/admin/` · the import scripts · the `config/` and `lib/` modules those read |

**Own means: edit freely without asking. Everything else, ask first.**

Note the two path corrections against how these are often described: the
campaign pages are at **`app/(campaigns)/lp/`**, not `app/(site)/lp/`; and the
Next config is **`next.config.mjs`**, not `.js`.

### Shared files — stop and ask before touching

Neither branch changes any of these without checking with Gavin first, because
both trees import them and a change lands on the other branch invisibly:

- `package.json` (and the lockfile)
- `tailwind.config.ts`
- `app/globals.css`
- `app/tokens.css`
- `app/layout.tsx` — the root layout
- **`app/(site)/layout.tsx`** — easy to miss: `/admin` and the public
  `(chrome)` group are **both** inside `app/(site)/`, so this layout wraps the
  dashboard too. It is currently a deliberate pass-through; adding site chrome
  here would render it around `/admin`.
- `middleware.ts`
- `next.config.mjs`
- `lib/channels.ts`
- `config/markets.ts`

The list is not exhaustive. The test is the principle behind it: **if both
trees import it, it is shared** — stop and ask.

### Fonts: two systems, on purpose. Do not consolidate.

This is the likeliest trap in the whole split, because the two setups look like
duplication and are not.

- The **public site** loads Google's subsetted WOFF2 through `next/font/google`
  in the root layout, bound to `--font-serif` / `--font-sans`. Every `.lp-*`
  rule and the whole marketing site renders through those two names.
- **`/admin`** separately loads self-hosted variable TTFs through
  `next/font/local` in `app/(site)/admin/_ui/v2/fonts.ts`, bound to
  `--ops-font-serif` / `--ops-font-sans` — deliberately different names, so
  nothing global is overridden.

The self-hosted files are **605,724 bytes (605KB) and unsubsetted**. They must
**never** be promoted to the root layout or bound to the global `--font-*`
names: that would change which bytes sell.curbio.com serves to every visitor,
to no benefit for the public site.

Neither branch consolidates fonts, unifies the variable names, or "removes the
duplicate" font loading. `app/(site)/admin/_ui/v2/fonts.ts` carries the longer
rationale — read it before proposing any font change.

## Environment variables

Server-side secrets live in Vercel project settings and in gitignored
`.env.local` for local work. `.env.example` documents every variable by name
with an empty value, and is the checklist when standing up a new environment.

A variable that exists in Production but not Preview will make the feature
that depends on it appear broken on preview URLs while working in production —
check both. `ADMIN_SESSION_SECRET` is currently Production-only, which is why
`/admin` fails closed (404) on preview deployments.

## Route handlers under `app/api/`

`middleware.ts`'s matcher excludes `/api`:

```
"/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"
```

So the `/admin` session gate **does not cover route handlers**. Anything under
`app/api/admin/` must call `requireAdminApiSession()` from `lib/adminApiAuth.ts`
itself and return `unauthorized()` when it comes back null. There is no second
layer behind it.

An authenticated route must also never be cacheable — no `revalidate`, no
`s-maxage`. Cache the upstream data instead, where it is shared and carries
nothing user-specific.

## Page registry

Every new page gets a row in `config/pageRegistry.ts`, added as `stub`. Only
Gavin flips a row to `live`.
