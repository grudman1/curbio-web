// ─────────────────────────────────────────────────────────────────────────────
// Checks for the giveaway drawing (lib/giveaway/draw.ts).
//
//   node scripts/test-giveaway-draw.mjs        Node 22.18+ (strips the types)
//   npx tsx scripts/test-giveaway-draw.mjs     any other Node
//
// Run it after ANY change to draw.ts, and before a drawing that matters. It
// needs no build, no network and no environment variables, and it touches no
// stored entries — every list here is made up on the spot.
//
// What it proves:
//   1. The same seed over the same list always draws the same people in the
//      same order, whatever order the list was handed over in.
//   2. A different seed draws differently.
//   3. A recorded drawing verifies — and stops verifying the moment the list
//      or the order is altered.
//   4. Nobody is drawn twice, even when more names are asked for than exist.
//   5. Bad input is refused rather than drawn from.
//   6. The odds are the stated odds: someone with 6 entries is drawn ahead of
//      someone with 1 six times in seven, and equal entrants are drawn evenly.
//      (Statistical, over 20,000 fresh seeds — a failure here on an unchanged
//      draw.ts is a 1-in-1,000 event; run it again before believing it.)
// ─────────────────────────────────────────────────────────────────────────────

import assert from "node:assert/strict";
import { canonicalTickets, newSeed, runDraw, snapshotHash, verifyDraw } from "../lib/giveaway/draw.ts";

// 1. Determinism + order-independence of the input list.
const people = Array.from({ length: 200 }, (_, i) => ({ key: `agent${String(i).padStart(3, "0")}@example.com`, weight: i % 4 === 0 ? 6 : 1 }));
const seed = "ab".repeat(32);
const a = runDraw(people, seed, 20);
const b = runDraw([...people].reverse(), seed, 20);
assert.deepEqual(a.order, b.order, "same seed + same list (any input order) must give the same result");
assert.equal(new Set(a.order).size, 20, "no person drawn twice");
assert.equal(a.totalWeight, 50 * 6 + 150 * 1);

// 2. A different seed gives a different result.
assert.notDeepEqual(runDraw(people, "cd".repeat(32), 20).order, a.order);

// 3. Verification passes untouched, fails when the list or the order is altered.
assert.equal(verifyDraw(people, { seed, snapshotHash: a.snapshotHash, order: a.order }).ok, true);
const tampered = people.map((p, i) => (i === 7 ? { ...p, weight: 6 } : p));
assert.equal(verifyDraw(tampered, { seed, snapshotHash: a.snapshotHash, order: a.order }).ok, false);
assert.equal(verifyDraw(people.slice(1), { seed, snapshotHash: a.snapshotHash, order: a.order }).ok, false);
assert.equal(verifyDraw(people, { seed, snapshotHash: a.snapshotHash, order: [...a.order].reverse() }).ok, false);

// 4. Asking for more winners than people returns everyone exactly once.
const few = people.slice(0, 3);
const all = runDraw(few, seed, 10);
assert.equal(all.order.length, 3);
assert.equal(new Set(all.order).size, 3);

// 5. Guards.
assert.throws(() => canonicalTickets([{ key: "a", weight: 0 }]));
assert.throws(() => canonicalTickets([{ key: "a", weight: 1 }, { key: "a", weight: 6 }]));
assert.throws(() => runDraw(people, "not-a-seed", 1));
assert.equal(runDraw([], seed, 5).order.length, 0);

// 6. Fairness: the weights are honoured. 2 people, weights 6 and 1 → the 6 should
//    be drawn first ~6/7 = 85.7% of the time. And among equal weights, uniform.
let heavyFirst = 0;
const N = 20000;
const firstCounts = new Map();
const equal = Array.from({ length: 10 }, (_, i) => ({ key: `p${i}`, weight: 1 }));
for (let i = 0; i < N; i++) {
  const s = newSeed();
  if (runDraw([{ key: "heavy", weight: 6 }, { key: "light", weight: 1 }], s, 1).order[0] === "heavy") heavyFirst++;
  const k = runDraw(equal, s, 1).order[0];
  firstCounts.set(k, (firstCounts.get(k) ?? 0) + 1);
}
const share = heavyFirst / N;
assert.ok(Math.abs(share - 6 / 7) < 0.01, `6-entry person drawn first ${(share * 100).toFixed(2)}% (expected 85.71%)`);
const counts = [...firstCounts.values()];
const expected = N / 10;
const chi2 = counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
assert.ok(chi2 < 27.9, `uniformity chi-square ${chi2.toFixed(2)} (df 9, 99.9% critical value 27.88)`);

console.log("draw: all checks passed");
console.log(`  weighted share: ${(share * 100).toFixed(2)}% (expected 85.71%)`);
console.log(`  uniformity chi-square over 10 equal entrants: ${chi2.toFixed(2)} (df 9)`);
console.log(`  fingerprint of the 200-person list: ${snapshotHash(people).slice(0, 16)}…`);
