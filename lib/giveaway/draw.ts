import { createHash, createHmac, randomBytes } from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// THE DRAWING — weighted, random, and reproducible.
//
// A prize drawing has to be defensible after the fact: "how do we know that
// was random, and how do we know the list wasn't changed?" Both questions are
// answered by what is recorded, not by trust:
//
//   the LIST     frozen at draw time as (email, entries) pairs in a fixed
//                order, and fingerprinted (SHA-256). A list edited afterwards
//                no longer matches its fingerprint.
//   the SEED     32 bytes from the OS's cryptographic generator, recorded.
//   the METHOD   deterministic given those two: anyone can re-run the same
//                seed over the same list and must get the same names in the
//                same order. `verifyDraw` is exactly that re-run.
//
// So the randomness comes from the seed, and the auditability comes from the
// fact that nothing ELSE is random.
//
// ── How a name is picked ────────────────────────────────────────────────────
// Think of one ticket per entry: a person with 6 entries holds 6 tickets. A
// number is drawn uniformly from 0 to (tickets − 1), the holder of that ticket
// wins, ALL of their tickets come out, and the next draw runs on what is left.
// That is "one win per person", and it is why a second prize never goes to
// someone already drawn.
//
// ── Why not Math.random(), and why rejection sampling ───────────────────────
// Math.random() is not seedable, so a draw made with it cannot be re-run. The
// numbers here come from HMAC-SHA256(seed, counter) instead. Taking such a
// number "modulo the ticket count" would favour low ticket numbers very
// slightly whenever the count does not divide the generator's range evenly, so
// values in the uneven tail are discarded and redrawn. With a 48-bit range and
// a few thousand tickets the tail is ~1 in 10^11 — but "slightly unfair" is
// not a property a prize drawing should have at any size.
//
// NO PATH ALIASES in this file, deliberately: it has no dependencies beyond
// node:crypto, so it can be exercised by a plain `node` script with no build.
// ─────────────────────────────────────────────────────────────────────────────

export const DRAW_ALGORITHM = "hmac-sha256-weighted-v1";

/** One person in the frozen list: identity and how many entries they hold. */
export type DrawTicket = { key: string; weight: number };

export type DrawResult = {
  /** Keys in the order drawn. Position 0 is the first name out. */
  order: string[];
  snapshotHash: string;
  totalWeight: number;
};

const RANGE_BITS = 48;
const RANGE = 2 ** RANGE_BITS; // exact in a double; well inside 2^53

/** Fixed order for the frozen list. Plain code-point comparison, never
 *  locale-aware: `localeCompare` can order the same strings differently on
 *  two machines, and then the same seed would draw different people. */
export function canonicalTickets(tickets: DrawTicket[]): DrawTicket[] {
  for (const t of tickets) {
    if (!Number.isInteger(t.weight) || t.weight < 1) {
      throw new Error(`draw: "${t.key}" has an invalid entry count (${t.weight})`);
    }
  }
  const sorted = [...tickets].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].key === sorted[i - 1].key) {
      throw new Error(`draw: "${sorted[i].key}" appears twice — the list must hold one row per person`);
    }
  }
  return sorted;
}

/** SHA-256 over the canonical list. Changing a name, an entry count, or adding
 *  or removing anyone changes this. */
export function snapshotHash(tickets: DrawTicket[]): string {
  const hash = createHash("sha256");
  for (const t of canonicalTickets(tickets)) hash.update(`${t.key}\t${t.weight}\n`, "utf8");
  return hash.digest("hex");
}

export function newSeed(): string {
  return randomBytes(32).toString("hex");
}

/** A deterministic stream of uniform integers from a seed. */
function generator(seedHex: string): (bound: number) => number {
  if (!/^[0-9a-f]{64}$/.test(seedHex)) throw new Error("draw: seed must be 64 hex characters");
  const key = Buffer.from(seedHex, "hex");
  let counter = 0;
  return (bound: number) => {
    if (!Number.isInteger(bound) || bound < 1 || bound > RANGE) {
      throw new Error(`draw: cannot draw from ${bound} tickets`);
    }
    // Largest multiple of `bound` that fits — anything at or above it is the
    // uneven tail and is thrown away.
    const limit = Math.floor(RANGE / bound) * bound;
    for (;;) {
      const block = createHmac("sha256", key).update(String(counter++), "utf8").digest();
      const value = block.readUIntBE(0, RANGE_BITS / 8);
      if (value < limit) return value % bound;
    }
  };
}

/**
 * Draw `count` people, in order, without replacement. Returns fewer than
 * `count` only when the list itself is shorter — it never repeats a person to
 * fill the gap.
 */
export function runDraw(tickets: DrawTicket[], seedHex: string, count: number): DrawResult {
  const pool = canonicalTickets(tickets);
  const hash = snapshotHash(pool);
  const totalWeight = pool.reduce((sum, t) => sum + t.weight, 0);
  const next = generator(seedHex);

  const order: string[] = [];
  let remaining = totalWeight;
  while (order.length < count && pool.length > 0) {
    let ticket = next(remaining);
    let index = 0;
    while (ticket >= pool[index].weight) {
      ticket -= pool[index].weight;
      index++;
    }
    const [picked] = pool.splice(index, 1);
    remaining -= picked.weight;
    order.push(picked.key);
  }
  return { order, snapshotHash: hash, totalWeight };
}

/**
 * Re-run a recorded draw. True only when the list still matches its recorded
 * fingerprint AND the same seed produces the same people in the same order.
 */
export function verifyDraw(
  tickets: DrawTicket[],
  recorded: { seed: string; snapshotHash: string; order: string[] }
): { ok: boolean; reason?: string } {
  const hash = snapshotHash(tickets);
  if (hash !== recorded.snapshotHash) {
    return { ok: false, reason: "The stored list no longer matches the fingerprint recorded at draw time." };
  }
  const rerun = runDraw(tickets, recorded.seed, recorded.order.length);
  const same =
    rerun.order.length === recorded.order.length && rerun.order.every((key, i) => key === recorded.order[i]);
  return same ? { ok: true } : { ok: false, reason: "Re-running the recorded seed produced a different order." };
}
