"use client";

import { useState } from "react";
import { Meta, Panel, SUBTLE, mono } from "../../ui";
import { CHANNEL_FUNNEL_ORDER } from "@/config/marketingHub";
import { ConsequenceNote } from "../hubUi";

// Live UTM builder — the one Settings tool that needs no data source. The
// utm_source list is the closed channel vocabulary from lib/channels.ts (via
// the funnel ordering); anything outside it would be mapped back to `direct`
// at the boundary, so the builder simply doesn't offer anything outside it.

const field: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "8px 10px",
  background: "var(--color-surface-raised)",
  width: "100%",
};

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SUBTLE,
  display: "block",
  marginBottom: 6,
};

export function UtmBuilder() {
  const [base, setBase] = useState("https://sell.curbio.com/");
  const [source, setSource] = useState<string>("email");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");

  let preview = "";
  try {
    const url = new URL(base);
    if (source) url.searchParams.set("utm_source", source);
    if (medium) url.searchParams.set("utm_medium", medium);
    if (campaign) url.searchParams.set("utm_campaign", campaign);
    if (content) url.searchParams.set("utm_content", content);
    preview = url.toString();
  } catch {
    preview = "— enter a valid base URL —";
  }

  return (
    <Panel title="UTM builder" right={<Meta>live</Meta>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ gridColumn: "1 / -1" }}>
          <span style={fieldLabel}>Base URL</span>
          <input type="url" value={base} onChange={(e) => setBase(e.target.value)} style={field} />
        </label>
        <label>
          <span style={fieldLabel}>utm_source (channel)</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} style={field}>
            {CHANNEL_FUNNEL_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={fieldLabel}>utm_medium</span>
          <input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="newsletter" style={field} />
        </label>
        <label>
          <span style={fieldLabel}>utm_campaign</span>
          <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="sept-toolkit" style={field} />
        </label>
        <label>
          <span style={fieldLabel}>utm_content</span>
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="cta-a" style={field} />
        </label>
      </div>
      <p
        style={{
          fontFamily: mono,
          fontSize: 12.5,
          color: "var(--color-text)",
          background: "color-mix(in srgb, var(--color-border) 30%, transparent)",
          borderRadius: "var(--radius-lg)",
          padding: "10px 12px",
          margin: "14px 0 0",
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}
      >
        {preview}
      </p>
      <ConsequenceNote>
        utm_source values outside the nine channels map back to direct at the boundary —
        the builder only offers the closed list, so a link built here always attributes.
      </ConsequenceNote>
    </Panel>
  );
}
