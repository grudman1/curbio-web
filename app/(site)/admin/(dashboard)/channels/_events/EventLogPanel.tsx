import { OpsCard } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { StatusBadge } from "@/app/(site)/admin/_ui/v2/HealthDot";
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
    <OpsCard
      title="Event log"
      titleTooltip="Invited → registered → attended → leads. Events without call tracking land as direct — the campaign code on each record is what ties the later, typed-in estimate request back to the room it started in. Attendance and RSVPs are Engaged; an estimate request that follows an event is Qualified."
      control={
        <span className="inline-flex items-center gap-1.5">
          {!result.configured && (
            <StatusBadge
              status="read-only"
              tone="neutral"
              title="Ops store not configured — the log is read-only."
            />
          )}
          {result.configured && result.error && (
            <StatusBadge status="store error" tone="error" title={`Store read failed: ${result.error}`} />
          )}
        </span>
      }
    >
      <EventLog events={events} archived={archived} isOwner={isOwner && result.configured} />
    </OpsCard>
  );
}
