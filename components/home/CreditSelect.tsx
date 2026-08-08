"use client";

import { useEffect, useId, useRef, useState } from "react";

// Credit-band picker, styled to match Notable's own (Gavin, Aug 8 —
// notablehome.com/curbio/apply).
//
// WHY THIS IS NOT A <select>. It was one, and it could not be made to match:
// a native select renders its popup with the OS, so on macOS it came out as a
// grey system menu with a checkmark column while Notable's is a white card
// with generously spaced, hairline-separated rows. No amount of CSS reaches
// inside that popup. The list had to be real DOM.
//
// That trade is only worth making if the keyboard contract survives, so this
// implements the listbox pattern properly rather than approximately:
//   • the trigger is a button with role=combobox, aria-expanded and
//     aria-controls, so it is announced as a collapsed listbox, not a button
//   • Up/Down/Home/End move an ACTIVE option without committing it, tracked
//     via aria-activedescendant — arrowing is not selecting
//   • Enter/Space commit, Escape cancels and restores focus to the trigger
//   • typing a letter jumps to the first band starting with it
//   • pointerdown outside closes; focus is returned to the trigger on close
//     so tab order is never lost
//
// The value it produces is unchanged: the band floor as a string, which the
// estimator sends to Notable as `fico`.

export type CreditBand = { label: string; value: number };

export function CreditSelect({
  bands,
  value,
  onChange,
  id,
  labelledBy,
}: {
  bands: CreditBand[];
  value: string;
  onChange: (v: string) => void;
  id: string;
  labelledBy: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = bands.findIndex((b) => String(b.value) === value);
  const selectedLabel = selectedIndex >= 0 ? bands[selectedIndex].label : "";

  // Close on any pointerdown outside. pointerdown rather than click so the
  // list is gone before a click lands on whatever is underneath.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  // Keep the active row in view when arrowing through a scrolled list.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openWith = (index: number) => {
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  };

  const commit = (index: number) => {
    onChange(String(bands[index].value));
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openWith(selectedIndex);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active >= 0) commit(active);
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, bands.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActive(bands.length - 1);
      return;
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const i = bands.findIndex((b) => b.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div className="dpl2-sel" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-labelledby={`${labelledBy} ${id}`}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        className={`dpl2-sel-btn${open ? " is-open" : ""}${selectedLabel ? "" : " is-empty"}`}
        onClick={() => (open ? setOpen(false) : openWith(selectedIndex))}
        onKeyDown={onKeyDown}
      >
        <span className="dpl2-sel-value">{selectedLabel || "Select…"}</span>
        <svg className="dpl2-sel-caret" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className="dpl2-sel-list" id={listId} role="listbox" ref={listRef} tabIndex={-1}>
          {bands.map((b, i) => (
            <li
              key={b.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={String(b.value) === value}
              className={`dpl2-sel-opt${i === active ? " is-active" : ""}`}
              // pointerdown, not click: mousedown would blur the trigger first
              // and the outside-click handler would close before the choice
              // registered.
              onPointerDown={(e) => {
                e.preventDefault();
                commit(i);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {b.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
