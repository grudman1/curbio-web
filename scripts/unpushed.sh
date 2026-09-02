#!/bin/sh
# Report every branch whose work exists only on this machine.
#
# Two ways work goes missing:
#   1. A branch with no upstream at all — never pushed, invisible to origin.
#   2. A branch ahead of its upstream — pushed once, then diverged.
#
# Both are shown below. Anything listed is one disk failure from gone.
#
#   sh scripts/unpushed.sh

set -e
cd "$(git rev-parse --show-toplevel)"

git fetch --prune origin >/dev/null 2>&1 || \
  echo "  (warning: could not reach origin — results may be stale)"

# Worktrees first. A branch that owns a worktree must NEVER be bulk-deleted:
# deleting it force-removes the directory and any uncommitted work inside it.
# Branches here are off-limits to cleanup scripts, `[gone]` marker or not.
echo
echo "  WORKTREES — these branches own a directory; never bulk-delete them:"
git worktree list --porcelain | awk '
  /^worktree /  { dir=$2 }
  /^branch /    { br=$2; sub("refs/heads/","",br);
                  printf "       %-42s %s\n", dir, "[" br "]" }
  /^detached$/  { printf "       %-42s %s\n", dir, "(detached HEAD)" }
'

no_upstream=""
ahead=""

# %(if)-free parse: refname, upstream, ahead/behind track info
while IFS='|' read -r name upstream track; do
  [ -z "$name" ] && continue
  if [ -z "$upstream" ]; then
    no_upstream="$no_upstream$name|$(git rev-list --count HEAD.."$name" 2>/dev/null || echo '?')
"
  else
    n=$(git rev-list --count "$upstream".."$name" 2>/dev/null || echo 0)
    [ "$n" -gt 0 ] && ahead="$ahead$name|$n|$upstream
"
  fi
done <<INNER
$(git for-each-ref --format='%(refname:short)|%(upstream:short)|%(upstream:track)' refs/heads/)
INNER

echo
if [ -n "$no_upstream" ]; then
  echo "  ⚠  NO UPSTREAM — never pushed, exists only here:"
  printf '%s' "$no_upstream" | while IFS='|' read -r b _; do
    [ -n "$b" ] && printf '       %-38s %s\n' "$b" "$(git log -1 --format='%h  %s' "$b" | cut -c1-60)"
  done
  echo
fi

if [ -n "$ahead" ]; then
  echo "  ⚠  AHEAD OF UPSTREAM — local commits not on origin:"
  printf '%s' "$ahead" | while IFS='|' read -r b n up; do
    [ -n "$b" ] && printf '       %-38s +%s vs %s\n' "$b" "$n" "$up"
  done
  echo
fi

# Commits sitting on a branch whose PR is ALREADY MERGED, which never reached
# main. Pushing to such a branch re-creates a finished branch and the commit
# reaches nothing — the squash already ran. This is the state that lost
# hero.phone from #124.
#
# Keyed on MERGED PR STATE, not the `: gone` marker: pushing to a merged branch
# RESURRECTS it on origin, which clears `gone` and hides the very case this is
# for.
#
# Two filters, because the naive version cries wolf:
#
#   1. git cherry compares PATCH IDs, not SHAs — a squash rewrites the SHA, so
#      rev-list reports every merged branch as unmerged.
#   2. A patch-id ALSO fails to match when a MULTI-COMMIT PR is squashed: the
#      combined commit matches none of its parts. So a commit is only reported
#      when it was not in the merged PR's own commit list. Without this, every
#      multi-commit PR in the repo's history looks stranded.
#
# What survives both filters still needs a human: the commit may have been
# re-landed later by a different PR (a cherry-pick gets a new SHA, and if THAT
# PR squashed more than one commit its patch-id will not match either). Verify
# the content is genuinely absent from main before acting — check whether the
# files it touched already look the way the commit leaves them.
orphaned=""
if command -v gh >/dev/null 2>&1; then
  for b in $(git for-each-ref --format='%(refname:short)' refs/heads/); do
    [ "$b" = "main" ] && continue
    cand=$(git cherry origin/main "$b" 2>/dev/null | grep '^+' | awk '{print $2}')
    [ -z "$cand" ] && continue
    pr=$(gh pr list --head "$b" --state merged --json number --jq '.[0].number' 2>/dev/null)
    [ -z "$pr" ] && continue
    inpr=$(gh pr view "$pr" --json commits --jq '.commits[].oid' 2>/dev/null)
    n=0
    for sha in $cand; do
      echo "$inpr" | grep -q "^$sha$" || n=$((n + 1))
    done
    [ "$n" -gt 0 ] && orphaned="$orphaned$b|$n|$pr
"
  done
fi

if [ -n "$orphaned" ]; then
  echo "  ⚠  MERGED PR, commits possibly not on main — do NOT push to these:"
  printf '%s' "$orphaned" | while IFS='|' read -r b n pr; do
    [ -n "$b" ] && printf '       %-34s %s commit(s), PR #%s already merged\n' "$b" "$n" "$pr"
  done
  echo "       VERIFY the content is really absent from main before acting —"
  echo "       it may have been re-landed by a later PR under a new SHA."
  echo "       If genuinely missing: cherry-pick onto a fresh branch from main."
  echo
fi

if [ -z "$no_upstream" ] && [ -z "$ahead" ] && [ -z "$orphaned" ]; then
  echo "  ✔  Nothing at risk — every branch is on origin."
  echo
fi

# Uncommitted work is a third way to lose things.
if [ -n "$(git status --porcelain)" ]; then
  echo "  ⚠  UNCOMMITTED changes in $(git rev-parse --abbrev-ref HEAD):"
  git status --short | sed 's/^/       /'
  echo
fi
