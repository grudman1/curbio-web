import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FORM_REGISTRY, FORM_REGISTRY_BY_SLUG } from "@/config/formRegistry";
import { PageHeader } from "@/app/(site)/admin/_ui/AppShell";
import { Panel } from "@/app/(site)/admin/_ui/primitives";
import { InfoPopover } from "@/app/(site)/admin/_ui/InfoPopover";
import { EmptyLog } from "@/app/(site)/admin/_ui/EmptyLog";

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
      <PageHeader title={entry.label} subtitle={entry.deliversAsset ? "delivers an asset on submit" : "no asset delivered"} />
      <Panel
        flush
        title="Submissions"
        right={
          entry.deliversAsset ? (
            <InfoPopover label="Why the asset-delivered column exists" align="right">
              <p className="m-0">
                An unconfirmed delivery is a broken promise to an agent — the column exists so
                that promise is checked, not assumed.
              </p>
            </InfoPopover>
          ) : undefined
        }
      >
        <EmptyLog columns={columns} fedBy="/api/intake" />
      </Panel>
    </>
  );
}
