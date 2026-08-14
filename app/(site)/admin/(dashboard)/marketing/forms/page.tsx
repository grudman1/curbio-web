import type { Metadata } from "next";
import { Meta, MUTED, Panel, Stat, SUBTLE } from "../../ui";
import { FORM_TYPES, HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { ConsequenceNote, DASH, DefinitionsNote, EmptyLog, HubPageHeader, NeedsBlock } from "../hubUi";

export const metadata: Metadata = {
  title: "Marketing · Forms · Control Room — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.forms;

export default function FormsPage() {
  return (
    <>
      <HubPageHeader surface={surface} />

      {/* ── counts by form type ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel title="Submissions by form type" right={<Meta>this month</Meta>}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px 32px" }}>
            {FORM_TYPES.map((t) => (
              <Stat key={t} label={t} value={DASH} tone={SUBTLE} />
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
            Every submission here is an Engaged conversion. <strong>estimate</strong> is
            not a form type on this page and never will be — estimates go to the app and
            appear in the Hub only as Qualified numbers synced back from it.
          </p>
          <DefinitionsNote />
        </Panel>
      </div>

      {/* ── the submission log ── */}
      <Panel title="Submission log" right={<Meta>newest first</Meta>}>
        <EmptyLog
          columns={["Received", "Form type", "Contact", "Market", "Channel", "Asset delivered"]}
          fedBy="/api/intake"
        />
        <ConsequenceNote>
          An unconfirmed toolkit delivery is a broken promise to an agent — the
          asset-delivered column exists so that promise is checked, not assumed.
        </ConsequenceNote>
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}
