import type { Metadata } from "next";
import { StatCard } from "@/app/(site)/admin/_ui/StatCard";
import { EVENT_FORMATS, HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { readOpsEvents, type OpsEvent } from "@/lib/opsEvents";
import { DefinitionsInfo, HubPageHeader, NeedsBlock } from "../hubUi";
import { EventLogPanel } from "./EventLogPanel";

export const metadata: Metadata = {
  title: "Events · Marketing — Curbio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const surface = HUB_SURFACE_BY_SLUG.events;

export default async function EventsPage() {
  const result = await readOpsEvents();
  const all: OpsEvent[] = result.configured ? result.records : [];
  const events = all.filter((e) => !e.archived);

  const byFormat = new Map<string, number>();
  for (const e of events) byFormat.set(e.format, (byFormat.get(e.format) ?? 0) + 1);

  return (
    <>
      <HubPageHeader surface={surface} right={<DefinitionsInfo align="right" />} />

      {/* ── counts by format ── */}
      <div className="mb-ops-gap grid grid-cols-2 gap-ops-gap lg:grid-cols-4">
        {EVENT_FORMATS.map((f) => {
          const n = byFormat.get(f) ?? 0;
          return (
            <StatCard
              key={f}
              label={f.replace("_", " ")}
              value={n === 0 ? null : n}
              note={n === 0 ? "none logged" : "all logged events"}
            />
          );
        })}
      </div>

      <EventLogPanel />

      <NeedsBlock surface={surface} />
    </>
  );
}
