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

if [ -z "$no_upstream" ] && [ -z "$ahead" ]; then
  echo "  ✔  Nothing at risk — every branch is on origin."
  echo
fi

# Uncommitted work is a third way to lose things.
if [ -n "$(git status --porcelain)" ]; then
  echo "  ⚠  UNCOMMITTED changes in $(git rev-parse --abbrev-ref HEAD):"
  git status --short | sed 's/^/       /'
  echo
fi
