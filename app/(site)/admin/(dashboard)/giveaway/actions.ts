"use server";

import { revalidatePath } from "next/cache";
import { giveawayBySlug, type Giveaway } from "@/config/giveaways";
import { requireAdminApiSession } from "@/lib/adminApiAuth";
import { ownerSession } from "@/lib/adminGuards";
import {
  addBonus,
  findEntrant,
  reconcileBookings,
  removeBonus,
  runDrawing,
  sendToApp,
  syncEmailListBatch,
  verifyDrawing,
  type ReconcileReport,
} from "@/lib/giveaway/service";
import { sendTestAlert, type AlertTestResult } from "@/lib/giveaway/appDelivery";
import { storeScope } from "@/lib/giveaway/mode";
import { appendLog, writeSetting, type DrawRecord } from "@/lib/giveaway/store";

// ─────────────────────────────────────────────────────────────────────────────
// Mutations for the giveaway entries screen.
//
// TWO LEVELS OF ACCESS, both re-derived from the session on every call — the
// screen hiding a button is never the gate:
//
//   any signed-in admin   look an entrant up by email and add the booth-visit
//                         or written-request bonus. This is the "free
//                         alternative" the Official Rules promise, and the
//                         people adding it are booth staff, not the owner.
//                         It returns a first name and a market — enough to
//                         confirm the right person, nothing to browse.
//   owner only            everything else: the list, the export, sending to
//                         the app, removing a bonus, reconciling bookings,
//                         the deal-note switch, and the drawing.
//
// Every write names who did it in the giveaway's own log
// (lib/giveaway/store.ts). Nothing here deletes anything.
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
  // After the entry period only an owner may add one — for a visit that
  // happened before the deadline and is being typed in after it.
  const result = await addBonus(giveaway, email, source, session.email, session.role === "owner");
  if (result.ok) revalidatePath(PATH);
  return result;
}

// ── Owner only ───────────────────────────────────────────────────────────────

export async function removeBonusAction(slug: string, email: string, why: string): Promise<{ ok: true } | Fail> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  if (!why.trim()) return { ok: false, error: "Say why — the reason goes in the log." };
  const result = await removeBonus(giveaway, email, session.email, why.trim());
  if (result.ok) revalidatePath(PATH);
  return result;
}

export async function sendToAppAction(slug: string, email: string): Promise<{ ok: true; status: string } | Fail> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
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
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
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
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
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

export async function setDealNoteAction(slug: string, on: boolean): Promise<{ ok: true } | Fail> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  try {
    const scope = storeScope(giveaway);
    await writeSetting(scope, "dealNote", on);
    await appendLog(scope, {
      at: new Date().toISOString(),
      email: null,
      by: session.email,
      action: "setting_changed",
      detail: `deal note ${on ? "on" : "off"}`,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }
  revalidatePath(PATH);
  return { ok: true };
}

/**
 * Owner only: send a TEST failure alert to the owner address, through the same
 * path a real one takes, and report what the email service said.
 */
export async function sendTestAlertAction(slug: string): Promise<AlertTestResult | Fail> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  const result = await sendTestAlert(session.email);
  await appendLog(storeScope(giveaway), {
    at: new Date().toISOString(),
    email: null,
    by: session.email,
    action: "alert_test",
    detail: result.ok ? `sent to ${result.to}` : `FAILED — ${result.error}`,
  });
  revalidatePath(PATH);
  return result;
}

export async function runDrawingAction(
  slug: string,
  mode: "official" | "practice",
  note: string
): Promise<{ ok: true; record: DrawRecord } | Fail> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
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
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  const giveaway = giveawayFor(slug);
  if (!giveaway) return { ok: false, error: "Unknown giveaway." };
  return verifyDrawing(giveaway, drawId);
}
