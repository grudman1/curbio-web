"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/app/(site)/admin/_ui/Field";
import { Badge, Panel } from "@/app/(site)/admin/_ui/primitives";
import { CHANNEL_FUNNEL_ORDER } from "@/config/marketingHub";

// Live UTM builder — the one Settings tool that needs no data source. The
// utm_source list is the closed channel vocabulary from lib/channels.ts (via
// the funnel ordering); anything outside it would be mapped back to `direct`
// at the boundary, so the builder simply doesn't offer anything outside it.

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
    <Panel
      title="UTM builder"
      right={
        <span
          className="inline-flex items-center gap-1.5"
          title="utm_source values outside the nine channels map back to direct at the boundary — the builder only offers the closed list."
        >
          <Badge tone="good">live</Badge>
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
        <Field label="Base URL" className="col-span-2">
          <Input type="url" value={base} onChange={(e) => setBase(e.target.value)} />
        </Field>
        <Field label="utm_source (channel)">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            {CHANNEL_FUNNEL_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="utm_medium">
          <Input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="newsletter" />
        </Field>
        <Field label="utm_campaign">
          <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="sept-toolkit" />
        </Field>
        <Field label="utm_content">
          <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="cta-a" />
        </Field>
      </div>
      <p className="m-0 mt-3.5 break-all rounded-md bg-app-well px-3 py-2.5 font-mono text-[12.5px] leading-[1.5] text-content">
        {preview}
      </p>
    </Panel>
  );
}
