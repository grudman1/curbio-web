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
