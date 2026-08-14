import type { Metadata } from "next";
import { Meta, MUTED, Panel, Stat, SUBTLE } from "../../ui";
import { COLD_GRADUATION_RULE, CONTACT_STATUSES, HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { ConsequenceNote, DASH, DefinitionsNote, EmptyLog, HubPageHeader, NeedsBlock } from "../hubUi";

export const metadata: Metadata = {
  title: "Marketing · Contacts · Control Room — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.contacts;

export default function ContactsPage() {
  return (
    <>
      <HubPageHeader surface={surface} />

      {/* ── status mix ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Panel title="Status mix" right={<Meta>all contacts</Meta>}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px 32px" }}>
            {CONTACT_STATUSES.map((s) => (
              <Stat key={s} label={s} value={DASH} tone={SUBTLE} />
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
            The graduation rule: {COLD_GRADUATION_RULE}
          </p>
          <DefinitionsNote />
        </Panel>
      </div>

      {/* ── the contact table ── */}
      <Panel title="Contacts" right={<Meta>newest first</Meta>}>
        <EmptyLog
          columns={["Contact", "Market", "Status", "Channel", "Last activity", "Owner"]}
          fedBy="the contact store (ActiveCampaign and Instantly imports)"
        />
        <ConsequenceNote>
          A silent Instantly webhook means positive replies stop graduating contacts out
          of cold — and it has no other symptom.
        </ConsequenceNote>
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}
