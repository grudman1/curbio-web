import { revalidatePath } from "next/cache";

// Shared bits for the ops server actions. Validation that every object needs
// (a self-reported count is either absent or a whole number) and the
// revalidate sets, written once so a new object cannot forget the admin
// mirror route the way a hand-copied action would.

/** "" → null (never entered ≠ zero); otherwise a non-negative integer. */
export function parseCount(raw: string, label: string): number | null | { error: string } {
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0)
    return { error: `${label} must be a whole number — it counts things that happened.` };
  return n;
}

/** "" → null; otherwise a non-negative amount, at most 2 decimal places. */
export function parseMoney(raw: string, label: string): number | null | { error: string } {
  const s = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return { error: `${label} must be an amount in dollars.` };
  return Math.round(n * 100) / 100;
}

// One path per surface. These were pairs — every mutation revalidated both
// the /marketing and the /admin route rendering the same screen. The
// two-tree consolidation removed the /marketing routes, so the pair (and the
// class of bugs where one side went stale) is gone with them.
export const PARTNER_PATHS = ["/admin/channels/partnerships/call-plan"];
export const OUTREACH_PATHS = ["/admin/channels/partnerships/outreach"];
export const EVENT_PATHS = ["/admin/channels/events"];
export const SPEND_PATHS = ["/admin/settings"];

export function revalidateAll(paths: string[]): void {
  for (const p of paths) revalidatePath(p);
}
