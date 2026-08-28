"use client";

// Archived records, collapsed. Present on every write surface because
// "no deletes" is only credible if the archive is reachable.

import { IconButton } from "@/app/(site)/admin/_ui/DataTable";

export function ArchivedNote<T extends { id: string }>({
  records,
  label,
  isOwner,
  onRestore,
}: {
  records: T[];
  label: (r: T) => string;
  isOwner: boolean;
  onRestore: (id: string) => void;
}) {
  if (records.length === 0) return null;
  return (
    <details className="px-ops-panel py-3">
      <summary className="cursor-pointer list-none font-sans text-ops-label font-semibold text-content-subtle hover:text-content [&::-webkit-details-marker]:hidden">
        Archived ({records.length}) — records never delete ›
      </summary>
      <ul className="m-0 mt-2 list-none p-0">
        {records.map((r) => (
          <li
            key={r.id}
            className="flex h-[30px] items-center gap-2 border-b border-app-border font-sans text-ops-label text-content-muted last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate">{label(r)}</span>
            {isOwner && <IconButton icon="restore" label={`Restore ${label(r)}`} onClick={() => onRestore(r.id)} />}
          </li>
        ))}
      </ul>
    </details>
  );
}
