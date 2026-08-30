"use client";

import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { EmptyState } from "@/app/(site)/admin/_ui/v2/EmptyState";

export function InFlightTable() {
  // Placeholder: no drafts seeded yet
  const drafts: Array<{
    id: string;
    title: string;
    type: string;
    targetDate?: string;
  }> = [];

  if (drafts.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="m-0 font-sans text-ops-card-title font-semibold text-content">In Flight</h2>
        <EmptyState headline="No drafts in progress" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="m-0 font-sans text-ops-card-title font-semibold text-content">In Flight</h2>
      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Type</Th>
            <Th>Target date</Th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((draft) => (
            <Tr key={draft.id}>
              <Td className="font-sans font-semibold text-content">{draft.title}</Td>
              <Td className="text-content-muted">{draft.type}</Td>
              <Td className="text-content-muted">{draft.targetDate || "—"}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
