import {
  readOpsRecord,
  readOpsRecords,
  type OpsReadResult,
  type OpsRecord,
} from "./opsStore";

// Event records — the Events screen's own log columns (event, format, market,
// date, invited, registered, attended, leads, cost per attendee), plus the
// campaign code.
//
// The campaign code is the point of the record, not decoration: an event
// without call tracking or a campaign code produces follow-up estimate
// requests days later on a typed-in URL, and they land as `direct`. The code
// is what lets a lead be tied back to the room it started in.
//
// invited → registered → attended is the screen's funnel, kept over the
// simpler expected/actual pair — it is the richer question and it was
// already written down.

export const EVENT_OBJECT = "event";

export type OpsEvent = OpsRecord & {
  name: string;
  /** EVENT_FORMATS key — closed list, validated in the action. */
  format: string;
  /** Market slug, or "" when an event is not market-specific. */
  market: string;
  /** YYYY-MM-DD. */
  date: string;
  /** utm_campaign this event's links and tracking use. Ties leads back. */
  campaignCode: string;
  invited: number | null;
  registered: number | null;
  attended: number | null;
  /** Leads credited to the event. LOGGED until /api/intake feeds it. */
  leads: number | null;
  /** Total event cost in USD; cost per attendee is derived, never stored. */
  costUsd: number | null;
};

export function readOpsEvents(): Promise<OpsReadResult<OpsEvent>> {
  return readOpsRecords<OpsEvent>(EVENT_OBJECT);
}

export function readOpsEvent(id: string): Promise<OpsEvent | null> {
  return readOpsRecord<OpsEvent>(EVENT_OBJECT, id);
}

/** Cost per attendee — DERIVED, never stored, and null unless both inputs
 *  exist. A cost with no attendees is not "$0 each", it is unknown. */
export function costPerAttendee(e: OpsEvent): number | null {
  if (e.costUsd === null || e.attended === null || e.attended <= 0) return null;
  return e.costUsd / e.attended;
}
