"use client";

import { useState } from "react";
import type { ContentEntry } from "@/config/contentRegistry";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { Badge } from "@/app/(site)/admin/_ui/primitives";

type ContentTypeColor = Record<string, "info" | "neutral">;

const TYPE_COLORS: ContentTypeColor = {
  blog: "info",
  newsletter: "neutral",
  "case study": "neutral",
  "one-pager": "neutral",
  video: "neutral",
};

export function PublishedTable({ entries }: { entries: ContentEntry[] }) {
  const [sortBy, setSortBy] = useState<"date" | "type">("date");

  const sorted = [...entries].sort((a, b) => {
    if (sortBy === "date") return b.publishedAt.localeCompare(a.publishedAt);
    if (sortBy === "type") return a.type.localeCompare(b.type);
    return 0;
  });

  return (
    <div className="space-y-4">
      <h2 className="m-0 font-sans text-ops-card-title font-semibold text-content">Published</h2>
      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Type</Th>
            <Th>Published</Th>
            <Th>Location</Th>
            <Th>Campaign</Th>
            <Th align="right">Leads</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <Tr key={entry.id}>
              <Td className="font-sans font-semibold text-content">{entry.title}</Td>
              <Td>
                <Badge tone={TYPE_COLORS[entry.type] || "neutral"}>{entry.type}</Badge>
              </Td>
              <Td className="text-ops-label text-content-muted">{entry.publishedAt}</Td>
              <Td className="text-content-muted text-sm">
                {entry.location.startsWith("http") ? (
                  <a href={entry.location} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    {new URL(entry.location).hostname}
                  </a>
                ) : (
                  entry.location
                )}
              </Td>
              <Td className="text-content-muted">{entry.campaignTag || "—"}</Td>
              <Td align="right" className="text-content-muted">
                —
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
