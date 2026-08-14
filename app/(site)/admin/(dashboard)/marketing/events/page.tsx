import type { Metadata } from "next";
import { Meta, MUTED, Panel, Stat, SUBTLE } from "../../ui";
import { EVENT_FORMATS, HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { ConsequenceNote, DASH, DefinitionsNote, EmptyLog, HubPageHeader, NeedsBlock } from "../hubUi";

export const metadata: Metadata = {
  title: "Marketing · Events · Control Room — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.events;

export default function EventsPage() {
  return (
    <>
      <HubPageHeader surface={surface} />

      {/* ── counts by format ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel title="Events by format" right={<Meta>this quarter</Meta>}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px 32px" }}>
            {EVENT_FORMATS.map((f) => (
              <Stat key={f} label={f.replace("_", " ")} value={DASH} tone={SUBTLE} />
            ))}
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
        <EmptyLog
          columns={[
            "Event",
            "Format",
            "Market",
            "Date",
            "Invited",
            "Registered",
            "Attended",
            "Leads",
            "Cost per attendee",
          ]}
          fedBy="the event log store and event_rsvp submissions from /api/intake"
        />
        <ConsequenceNote>
          Events without call tracking land as {`“`}direct{`”`} — the follow-up
          estimate request happens days later, on a typed-in URL, and nothing connects it
          back to the room it started in.
        </ConsequenceNote>
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}
