"use client";

// The right-side drawer — where anything too big for an inline cell gets
// created or edited (spend, events, partnerships, HSM weeks). Never a form
// pinned under content, never a centre modal for data entry.
//
// Semantics: native <dialog> (focus trap, Esc, top layer, inert background
// for free), styled as a right panel. Esc and backdrop-click close; the
// caller owns open state.

import { useEffect, useRef } from "react";
import { Icon } from "./Icon";

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 440,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Sticky footer — the action row (primary save, ghost cancel, archive). */
  footer?: React.ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault(); // keep open-state ownership with the caller
        onClose();
      }}
      onClick={(e) => {
        // <dialog> receives backdrop clicks itself; anything inside the panel
        // has a real target inside the flex column.
        if (e.target === ref.current) onClose();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-app-scrim open:flex open:justify-end"
    >
      <div
        style={{ width, maxWidth: "calc(100vw - 40px)" }}
        className="flex h-full flex-col border-l border-app-border bg-app-card shadow-app-drawer motion-safe:animate-[drawer-in_200ms_var(--easing-out)] motion-reduce:animate-none"
      >
        <header className="flex flex-none items-center gap-3 border-b border-app-border px-5 py-3.5">
          <h2 className="m-0 min-w-0 flex-1 truncate font-sans text-ops-card-title font-semibold text-content">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-[28px] w-[28px] flex-none cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-content-subtle transition-colors duration-fast ease-out hover:bg-app-well hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Icon name="x" size={14} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex flex-none items-center gap-2.5 border-t border-app-border px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}

/** Two-column field grid for drawer bodies; fields span with `col-span-2`. */
export function DrawerGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">{children}</div>;
}
