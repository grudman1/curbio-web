import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FORM_REGISTRY, FORM_REGISTRY_BY_SLUG } from "@/config/formRegistry";
import { PageHeader } from "@/app/(site)/admin/_ui/v2/PageHeader";
import { OpsCard } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { Table, Thead, Th, Td } from "@/app/(site)/admin/_ui/v2/DataTable";

// A form's own submission table lives HERE, not on the registry index — one
// form, one table, no duplicate global feed (Leads already owns that view).

export function generateStaticParams() {
  return FORM_REGISTRY.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${FORM_REGISTRY_BY_SLUG[slug]?.label ?? "Form"} · Forms · Ops — Curbio`,
    robots: { index: false, follow: false },
  };
}

export default async function FormDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = FORM_REGISTRY_BY_SLUG[slug];
  if (!entry) notFound();

  const columns = ["Received", "Contact", "Market", "Channel", ...(entry.deliversAsset ? ["Asset delivered"] : [])];

  return (
    <>
      <PageHeader
        title={entry.label}
        subtitle={entry.deliversAsset ? "delivers an asset on submit" : "no asset delivered"}
      />
      <OpsCard
        title="Submissions"
        titleTooltip={
          entry.deliversAsset
            ? "An unconfirmed delivery is a broken promise to an agent — the asset-delivered column exists so that promise is checked, not assumed."
            : undefined
        }
        ruled
      >
        <Table>
          <Thead>
            {columns.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </Thead>
          <tbody>
            <tr>
              <Td muted colSpan={columns.length}>
                No rows yet — fed by /api/intake.
              </Td>
            </tr>
          </tbody>
        </Table>
      </OpsCard>
    </>
  );
}
