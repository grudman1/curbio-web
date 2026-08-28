import { Eyebrow } from "./primitives";

// "Why this number?" — collapsed by default.
//
// The third tier of the prose budget. A chip carries a state, an InfoPopover
// carries a sentence, and this carries the full reasoning for people who need
// it — reviewers, auditors, whoever inherits this.
//
// Native <details>, deliberately: it needs no JS, is keyboard-accessible and
// screen-reader-announced for free, and unlike the popover it is FINE for this
// to push content down, because opening it is a deliberate act of reading
// rather than a glance.

export function Disclosure({
  summary = "Why this number?",
  children,
}: {
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-t border-app-border pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="inline-block flex-none text-content-subtle transition-transform duration-base ease-out group-open:rotate-90 motion-reduce:transition-none"
        >
          ›
        </span>
        <Eyebrow className="cursor-pointer">{summary}</Eyebrow>
      </summary>
      <div className="mt-2 max-w-[70ch] font-sans text-ops-label leading-[1.6] text-content-muted [&_code]:font-mono [&_code]:text-ops-micro [&_p]:m-0 [&_p+p]:mt-2.5">
        {children}
      </div>
    </details>
  );
}
