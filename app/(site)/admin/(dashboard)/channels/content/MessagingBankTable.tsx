"use client";

import { useState } from "react";
import type { MessageLineEntry, MessageType, MessageStatus } from "@/config/messagingBank";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { Badge } from "@/app/(site)/admin/_ui/primitives";

type MessageTypeColor = Record<MessageType, "info" | "neutral">;
type MessageStatusColor = Record<MessageStatus, "good" | "warn" | "unknown">;

const TYPE_COLORS: MessageTypeColor = {
  "hero headline": "info",
  subhead: "info",
  CTA: "info",
  "email subject": "neutral",
  tagline: "neutral",
  "value prop": "neutral",
};

const STATUS_COLORS: MessageStatusColor = {
  live: "good",
  idea: "unknown",
  retired: "warn",
};

export function MessagingBankTable({ entries }: { entries: MessageLineEntry[] }) {
  const [localEntries, setLocalEntries] = useState<MessageLineEntry[]>(entries);
  const [filter, setFilter] = useState<{ type?: MessageType; status?: MessageStatus }>({});
  const [sortBy, setSortBy] = useState<"date" | "type" | "status">("date");

  const filtered = localEntries.filter((e) => {
    if (filter.type && e.type !== filter.type) return false;
    if (filter.status && e.status !== filter.status) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "date") return b.createdAt.localeCompare(a.createdAt);
    if (sortBy === "type") return a.type.localeCompare(b.type);
    if (sortBy === "status") return a.status.localeCompare(b.status);
    return 0;
  });

  const allTypes = Array.from(new Set(localEntries.map((e) => e.type)));
  const allStatuses = Array.from(new Set(localEntries.map((e) => e.status)));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="m-0 font-sans text-ops-card-title font-semibold text-content mb-3">
          Messaging Bank
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className="ops-badge ops-badge--neutral cursor-pointer"
            onClick={() => setFilter({})}
          >
            All
          </span>
          {allTypes.map((t) => (
            <span
              key={t}
              className={`ops-badge cursor-pointer ${filter.type === t ? "ops-badge--neutral" : "ops-badge--neutral opacity-50"}`}
              onClick={() => setFilter({ ...filter, type: filter.type === t ? undefined : t })}
            >
              {t}
            </span>
          ))}
          <span className="mx-2 text-content-muted">·</span>
          {allStatuses.map((s) => (
            <span
              key={s}
              className={`ops-badge cursor-pointer ${filter.status === s ? "ops-badge--neutral" : "ops-badge--neutral opacity-50"}`}
              onClick={() => setFilter({ ...filter, status: filter.status === s ? undefined : s })}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Line</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Used on</Th>
            <Th align="right">Added</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <Tr key={entry.id}>
              <Td className="max-w-sm truncate font-sans text-content">{entry.line}</Td>
              <Td>
                <Badge tone={TYPE_COLORS[entry.type]}>{entry.type}</Badge>
              </Td>
              <Td>
                <Badge tone={STATUS_COLORS[entry.status]}>{entry.status}</Badge>
              </Td>
              <Td className="text-content-muted">{entry.usedOn || "—"}</Td>
              <Td align="right" className="text-ops-label text-content-muted">
                {entry.createdAt}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
