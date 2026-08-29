"use server";

import { ownerSession } from "@/lib/adminGuards";
import { MARKET_BY_SLUG } from "@/config/markets";
import { VALID_CHANNELS } from "@/lib/channels";
import { SPEND_OBJECT, readOpsSpendEntry, type SpendEntry } from "@/lib/opsSpend";
import { setOpsArchived, stampRecord, writeOpsRecord } from "@/lib/opsStore";
import { parseMoney, revalidateAll, SPEND_PATHS } from "@/app/(site)/admin/_ui/opsActionUtils";

// Spend entry — the form on this screen has been disabled since it shipped,
// "until the spend store exists". It exists now.

export type SaveSpendInput = {
  id?: string;
  month: string;
  market: string;
  channel: string;
  amountUsd: string;
};

export type SaveSpendResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveSpendAction(input: SaveSpendInput): Promise<SaveSpendResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };

  const month = input.month.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    return { ok: false, error: "Month is required — spend with no month cannot divide into any month's leads." };

  const market = input.market.trim();
  if (market !== "all" && !MARKET_BY_SLUG[market])
    return { ok: false, error: "Unknown market — use “all markets” for spend that is not market-specific." };

  if (!(VALID_CHANNELS as readonly string[]).includes(input.channel))
    return { ok: false, error: "Channel must be one of the nine — anything else has no column to divide into." };

  const amount = parseMoney(input.amountUsd, "Amount");
  if (typeof amount === "object" && amount !== null) return { ok: false, error: amount.error };
  if (amount === null) return { ok: false, error: "Amount is required — an entry with no amount is not spend." };

  const existing = input.id ? await readOpsSpendEntry(input.id) : null;
  if (input.id && !existing) return { ok: false, error: "That entry no longer resolves — reload the screen." };

  const now = new Date().toISOString();
  const entry = stampRecord<SpendEntry>(
    existing,
    { month, market, channel: input.channel, amountUsd: amount },
    session.email,
    now
  );

  try {
    await writeOpsRecord(SPEND_OBJECT, entry, {
      at: now,
      by: session.email,
      recordId: entry.id,
      label: `${entry.month} · ${entry.market} · ${entry.channel} · $${entry.amountUsd}`,
      action: existing ? "update" : "create",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }

  revalidateAll(SPEND_PATHS);
  return { ok: true, id: entry.id };
}

export type ArchiveResult = { ok: true } | { ok: false; error: string };

export async function archiveSpendAction(id: string, archived: boolean): Promise<ArchiveResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  try {
    const next = await setOpsArchived<SpendEntry>(
      SPEND_OBJECT,
      id,
      archived,
      session.email,
      (e) => `${e.month} · ${e.market} · ${e.channel} · $${e.amountUsd}`
    );
    if (!next) return { ok: false, error: "That entry no longer resolves — reload the screen." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }
  revalidateAll(SPEND_PATHS);
  return { ok: true };
}
