import { Table, Th, Td } from "./DataTable";

// Moved out of marketing/(hub)/hubUi.tsx (2026-08 nav redesign): the Forms
// detail page (app/(site)/admin/(dashboard)/site/forms/[slug]/page.tsx) is
// the first admin screen to need this directly rather than via a whole-page
// re-export, so its canonical home is the admin design system, not the
// marketing hub's. hubUi.tsx re-exports it so its own tree's imports are
// unchanged.

/** An empty log: real columns, one honest line about where rows come from. */
export function EmptyLog({ columns, fedBy }: { columns: string[]; fedBy: string }) {
  return (
    <Table>
      <thead>
        <tr>
          {columns.map((c) => (
            <Th key={c}>{c}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <Td muted className="border-b-0" colSpan={columns.length}>
            No rows yet — this table fills from {fedBy}.
          </Td>
        </tr>
      </tbody>
    </Table>
  );
}
