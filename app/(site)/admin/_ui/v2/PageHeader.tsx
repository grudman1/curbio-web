// Title + freshness timestamp. The date-range control itself lives in the
// shared topbar (AppShell — governs every /admin screen, out of scope for
// this redesign); this only owns what's page-specific: the title and the
// plain-text "as of" line the brief asks for in place of the old dashed
// snapshot badge.

export function PageHeader({
  title,
  freshness,
  right,
}: {
  title: string;
  /** "Data through Aug 14" — plain text, no badge. */
  freshness?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <h1 className="m-0 font-ui2 text-ui2-title font-semibold text-ui2-text">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {freshness && <span className="font-ui2 text-ui2-caption text-ui2-text-muted">{freshness}</span>}
        {right}
      </div>
    </header>
  );
}
