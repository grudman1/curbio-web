import { InfoPopover } from "@/app/(site)/admin/_ui/InfoPopover";
import { Meta, Panel } from "@/app/(site)/admin/_ui/primitives";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsEvents, type OpsEvent } from "@/lib/opsEvents";
import { EventLog } from "./EventLog";

// The event log as a standalone panel, so the Events CHANNEL screen and the
// legacy /marketing/events page render one implementation instead of two.

export async function EventLogPanel() {
  const [result, session] = await Promise.all([readOpsEvents(), ownerSession()]);
  const isOwner = !!session;

  const all: OpsEvent[] = result.configured ? result.records : [];
  const events = all.filter((e) => !e.archived).sort((a, b) => b.date.localeCompare(a.date));
  const archived = all.filter((e) => e.archived);

  return (
    <Panel
      flush
      title="Event log"
      right={
        <span className="inline-flex items-center gap-1.5">
          <Meta>invited → registered → attended → leads</Meta>
          <InfoPopover label="Why the campaign code matters" align="right">
            <p className="m-0 mb-2">
              Events without call tracking land as &ldquo;direct&rdquo; — the follow-up estimate
              request happens days later, on a typed-in URL, and nothing connects it back to the
              room it started in. The campaign code on each record is what closes that gap.
            </p>
            <p className="m-0">
              Attendance and RSVPs are Engaged; an estimate request that follows an event is
              Qualified.
            </p>
          </InfoPopover>
        </span>
      }
    >
      {!result.configured && (
        <p className="m-0 px-ops-panel pb-3 font-sans text-ops-label text-content-subtle">
          Ops store not configured — the log is read-only.
        </p>
      )}
      {result.configured && result.error && (
        <p className="m-0 px-ops-panel pb-3 font-sans text-ops-label text-tone-bad" role="alert">
          Store read failed: {result.error}
        </p>
      )}
      <EventLog events={events} archived={archived} isOwner={isOwner && result.configured} />
    </Panel>
  );
}
