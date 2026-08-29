import type { Metadata } from "next";
import Link from "next/link";
import { FORM_REGISTRY } from "@/config/formRegistry";
import { PageHeader } from "@/app/(site)/admin/_ui/v2/PageHeader";
import { OpsCard } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { Table, Thead, Th, Tr, Td } from "@/app/(site)/admin/_ui/v2/DataTable";
import { HealthDot } from "@/app/(site)/admin/_ui/v2/HealthDot";

// Forms — the registry: one row per active form, each opening onto its own
// detail view. NOT a feed — the global submission log is Leads' job
// (/admin/leads), so there is no submission table on this screen.
//
// Every figure is an em-dash behind a HealthDot until /api/intake exists: the
// registry is real before the data is, and it says so with a dot rather than
// a sentence.
export const metadata: Metadata = {
  title: "Forms · Ops — Curbio",
  robots: { index: false, follow: false },
};

/** Em-dash for a value that does not exist. */
const DASH = "—";

const UNWIRED = "No submission store behind this yet — /api/intake is not built.";

export default function FormsRegistryPage() {
  return (
    <>
      <PageHeader title="Forms" subtitle={`${FORM_REGISTRY.length} form types`} />
      <OpsCard>
        <Table>
          <Thead>
            <Th>Form</Th>
            <Th>Asset</Th>
            <Th align="right">Submitted</Th>
            <Th align="right">Delivered</Th>
            <Th align="right">Last</Th>
          </Thead>
          <tbody>
            {FORM_REGISTRY.map((entry) => (
              <Tr key={entry.slug}>
                <Td>
                  <Link href={`/admin/site/forms/${entry.slug}`} className="ops-foot-link">
                    {entry.label}
                  </Link>
                </Td>
                <Td muted>{entry.deliversAsset ? "delivers an asset on submit" : "none"}</Td>
                <Td align="right" numeric>
                  <span className="inline-flex items-center gap-1.5">
                    <HealthDot tooltip={UNWIRED} />
                    {DASH}
                  </span>
                </Td>
                <Td align="right" numeric>
                  {entry.deliversAsset ? (
                    <span className="inline-flex items-center gap-1.5">
                      <HealthDot tooltip={UNWIRED} />
                      {DASH}
                    </span>
                  ) : (
                    <span className="ops-muted">n/a</span>
                  )}
                </Td>
                <Td align="right" numeric muted>
                  {DASH}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </OpsCard>
    </>
  );
}
