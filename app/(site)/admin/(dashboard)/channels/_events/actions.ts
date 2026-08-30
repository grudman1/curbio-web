"use server";

import { ownerSession } from "@/lib/adminGuards";
import { EVENT_FORMATS } from "@/config/marketingHub";
import { MARKET_BY_SLUG } from "@/config/markets";
import { EVENT_OBJECT, readOpsEvent, type OpsEvent } from "@/lib/opsEvents";
import { setOpsArchived, stampRecord, writeOpsRecord } from "@/lib/opsStore";
import { EVENT_PATHS, parseCount, parseMoney, revalidateAll } from "@/app/(site)/admin/_ui/opsActionUtils";

// Mutations for the event log. Owner-gated, stamped, archived not deleted —
// the pattern Partner established.

export type SaveEventInput = {
  id?: string;
  name: string;
  format: string;
  market: string;
  date: string;
  campaignCode: string;
  invited: string;
  registered: string;
  attended: string;
  leads: string;
  costUsd: string;
};

export type SaveEventResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveEventAction(input: SaveEventInput): Promise<SaveEventResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required — an event nobody can recognise is a row nobody maintains." };

  if (!(EVENT_FORMATS as readonly string[]).includes(input.format))
    return { ok: false, error: "Format must be one of the four the Events screen counts by." };

  const market = input.market.trim();
  if (market && !MARKET_BY_SLUG[market])
    return { ok: false, error: "Unknown market — leave it empty for an event that is not market-specific." };

  const date = input.date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { ok: false, error: "Date is required — an event with no date cannot be attributed to a month." };

  // The campaign code is what ties follow-up estimate requests back to the
  // room they started in. Not required (a record is still worth having), but
  // when present it must be a usable utm_campaign value.
  const campaignCode = input.campaignCode.trim();
  if (campaignCode && !/^[a-z0-9][a-z0-9-]*$/.test(campaignCode))
    return { ok: false, error: "Campaign code must be lowercase letters, numbers and hyphens — it travels in a URL as utm_campaign." };

  const counts = {
    invited: parseCount(input.invited, "Invited"),
    registered: parseCount(input.registered, "Registered"),
    attended: parseCount(input.attended, "Attended"),
    leads: parseCount(input.leads, "Leads"),
  };
  for (const v of Object.values(counts)) {
    if (typeof v === "object" && v !== null) return { ok: false, error: v.error };
  }
  const costUsd = parseMoney(input.costUsd, "Cost");
  if (typeof costUsd === "object" && costUsd !== null) return { ok: false, error: costUsd.error };

  const existing = input.id ? await readOpsEvent(input.id) : null;
  if (input.id && !existing) return { ok: false, error: "That event no longer resolves — reload the screen." };

  const now = new Date().toISOString();
  const event = stampRecord<OpsEvent>(
    existing,
    {
      name,
      format: input.format,
      market,
      date,
      campaignCode,
      invited: counts.invited as number | null,
      registered: counts.registered as number | null,
      attended: counts.attended as number | null,
      leads: counts.leads as number | null,
      costUsd: costUsd as number | null,
    },
    session.email,
    now
  );

  try {
    await writeOpsRecord(EVENT_OBJECT, event, {
      at: now,
      by: session.email,
      recordId: event.id,
      label: `${event.name} (${event.date})`,
      action: existing ? "update" : "create",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }

  revalidateAll(EVENT_PATHS);
  return { ok: true, id: event.id };
}

export type ArchiveResult = { ok: true } | { ok: false; error: string };

export async function archiveEventAction(id: string, archived: boolean): Promise<ArchiveResult> {
  const session = await ownerSession();
  if (!session) return { ok: false, error: "Owner access required." };
  try {
    const next = await setOpsArchived<OpsEvent>(EVENT_OBJECT, id, archived, session.email, (e) => `${e.name} (${e.date})`);
    if (!next) return { ok: false, error: "That event no longer resolves — reload the screen." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }
  revalidateAll(EVENT_PATHS);
  return { ok: true };
}
