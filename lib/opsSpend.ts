import {
  readOpsRecord,
  readOpsRecords,
  type OpsReadResult,
  type OpsRecord,
} from "./opsStore";

// Spend entries — month × market × channel × amount, exactly the four fields
// the Settings screen's disabled form already specced. This is the store that
// form was disabled until: CAC, cost per Qualified, cost per meeting and cost
// per attendee all wait on it.
//
// Spend is self-reported like everything else in the ops store — it is typed
// in from invoices, not measured by the system — so every number derived from
// it inherits the `logged` marker at the point of display.

export const SPEND_OBJECT = "spend";

export type SpendEntry = OpsRecord & {
  /** YYYY-MM. */
  month: string;
  /** Market slug, or "all" for spend that is not market-specific. */
  market: string;
  /** One of the ten channels (lib/channels.ts). */
  channel: string;
  amountUsd: number;
};

export function readOpsSpend(): Promise<OpsReadResult<SpendEntry>> {
  return readOpsRecords<SpendEntry>(SPEND_OBJECT);
}

export function readOpsSpendEntry(id: string): Promise<SpendEntry | null> {
  return readOpsRecord<SpendEntry>(SPEND_OBJECT, id);
}
