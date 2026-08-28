"use client";

import { useEffect, useId, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// The ⓘ that absorbs explanatory prose.
//
// THE PROSE BUDGET: no default view may carry a paragraph longer than two
// lines. Everything longer lives in here. This component is the reason the
// Experiments essay, the Leads footnotes and the Attribution definition can
// leave the default view WITHOUT the explanation being lost — the honesty
// rules those paragraphs encode are not negotiable, only their placement is.
//
// Native <details> would be simpler but cannot overlay, so a long note would
// push the table down on open — layout shift on a screen whose whole job is
// being scannable. This is a real popover: absolutely positioned, dismissed on
// Escape and outside click, and it never moves the content underneath.
// ─────────────────────────────────────────────────────────────────────────────

export function InfoPopover({
  label,
  children,
  align = "left",
}: {
  /** Accessible name — what this explains, e.g. "How views are counted". */
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span ref={wrap} className="relative inline-flex flex-none align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[15px] w-[15px] cursor-pointer items-center justify-center rounded-full border border-app-border bg-transparent font-sans text-[9.5px] font-bold leading-none text-content-subtle transition-colors duration-base ease-out hover:border-content hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className={`absolute top-[21px] z-overlay w-[280px] rounded-md border border-app-border bg-app-card p-3 font-sans text-ops-label leading-[1.5] text-content-muted shadow-overlay ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
