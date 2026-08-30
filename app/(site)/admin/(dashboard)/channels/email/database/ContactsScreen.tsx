import { OpsCard, OpsMetric } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { SurfaceHeader, SurfaceHealth } from "@/app/(site)/admin/_ui/v2/SurfaceHeader";
import { Table, Td, Th, Thead } from "@/app/(site)/admin/_ui/v2/DataTable";
import {
  COLD_GRADUATION_RULE,
  CONTACT_STATUSES,
  DEFINITIONS_LINE,
  HUB_SURFACE_BY_SLUG,
} from "@/config/marketingHub";

// Split out of page.tsx: a Next.js page file may only export the blessed set
// (default, metadata, generateStaticParams, dynamic, ...) — an arbitrary
// named export like this one fails `next build`'s page-type validation even
// though plain `tsc --noEmit` doesn't catch it. Email's Database tab
// (app/(site)/admin/(dashboard)/channels/email/database/page.tsx) imports
// this directly with a headingOverride (see SurfaceHeader's titleOverride);
// page.tsx's default export calls it with none, so /marketing/contacts is
// unaffected and still reads "Contacts".
//
// No prose on this screen. The graduation rule and the Qualified/Engaged
// definitions ride on tooltips; the webhook-health warning that used to be an
// ⓘ popover is the contact table's title tooltip.

const surface = HUB_SURFACE_BY_SLUG.contacts;

const COLUMNS = ["Contact", "Market", "Status", "Channel", "Last activity", "Owner"];

const UNWIRED = "Not wired — fills from the contact store (ActiveCampaign and Instantly imports).";

export function ContactsScreen({ headingOverride }: { headingOverride?: string } = {}) {
  return (
    <>
      <SurfaceHeader surface={surface} titleOverride={headingOverride} />

      {/* ── status mix — unwired, so every value is an em-dash ── */}
      <div className="mb-4 grid grid-cols-2 gap-4 md:mb-6 md:gap-6 lg:grid-cols-5">
        {CONTACT_STATUSES.map((s, i) => (
          <OpsMetric
            key={s}
            label={s}
            value="—"
            unwired={{
              tooltip: i === 0 ? `${UNWIRED} Graduation rule: ${COLD_GRADUATION_RULE}` : UNWIRED,
            }}
          />
        ))}
      </div>

      {/* ── the contact table ── */}
      <OpsCard
        title="Contacts"
        titleTooltip={`Newest first · ${DEFINITIONS_LINE} A silent Instantly webhook means positive replies stop graduating contacts out of cold — and it has no other symptom.`}
      >
        <Table>
          <Thead>
            {COLUMNS.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </Thead>
          <tbody>
            <tr className="ops-tbody-row">
              <Td muted colSpan={COLUMNS.length} title={UNWIRED}>
                —
              </Td>
            </tr>
          </tbody>
        </Table>
      </OpsCard>

      <SurfaceHealth surface={surface} />
    </>
  );
}
