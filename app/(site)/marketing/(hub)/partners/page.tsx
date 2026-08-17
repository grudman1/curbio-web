import type { Metadata } from "next";
import { Meta, Panel } from "@/app/(site)/admin/(dashboard)/ui";
import { HUB_SURFACE_BY_SLUG, PARTNER_SEED } from "@/config/marketingHub";
import { DASH, HubPageHeader, NeedsBlock, td, tdDash, th } from "../hubUi";

export const metadata: Metadata = {
  title: "Partners · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.partners;

export default function PartnersPage() {
  return (
    <>
      <HubPageHeader surface={surface} />

      {/* ── the call plan: real relationships, names only — no numbers ── */}
      <Panel title="Call plan" right={<Meta>sorted by next step date</Meta>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Partner</th>
                <th style={th}>Stage</th>
                <th style={th}>Next step</th>
                <th style={th}>Next step date</th>
                <th style={th}>Owner</th>
                <th style={{ ...th, textAlign: "right" }}>Agents reached</th>
                <th style={{ ...th, textAlign: "right" }}>Meetings</th>
              </tr>
            </thead>
            <tbody>
              {PARTNER_SEED.map((p) => (
                <tr key={p.name}>
                  <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
                  <td style={td}>{p.stage}</td>
                  <td style={tdDash}>{DASH}</td>
                  <td style={tdDash}>{DASH}</td>
                  <td style={tdDash}>{DASH}</td>
                  <td style={{ ...tdDash, textAlign: "right" }}>{DASH}</td>
                  <td style={{ ...tdDash, textAlign: "right" }}>{DASH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}
