import { OpsCard, OpsMetric } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { Table, Td, Th, Thead } from "@/app/(site)/admin/_ui/v2/DataTable";
import { HealthList } from "@/app/(site)/admin/_ui/v2/HealthDot";
import { decidePromotion } from "./actions";
import type { PromotionEntry, UnknownEvent } from "@/lib/contactStore";

// The promotion gate: people Instantly marked Interested who are not yet
// active subscribers in ActiveCampaign.
//
// Every row is approved by hand. There is no bulk action and no auto-approve,
// because Instantly's Interested label is AI-generated from reply content and
// AI misreads sarcasm and soft brush-offs. A wrong promotion degrades the warm
// list and eventually burns the sending domain — which is why AC's domain is
// protected and Instantly runs on Instantly-provided ones.
//
// Rows show the reply text so the decision is made on what the person actually
// wrote, not on the label a model attached to it.

const UNWIRED_AC_WRITE =
  "Decision recorded, not yet pushed to ActiveCampaign — AC has seven lists and an Instantly lead carries no market, so the target list is undecided.";

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 16).replace("T", " ");
}

export function PromotionScreen({
  queue,
  unknownEvents,
  seenEventTypes,
}: {
  queue: PromotionEntry[];
  unknownEvents: UnknownEvent[];
  seenEventTypes: string[];
}) {
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-4 md:mb-6 md:gap-6 lg:grid-cols-4">
        <OpsMetric label="Awaiting review" value={String(queue.length)} />
        <OpsMetric
          label="Event types seen"
          value={seenEventTypes.length ? String(seenEventTypes.length) : "—"}
          unwired={
            seenEventTypes.length
              ? undefined
              : { tooltip: "No Instantly delivery yet — the vocabulary is learned from live events." }
          }
        />
        <OpsMetric
          label="Unrecognised events"
          value={unknownEvents.length ? String(unknownEvents.length) : "0"}
        />
        <OpsMetric
          label="Promoted to AC"
          value="—"
          unwired={{ tooltip: UNWIRED_AC_WRITE }}
        />
      </div>

      <OpsCard
        title="Awaiting promotion"
        titleTooltip="Instantly marked Interested, not yet an active AC subscriber. One row per person, showing the earliest qualifying event — global lead sync fires the same reply across every campaign the person is in."
      >
        <Table>
          <Thead>
            {["Contact", "Company", "Campaign", "When", "Reply", ""].map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </Thead>
          <tbody>
            {queue.length === 0 ? (
              <tr className="ops-tbody-row">
                <Td muted colSpan={6} title="Nobody is waiting — the queue fills from the Instantly webhook.">
                  —
                </Td>
              </tr>
            ) : (
              queue.map((e) => (
                <tr key={e.email} className="ops-tbody-row">
                  <Td>
                    {[e.firstName, e.lastName].filter(Boolean).join(" ") || e.email}
                    <div className="ops-subtle">{e.email}</div>
                  </Td>
                  <Td muted>{e.companyName || "—"}</Td>
                  <Td muted>{e.campaign || "—"}</Td>
                  <Td muted>{fmt(e.at)}</Td>
                  <Td muted title={e.replyText ?? undefined}>
                    {e.replyText ? e.replyText.slice(0, 90) : "—"}
                  </Td>
                  <Td>
                    <form action={decidePromotion} style={{ display: "flex", gap: 8 }}>
                      <input type="hidden" name="email" value={e.email} />
                      <button type="submit" name="decision" value="approved" className="ops-btn ops-btn--primary">
                        Approve
                      </button>
                      <button
                        type="submit"
                        name="decision"
                        value="dismissed"
                        className="ops-btn"
                      >
                        Dismiss
                      </button>
                    </form>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </OpsCard>

      <OpsCard
        title="Unrecognised events"
        titleTooltip="Event types the parser does not know. The raw payload is stored regardless; this is what puts it in front of a human instead of leaving it in a key nobody lists."
      >
        <Table>
          <Thead>
            {["Event type", "Received", "Raw key", "Preview"].map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </Thead>
          <tbody>
            {unknownEvents.length === 0 ? (
              <tr className="ops-tbody-row">
                <Td muted colSpan={4} title="Nothing unrecognised — every event so far parsed cleanly.">
                  —
                </Td>
              </tr>
            ) : (
              unknownEvents.map((u, i) => (
                <tr key={`${u.rawKey}-${i}`} className="ops-tbody-row">
                  <Td>{u.eventType ?? "(unparseable)"}</Td>
                  <Td muted>{fmt(u.receivedAt)}</Td>
                  <Td muted>{u.rawKey ?? "—"}</Td>
                  <Td muted title={u.preview}>
                    {u.preview.slice(0, 80)}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </OpsCard>

      <HealthList
        items={[
          { label: "AC write on approve", tooltip: UNWIRED_AC_WRITE },
          {
            label: "App deals",
            tooltip:
              "RFQ and Customer are not computed — the App snapshot in this repo is PII-stripped and carries no agent email, so deals cannot be joined to a person.",
          },
        ]}
      />
    </>
  );
}
