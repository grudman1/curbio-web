import type { WaitlistEntry } from "@/lib/adminWaitlist";
import { maskEmail } from "@/lib/adminLeads";
import { DASH, Eyebrow, Panel } from "../../_ui/primitives";
import { EmptyState } from "../../_ui/EmptyState";
import { InfoPopover } from "../../_ui/InfoPopover";

// The waitlist, shown as a filter of Leads rather than a tab beside it.
//
// The two STORES stay separate (lib/adminWaitlist.ts) because the things are
// separate: a waitlist entry is an out-of-area signup that never enters
// leads:v1 and never reaches the CRM. It is the expansion-demand signal, not
// a lead. One filter row over two sources — not a merge of them.

export function WaitlistPanel({
  entries,
  error,
  configured,
}: {
  entries: WaitlistEntry[];
  error: string | null;
  configured: boolean;
}) {
  if (!configured) {
    return <EmptyState headline="Upstash isn't configured in this environment, so there's no waitlist store to read." />;
  }
  if (error) {
    return <EmptyState headline={`Waitlist store unreadable — ${error}. This is a read failure, not proof the waitlist is empty.`} />;
  }
  if (entries.length === 0) {
    return <EmptyState headline="No out-of-area signups yet." />;
  }

  return (
    <Panel
      title="Waitlist"
      right={
        <span className="inline-flex items-center gap-1.5">
          <InfoPopover label="What the waitlist is" align="right">
            Out-of-area signups. They are kept out of <code className="font-mono">leads:v1</code> and
            out of the CRM entirely — this is the expansion-demand signal, not a lead, and counting
            it as one would inflate every conversion number on the site.
          </InfoPopover>
          <span className="font-sans text-ops-label tabular-nums text-content-subtle">
            {entries.length}
          </span>
        </span>
      }
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["When", "Contact", "ZIP", "Detected", "Source"].map((h) => (
              <th key={h} className="h-ops-row-head border-b border-edge-strong pr-4 text-left align-bottom last:pr-0">
                <Eyebrow>{h}</Eyebrow>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.leadId ?? `${e.email}-${i}`} className="h-ops-row">
              <td className="border-b border-edge pr-4 font-sans text-ops-table tabular-nums text-content-muted">
                {e.submittedAt ? e.submittedAt.slice(5, 16).replace("T", " ") : DASH}
              </td>
              <td className="border-b border-edge pr-4 font-sans text-ops-table text-content">
                {maskEmail(e.email)}
              </td>
              <td className="border-b border-edge pr-4 font-mono text-ops-table tabular-nums text-content-muted">
                {e.zip || DASH}
              </td>
              <td className="border-b border-edge pr-4 font-sans text-ops-table text-content-muted">
                {[e.detectedCity, e.detectedRegion].filter(Boolean).join(", ") || DASH}
              </td>
              <td className="border-b border-edge font-sans text-ops-table text-content-muted">
                {e.utm_source || e.firstTouchChannel || DASH}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
