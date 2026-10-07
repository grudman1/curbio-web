"use server";

import { revalidatePath } from "next/cache";
import { giveawayBySlug, type Giveaway } from "@/config/giveaways";
import { requireAdminApiSession } from "@/lib/adminApiAuth";

import { sendTestAlert, type AlertTestResult } from "@/lib/giveaway/appDelivery";
import {
  addBonus,
  addManualEntry,
  countTestRecords,
  deleteAllTestEntries,
  findEntrant,
  hardDeleteTestEntry,
  restoreEntry,
  softDeleteEntry,
  type ManualInput,
  type ManualResult,
  logAlertTest,
  reconcileBookings,
  removeBonus,
  runDrawing,
  sendToApp,
  syncEmailListBatch,
  verifyDrawing,
  type ReconcileReport,
} from "@/lib/giveaway/service";
import { type DrawRecord } from "@/lib/giveaway/store";

// ─────────────────────────────────────────────────────────────────────────────
// Mutations for the giveaway entries screen.
//
// ONE LEVEL OF ACCESS (Gavin, 2026-10-07): anyone signed in to the admin can
// use every action on this screen — add, +5, delete, restore, send to the app,
// export, the drawing. The session is still re-derived on every call (the
// screen hiding a button is never the gate), and every write names who did it
// in the giveaway's own log (lib/giveaway/store.ts), which matters more now.
//
// Deletes: a REAL entry is soft-deleted (restorable, lead records kept); a TEST
// entry is hard-deleted with a backup first. Both stop once the official
// drawing has run.
// ─────────────────────────────────────────────────────────────────────────────

const PATH = "/admin/giveaway";

type Fail = { ok: false; error: string };

function giveawayFor(slug: string): Giveaway | null {
  return giveawayBySlug(slug);
}

// ── Any signed-in admin ──────────────────────────────────────────────────────

export async function lookupEntrantAction(
  slug: string,
  email: string
): Promise<{ ok: true; firstName: string; market: string | null; entries: number; hasBonus: boolean } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  const found = await findEntrant(giveaway, email);
  if (!found.ok) return found;
  return { ok: true, firstName: found.firstName, market: found.market, entries: found.entries, hasBonus: found.bonus !== null };
}

export async function addBonusAction(
  slug: string,
  email: string,
  source: "booth" | "written"
): Promise<{ ok: true; entries: number; already: boolean } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  if (source !== "booth" && source !== "written") return { ok: false, error: "Unknown bonus type." };
  // After the entry period any admin may still add one — for a visit that
  // happened before the deadline and is being typed in after it. Logged.
  const result = await addBonus(giveaway, email, source, session.email, true);
  if (result.ok) revalidatePath(PATH);
  return result;
}

// ── Every other action (also any signed-in admin) ────────────────────────────

export async function removeBonusAction(slug: string, email: string, why: string): Promise<{ ok: true } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  if (!why.trim()) return { ok: false, error: "Say why — the reason goes in the log." };
  const result = await removeBonus(giveaway, email, session.email, why.trim());
  if (result.ok) revalidatePath(PATH);
  return result;
}

export async function sendToAppAction(slug: string, email: string): Promise<{ ok: true; status: string } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  const result = await sendToApp(giveaway, email, session.email);
  revalidatePath(PATH);
  return result;
}

/**
 * One batch of the email-list catch-up. The screen calls it repeatedly;
 * `runStartedAt` is when the button was pressed, and is what stops an entry
 * that keeps failing from being retried for ever within one run.
 */
export async function syncEmailListAction(
  slug: string,
  runStartedAt: string
): Promise<{ ok: true; synced: number; failed: number; remaining: number } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  if (typeof runStartedAt !== "string" || Number.isNaN(Date.parse(runStartedAt))) {
    return { ok: false, error: "Bad request." };
  }
  const result = await syncEmailListBatch(giveaway, session.email, runStartedAt);
  if (result.ok && result.remaining === 0) revalidatePath(PATH);
  return result;
}

export async function reconcileAction(
  slug: string,
  pasted: string,
  apply: boolean
): Promise<{ ok: true; report: ReconcileReport; found: number; recorded: number } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  if (typeof pasted !== "string" || pasted.length > 2_000_000) return { ok: false, error: "That paste is too large." };
  // Whatever was pasted — a CSV export, a column of addresses, an email thread
  // — the addresses are what matter. Deliberately a narrow pattern: anything
  // looser starts swallowing the punctuation BETWEEN two addresses and reports
  // one long non-address instead of two real ones.
  const emails = pasted.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g) ?? [];
  if (emails.length === 0) return { ok: false, error: "No email addresses found in what was pasted." };
  const result = await reconcileBookings(giveaway, emails, session.email, apply);
  if (!result.ok) return result;
  if (apply) revalidatePath(PATH);
  return {
    ok: true,
    report: result.report,
    found: new Set(emails.map((e) => e.toLowerCase())).size,
    recorded: result.recorded,
  };
}

export async function runDrawingAction(
  slug: string,
  mode: "official" | "practice",
  note: string
): Promise<{ ok: true; record: DrawRecord } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  if (mode !== "official" && mode !== "practice") return { ok: false, error: "Unknown drawing type." };
  const result = await runDrawing(giveaway, session.email, mode, note);
  if (result.ok) revalidatePath(PATH);
  return result;
}

export async function verifyDrawingAction(
  slug: string,
  drawId: string
): Promise<{ ok: true; verified: boolean; reason?: string } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  return verifyDrawing(giveaway, drawId);
}

/**
 * Send a TEST failure alert to the owner address, through the same
 * path a real one takes, and report what the email service said.
 */
export async function sendTestAlertAction(slug: string): Promise<AlertTestResult | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  const result = await sendTestAlert(session.email);
  await logAlertTest(giveaway, session.email, result);
  revalidatePath(PATH);
  return result;
}

// ── Booth tools ──────────────────────────────────────────────────────────────

export async function addManualEntryAction(slug: string, input: ManualInput): Promise<ManualResult> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  const result = await addManualEntry(giveaway, input, session.email);
  if (result.ok) revalidatePath(PATH);
  return result;
}

/** Undo a +5 added moments ago from the toast. Logged as a removal. */
export async function undoBonusAction(slug: string, email: string): Promise<{ ok: true } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  const result = await removeBonus(giveaway, email, session.email, "undo (within 10 seconds of adding)");
  if (result.ok) revalidatePath(PATH);
  return result;
}

/** Real entry → soft delete. Test entry → hard delete with a backup. */
export async function deleteEntryAction(
  slug: string,
  email: string,
  isTest: boolean
): Promise<{ ok: true; hard: boolean; leadRows?: number; backupKey?: string } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  // The server decides hard vs soft from the stored entry: hardDeleteTestEntry
  // refuses anything that is not a test entry, whatever the screen sent.
  if (isTest) {
    const hard = await hardDeleteTestEntry(giveaway, email, session.email);
    if (!hard.ok) return hard;
    revalidatePath(PATH);
    return { ok: true, hard: true, leadRows: hard.leadRows, backupKey: hard.backupKey };
  }
  const soft = await softDeleteEntry(giveaway, email, session.email);
  if (!soft.ok) return soft;
  revalidatePath(PATH);
  return { ok: true, hard: false };
}

export async function restoreEntryAction(slug: string, email: string): Promise<{ ok: true } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  const result = await restoreEntry(giveaway, email, session.email);
  if (result.ok) revalidatePath(PATH);
  return result;
}

export async function countTestRecordsAction(slug: string): Promise<{ ok: true; entries: number; waitlist: number } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  return { ok: true, ...(await countTestRecords(giveaway)) };
}

export async function deleteAllTestEntriesAction(
  slug: string
): Promise<{ ok: true; entries: number; leadRows: number; waitlist: number; backupKey: string } | Fail> {
  const session = await requireAdminApiSession();
  if (!session) return { ok: false, error: "Sign in to continue." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  const result = await deleteAllTestEntries(giveaway, session.email);
  if (result.ok) revalidatePath(PATH);
  return result;
}
