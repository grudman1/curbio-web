import { InfoPopover } from "@/app/(site)/admin/_ui/InfoPopover";
import { Meta, Panel } from "@/app/(site)/admin/_ui/primitives";
import { StatCard } from "@/app/(site)/admin/_ui/StatCard";
import { COLD_GRADUATION_RULE, CONTACT_STATUSES, HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { DefinitionsInfo, EmptyLog, HubPageHeader, NeedsBlock } from "../hubUi";

// Split out of page.tsx: a Next.js page file may only export the blessed set
// (default, metadata, generateStaticParams, dynamic, ...) — an arbitrary
// named export like this one fails `next build`'s page-type validation even
// though plain `tsc --noEmit` doesn't catch it. Email's Database tab
// (app/(site)/admin/(dashboard)/channels/email/database/page.tsx) imports
// this directly with a headingOverride (see HubPageHeader's titleOverride);
// page.tsx's default export calls it with none, so /marketing/contacts is
// unaffected and still reads "Contacts".

const surface = HUB_SURFACE_BY_SLUG.contacts;

export function ContactsScreen({ headingOverride }: { headingOverride?: string } = {}) {
  return (
    <>
      <HubPageHeader surface={surface} titleOverride={headingOverride} right={<DefinitionsInfo align="right" />} />

      {/* ── status mix — unwired, so every value is an em-dash ── */}
      <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-5">
        {CONTACT_STATUSES.map((s, i) => (
          <StatCard
            key={s}
            label={s}
            value={null}
            info={i === 0 ? <p className="m-0">The graduation rule: {COLD_GRADUATION_RULE}</p> : undefined}
          />
        ))}
      </div>

      {/* ── the contact table ── */}
      <Panel
        flush
        title="Contacts"
        right={
          <span className="inline-flex items-center gap-1.5">
            <Meta>newest first</Meta>
            <InfoPopover label="Why webhook health matters here" align="right">
              <p className="m-0">
                A silent Instantly webhook means positive replies stop graduating contacts out of
                cold — and it has no other symptom.
              </p>
            </InfoPopover>
          </span>
        }
      >
        <EmptyLog
          columns={["Contact", "Market", "Status", "Channel", "Last activity", "Owner"]}
          fedBy="the contact store (ActiveCampaign and Instantly imports)"
        />
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}
