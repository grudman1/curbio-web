import type { Metadata } from "next";
import { FORM_REGISTRY } from "@/config/formRegistry";
import { PageHeader } from "@/app/(site)/admin/_ui/AppShell";
import { FormCard } from "@/app/(site)/admin/_ui/FormCard";

// Forms — a registry, like Pages: a card per active form (name, submission
// count, delivery status, last submission), each opening onto its own detail
// view. NOT a feed — the global submission log that used to live here is
// Leads' job (/admin/leads), so there is no table on this screen at all.
export const metadata: Metadata = {
  title: "Forms · Ops — Curbio",
  robots: { index: false, follow: false },
};

export default function FormsRegistryPage() {
  return (
    <>
      <PageHeader title="Forms" subtitle={`${FORM_REGISTRY.length} form types`} />
      <div className="grid grid-cols-1 gap-ops-gap sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FORM_REGISTRY.map((entry) => (
          <FormCard key={entry.slug} entry={entry} />
        ))}
      </div>
    </>
  );
}
