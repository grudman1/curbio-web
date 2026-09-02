import { OpsCard, OpsMetric } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { SurfaceHeader, SurfaceHealth } from "@/app/(site)/admin/_ui/v2/SurfaceHeader";
import { Table, Td, Th, Thead } from "@/app/(site)/admin/_ui/v2/DataTable";
import {
  COLD_GRADUATION_RULE,
  CONTACT_STATUSES,
  DEFINITIONS_LINE,
  HUB_SURFACE_BY_SLUG,
} from "@/config/marketingHub";
import { computeStatus, STATUS_LABEL, type ContactStatus } from "@/config/contactStore";
import type { ContactRecord } from "@/config/contactStore";
import type { StatusTransition } from "@/config/contactStore";

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
//
// NOW WIRED to the contact store (config/contactStore.ts). Status is COMPUTED
// per record on read, never stored — see computeStatus(). `unsubscribed` is the
// one status in CONTACT_STATUSES the store does not compute: the promotion
// gate's rules define five states and that is not one of them, so it stays an
// em-dash rather than being invented from AC's unsubscribe counts.

const surface = HUB_SURFACE_BY_SLUG.contacts;

const COLUMNS = ["Contact", "Company", "Status", "Sources", "First positive", "Updated"];

const UNWIRED = "Not wired — fills from the contact store (ActiveCampaign and Instantly imports).";
const UNCOMPUTED =
  "Not computed — the promotion gate defines five statuses and this is not one of them.";
/**
 * RFQ and Customer depend on the App, and the App snapshot in this repo is
 * PII-stripped — 852 deals, zero email addresses — so a deal cannot be joined
 * to a person at all.
 *
 * These render as em-dash, NOT as 0. Zero says "we looked and nobody
 * qualifies"; the truth is "we cannot look". A zero here would read as a real
 * measurement of a funnel stage that is simply unmeasured.
 */
const APP_UNWIRED =
  "Not wired — needs agent email on App deals. The snapshot in this repo is PII-stripped, so deals cannot be joined to a person.";
const APP_BACKED: ReadonlySet<string> = new Set(["rfq", "customer"]);

function sourceTags(r: ContactRecord): string {
  const t: string[] = [];
  if (r.sources.inInstantly) t.push("Instantly");
  if (r.sources.acActive) t.push("AC");
  if (r.sources.appDeal) t.push("App");
  return t.length ? t.join(" · ") : "—";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

export function ContactsScreen({
  headingOverride,
  contacts = [],
  transitions = [],
  storeReady = false,
}: {
  headingOverride?: string;
  contacts?: ContactRecord[];
  transitions?: StatusTransition[];
  storeReady?: boolean;
} = {}) {
  const counts = new Map<ContactStatus, number>();
  for (const c of contacts) {
    const s = computeStatus(c.sources);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }

  const rows = [...contacts]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 200);

  return (
    <>
      <SurfaceHeader surface={surface} titleOverride={headingOverride} />

      {/* ── status mix — computed per record, never stored ── */}
      <div className="mb-4 grid grid-cols-2 gap-4 md:mb-6 md:gap-6 lg:grid-cols-6">
        {CONTACT_STATUSES.map((s, i) => {
          const computed = s !== "unsubscribed" && !APP_BACKED.has(s);
          const value =
            computed && storeReady ? String(counts.get(s as ContactStatus) ?? 0) : "—";
          return (
            <OpsMetric
              key={s}
              label={STATUS_LABEL[s as ContactStatus] ?? "Unsubscribed"}
              value={value}
              unwired={
                value === "—"
                  ? {
                      tooltip: APP_BACKED.has(s)
                        ? APP_UNWIRED
                        : !computed
                          ? UNCOMPUTED
                          : i === 0
                          ? `${UNWIRED} Graduation rule: ${COLD_GRADUATION_RULE}`
                          : UNWIRED,
                    }
                  : undefined
              }
            />
          );
        })}
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
            {rows.length === 0 ? (
              <tr className="ops-tbody-row">
                <Td muted colSpan={COLUMNS.length} title={UNWIRED}>
                  —
                </Td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.email} className="ops-tbody-row">
                  <Td>{r.email}</Td>
                  <Td muted>{r.companyName || "—"}</Td>
                  <Td>{STATUS_LABEL[computeStatus(r.sources)]}</Td>
                  <Td muted>{sourceTags(r)}</Td>
                  <Td muted>{fmtDate(r.firstPositiveAt)}</Td>
                  <Td muted>{fmtDate(r.updatedAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </OpsCard>

      {/* ── transitions — the record that cannot be backfilled ── */}
      <OpsCard
        title="Status transitions"
        titleTooltip="Immutable, newest first. Campaign stats can be re-pulled from either API at any time; the moment a person changed status cannot. Written from the first send."
      >
        <Table>
          <Thead>
            {["Contact", "From", "To", "Campaign", "Source", "When"].map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </Thead>
          <tbody>
            {transitions.length === 0 ? (
              <tr className="ops-tbody-row">
                <Td
                  muted
                  colSpan={6}
                  title="No transitions recorded yet — the first arrives with the first live send."
                >
                  —
                </Td>
              </tr>
            ) : (
              transitions.slice(0, 100).map((t, i) => (
                <tr key={`${t.email}-${t.at}-${i}`} className="ops-tbody-row">
                  <Td>{t.email}</Td>
                  <Td muted>{t.from ? STATUS_LABEL[t.from] : "—"}</Td>
                  <Td>{STATUS_LABEL[t.to]}</Td>
                  <Td muted>{t.sourceCampaign || "—"}</Td>
                  <Td muted>{t.source}</Td>
                  <Td muted>{fmtDate(t.at)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </OpsCard>

      <SurfaceHealth surface={surface} />
    </>
  );
}
