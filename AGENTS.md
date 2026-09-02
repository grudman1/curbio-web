# Working rules for this repo

## Branch discipline

**Cut from `origin/main` only.** Never branch off an existing branch. Two engineers working in parallel means conflicts are inevitable if you branch off old commits; starting from main gives both of you the same baseline.

**Before you start work:**
```
git fetch --prune origin
git pull origin main
```

**Before you push:**
```
git fetch --prune origin
```

Then verify your branch hasn't already been merged — a merged PR plus a still-existing branch is the trap that caused the production incident. If it has been merged, branch off the updated main for your next work.

**Merge within a day.** Long-lived branches accumulate conflicts. Push early, get review, merge and move on.

**After squash-merge, the branch is finished.** A squash-merge puts your content on main under a new SHA, but the original commits stay on your branch. Adding to an already-merged branch looks merged in the UI but isn't on main — commits easily get lost. Start fresh from the updated main.

## Shared files — heads-up, not permission

These are imported by both the public site (`app/(site)/(chrome)/`, `app/(campaigns)/`, `app/(site)/exp/`) and the admin dashboard (`app/(site)/admin/`). A change to one affects work in progress on the other:

- `middleware.ts`
- `app/layout.tsx`
- `app/(site)/layout.tsx`
- `app/globals.css`
- `app/tokens.css`
- `tailwind.config.ts`
- `package.json` (and lockfile)
- `next.config.mjs`
- `lib/channels.ts`
- `config/markets.ts`

**The rule is not "don't touch."** It's: before you commit, list your changed files. If any are on that list, say so plainly in your commit message or PR summary. I'll check the other side and coordinate if needed. Editing them is fine — surprising me is not.

## Two unchanging facts

**1. The duplicate fonts are deliberate.** The public site loads Google's subsetted WOFF2 (bound to `--font-serif` / `--font-sans`) in the root layout. Admin loads self-hosted variable TTFs (bound to `--ops-font-serif` / `--ops-font-sans`) in `app/(site)/admin/_ui/v2/fonts.ts`. They are two systems on purpose:

- Consolidating into Google strips admin of its typeface.
- Consolidating into self-hosted ships 605 KB of unsubsetted TTF onto every campaign landing page.

Leave both alone. The detailed rationale is in `fonts.ts`.

**2. `app/tokens.css` is shared, not admin-only.** It declares 40 `--ops-*` / `--app-*` / `--tone-*` / `--pill-*` variables used across the admin tree. Don't move them, rename them, or scope them — they're imported by both trees.

## Deployment

**Production deploys from `main` only.** Never promote a branch or preview to Production in the Vercel UI. It happened once: production ran an open PR while main ran different code. Next deploy from main would have silently deleted a shipped feature. `main` is the source of truth.

## Page registry

Every new page gets a `stub` row in `config/pageRegistry.ts`. Only I flip it to `live`.

## Working rules

These exist because a commit wiring the email platform sync sat on local `main`
only — never pushed, three commits behind origin — and came within one routine
`git branch -D` sweep of being destroyed. Every rule below is that incident.

- **Never commit while `main` or `master` is checked out. Create a branch
  first.** A commit on local `main` has no upstream to push to and no PR to be
  reviewed in. It is invisible to everyone including you. `.githooks/pre-commit`
  enforces this.
- **Push every branch to origin in the same session it's created.** Work that
  exists only on this machine is work that can be lost — to a disk, a bad
  `reset`, or a cleanup script that had no way to know the branch was precious.
  Push before the work is finished; an unreviewed branch on origin costs
  nothing.
- **Before ending a session, run `git status` and `git log origin/main..HEAD`
  and report anything unpushed.** `scripts/unpushed.sh` does both across every
  branch at once.
- **Never bulk-delete branches.** Run `git worktree list` first and confirm the
  branch does not own a worktree. A branch marked `[gone]` upstream is **not**
  necessarily safe to delete locally: if it owns a worktree, deleting it
  force-removes that directory and destroys any uncommitted work in it. This
  machine runs two worktrees — `curbio-web` and `curbio-site` — so two agents
  can work in parallel, which makes this hazard permanent, not incidental.
  Scripted cleanups that match on `[gone]` (including the `clean_gone` skill)
  will happily wipe the other agent's workspace. Delete branches by name, after
  checking. `scripts/unpushed.sh` prints the worktree table.
- **All admin dashboard changes stay within `app/(site)/admin/`,
  `app/api/admin/`, and the config modules those read.** Boundary audit before
  every commit: list your changed files and confirm each one belongs. Anything
  outside that set is a shared file — see the list above — and needs to be
  called out.

  **Named exceptions.** These live outside the boundary deliberately. Do not
  "fix" them by moving them inside it:

  - `app/api/cron/` — Vercel cron invokes these routes directly by path, from
    the schedule in `vercel.json`. `app/api/cron/email-sync/` is the current
    one. Moving a cron route under `app/api/admin/` changes its URL and
    silently breaks the schedule: the deploy succeeds, the cron 404s, and
    nothing surfaces until the data it syncs goes stale.
- **Channel is derived from `utm_source` at REQUEST time, never from page
  config.** `deriveChannel()` in `lib/channels.ts` maps `utm_source` onto a
  closed **ten**-value list, and anything absent or unrecognised becomes
  `direct`. It runs twice from the same value — client-side in `FormCard` for
  the GA event, server-side in `app/api/lead/route.ts` for the stored lead —
  so they cannot disagree. A page's `attribution.source` is the lead payload's
  `source` field and is *not* the channel. If leads from a page must land as
  `partnership`, the inbound links have to carry `?utm_source=partnership`.

  A page may set `attribution.defaultUtmSource` as a **fallback**, applied at
  SEND TIME in `FormCard` at the single point the stored UTMs are read. Two
  rules keep it a default and never an override, and both are load-bearing:

  1. **Blank counts as absent.** `?utm_source=` yields `""` — falsy but not
     nullish, so a bare `??` would keep the empty string while
     `deriveChannel("")` returns `direct`. Use a trim check.
  2. **Never persist it.** Not to `sessionStorage` (last-touch and
     session-WIDE) nor to the first-touch record in `localStorage` (90-day
     TTL). Writing it to either would leak one page's channel onto every later
     page in the session, and could stamp a 90-day first touch of
     `partnership` on a visitor whose real first touch was organic.

  Known and accepted consequence: a visitor who already picked up a real
  `utm_source` earlier in the session keeps it, so a default does **not** tag
  all of that page's traffic. Undercounting a partner is the correct trade —
  the alternative is overwriting genuine attribution.
- **Verify against live systems, not docs.** Reporting what an API "should"
  return is not the same as calling it. Run the request, read the response, and
  quote what actually came back.
