// Run it:
//
//   node --test "app/(site)/admin/_ui/v2/monthFocus.test.mjs"
//
// No test framework and no new dependency: `node:test` is built in, and Node
// strips the type annotations itself. That matters here because package.json
// is a shared file under the parallel-workstream rules in CLAUDE.md — a test
// for one component is not a reason to add a runner to both worktrees without
// asking. If a runner is adopted later, this file is already in its format.
//
// Plain .mjs rather than .ts: Node needs the explicit "./monthFocus.ts"
// specifier to strip types on import, and tsc rejects that extension unless
// tsconfig gains `allowImportingTsExtensions` — another shared-file edit.
// tsconfig's `include` covers .ts/.tsx only, so this file sidesteps both. The
// module under test is fully typed; these are assertions, not types.
//
// What is being protected: the "Qualified by month" panel opening on a month
// the rest of the page is not reporting. That shipped once (#101 switched the
// month labels to render from `selected` and left the breakdown's initial
// state on the last month of the series), so selecting April showed April's
// labels beside August's numbers.

import test from "node:test";
import assert from "node:assert/strict";
import { defaultMonthIndex } from "./monthFocus.ts";

const series = (...selected) => selected.map((s) => ({ selected: s }));

test("opens on the selected month, not the last month of the series", () => {
  // Jan–Aug rendered, April selected. This is the exact regression.
  assert.equal(defaultMonthIndex(series(false, false, false, true, false, false, false, false)), 3);
});

test("a multi-month window opens on its NEWEST selected month", () => {
  // Jun/Jul/Aug selected → August, the month the window is reported through.
  assert.equal(defaultMonthIndex(series(false, false, false, false, false, true, true, true)), 7);
});

test("the selected month at the end of the series still resolves to itself", () => {
  assert.equal(defaultMonthIndex(series(false, false, true)), 2);
});

test("falls back to the last month when nothing is selected", () => {
  assert.equal(defaultMonthIndex(series(false, false, false)), 2);
});

test("a single-month series is index 0 either way", () => {
  assert.equal(defaultMonthIndex(series(true)), 0);
  assert.equal(defaultMonthIndex(series(false)), 0);
});

test("an empty series returns -1 rather than throwing", () => {
  // The component early-returns on an empty series; this pins the contract so
  // a caller that forgets cannot get a silent 0 pointing at a month that is
  // not there.
  assert.equal(defaultMonthIndex([]), -1);
});
