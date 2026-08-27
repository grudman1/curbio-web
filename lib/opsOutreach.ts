import {
  readOpsRecord,
  readOpsRecords,
  type OpsReadResult,
  type OpsRecord,
} from "./opsStore";

// Outreach entries — one record per HSM per week, from the Outreach screen's
// own needs list: "Mailing log (who, which arm, when) per HSM" and
// "Meeting-booked events attributable to an arm".
//
// Every number here is LOGGED. The A/B this feeds decides which arm books
// face time, so a typed-in meeting count must never render as a measured one.

export const OUTREACH_OBJECT = "outreach";

export type OutreachEntry = OpsRecord & {
  /** HSM name, from config/markets.ts — never a free-typed person. */
  hsm: string;
  /** Monday of the week being logged, YYYY-MM-DD. One record per hsm+week. */
  weekOf: string;
  /** Which arm of the A/B this week's mailings used. OUTREACH_ARMS key. */
  arm: string;
  mailingsSent: number | null;
  callsMade: number | null;
  meetingsBooked: number | null;
};

export function readOpsOutreach(): Promise<OpsReadResult<OutreachEntry>> {
  return readOpsRecords<OutreachEntry>(OUTREACH_OBJECT);
}

export function readOpsOutreachEntry(id: string): Promise<OutreachEntry | null> {
  return readOpsRecord<OutreachEntry>(OUTREACH_OBJECT, id);
}

/** The Monday on or before `d`, as YYYY-MM-DD. The cadence table is weekly,
 *  so every entry snaps to a week start — otherwise "this week" means seven
 *  different things depending on who typed it. */
export function weekStart(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay(); // 0 = Sunday
  const delta = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy.toISOString().slice(0, 10);
}
