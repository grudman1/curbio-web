import {
  readOpsRecord,
  readOpsRecords,
  type OpsReadResult,
  type OpsRecord,
} from "./opsStore";

// Partner records — the Call Plan's rows, editable. The first ops object;
// the plumbing it established now lives in lib/opsStore.ts and every other
// object inherits it from there.
//
// The schema is the Call Plan's own columns (partner, stage, next step, next
// step date, owner, agents reached, meetings) plus notes — the screen wrote
// the spec, this just names it.

export const PARTNER_OBJECT = "partner";

export type Partner = OpsRecord & {
  name: string;
  /** Free text — the seed rows carry prose like "signed, dormant". */
  stage: string;
  /** Who at Curbio owns the relationship. */
  owner: string;
  nextStep: string;
  /** YYYY-MM-DD, or "" when no step is scheduled. */
  nextStepDate: string;
  notes: string;
  /** Self-reported counts — LOGGED, not measured. Null = never entered,
   *  which renders as a dash, never as zero. */
  agentsReached: number | null;
  meetingsBooked: number | null;
};

export function readOpsPartners(): Promise<OpsReadResult<Partner>> {
  return readOpsRecords<Partner>(PARTNER_OBJECT);
}

export function readOpsPartner(id: string): Promise<Partner | null> {
  return readOpsRecord<Partner>(PARTNER_OBJECT, id);
}
