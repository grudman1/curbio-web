import type { Metadata } from "next";
import { InfoPopover } from "@/app/(site)/admin/_ui/InfoPopover";
import { Meta, Panel } from "@/app/(site)/admin/_ui/primitives";
import { StatCard } from "@/app/(site)/admin/_ui/StatCard";
import { FORM_TYPES, HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { DefinitionsInfo, EmptyLog, HubPageHeader, NeedsBlock } from "../hubUi";

export const metadata: Metadata = {
  title: "Forms · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.forms;

export default function FormsPage() {
  return (
    <>
      <HubPageHeader surface={surface} right={<DefinitionsInfo align="right" />} />

      {/* ── counts by form type — unwired, so every value is an em-dash ── */}
      <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
        {FORM_TYPES.map((t) => (
          <StatCard
            key={t}
            label={t}
            value={null}
            info={
              t === FORM_TYPES[0] ? (
                <p className="m-0">
                  Every submission here is an Engaged conversion. &ldquo;estimate&rdquo; is not a
                  form type on this page and never will be — estimates go to the app and appear in
                  the Hub only as Qualified numbers synced back from it.
                </p>
              ) : undefined
            }
          />
        ))}
      </div>

      {/* ── the submission log ── */}
      <Panel
        flush
        title="Submission log"
        right={
          <span className="inline-flex items-center gap-1.5">
            <Meta>newest first</Meta>
            <InfoPopover label="Why the asset-delivered column exists" align="right">
              <p className="m-0">
                An unconfirmed toolkit delivery is a broken promise to an agent — the
                asset-delivered column exists so that promise is checked, not assumed.
              </p>
            </InfoPopover>
          </span>
        }
      >
        <EmptyLog
          columns={["Received", "Form type", "Contact", "Market", "Channel", "Asset delivered"]}
          fedBy="/api/intake"
        />
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}
