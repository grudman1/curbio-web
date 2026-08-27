import type { Metadata } from "next";
import { Meta, MUTED, Panel, Stat, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { EVENT_FORMATS, HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsEvents, type OpsEvent } from "@/lib/opsEvents";
import { ConsequenceNote, DASH, DefinitionsNote, HubPageHeader, NeedsBlock } from "../hubUi";
import { EventLog } from "./EventLog";

export const metadata: Metadata = {
  title: "Events · Marketing — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const surface = HUB_SURFACE_BY_SLUG.events;

export default async function EventsPage() {
  const [result, session] = await Promise.all([readOpsEvents(), ownerSession()]);
  const isOwner = !!session;

  const all: OpsEvent[] = result.configured ? result.records : [];
  const events = all
    .filter((e) => !e.archived)
    .sort((a, b) => b.date.localeCompare(a.date));
  const archived = all.filter((e) => e.archived);

  const byFormat = new Map<string, number>();
  for (const e of events) byFormat.set(e.format, (byFormat.get(e.format) ?? 0) + 1);

  return (
    <>
      <HubPageHeader surface={surface} />

      {/* ── counts by format ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel title="Events by format" right={<Meta>all logged events</Meta>}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px 32px" }}>
            {EVENT_FORMATS.map((f) => {
              const n = byFormat.get(f) ?? 0;
              return (
                <Stat
                  key={f}
                  label={f.replace("_", " ")}
                  value={n === 0 ? DASH : String(n)}
                  tone={SUBTLE}
                />
              );
            })}
          </div>
          <p
            style={{
              fontFamily: "var(--font-family-sans)",
              fontSize: "var(--text-small)",
              color: MUTED,
              margin: "16px 0 0",
              maxWidth: 720,
              lineHeight: 1.6,
            }}
          >
            Attendance and RSVPs are Engaged; an estimate request that follows an event is
            Qualified.
          </p>
          <DefinitionsNote />
        </Panel>
      </div>

      {/* ── the event log ── */}
      <Panel title="Event log" right={<Meta>invited → registered → attended → leads</Meta>}>
        {!result.configured && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: SUBTLE, margin: "0 0 12px" }}>
            Ops store not configured — the log is read-only.
          </p>
        )}
        {result.configured && result.error && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: "var(--color-state-error)", margin: "0 0 12px" }} role="alert">
            Store read failed: {result.error}
          </p>
        )}
        <EventLog events={events} archived={archived} isOwner={isOwner && result.configured} />
        <ConsequenceNote>
          Events without call tracking land as {`“`}direct{`”`} — the follow-up
          estimate request happens days later, on a typed-in URL, and nothing connects it
          back to the room it started in. The campaign code on each record is what closes
          that gap.
        </ConsequenceNote>
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}
