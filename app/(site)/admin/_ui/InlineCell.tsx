"use client";

// The workhorse of the overhaul: click-to-edit table cells. Click (or Enter)
// opens the editor in place, Enter saves, Esc cancels, blur saves. The cell
// updates optimistically, flashes the saved tint, and reverts with an error
// toast if the write fails.
//
// Honesty rules carry through: `value === null` renders the em-dash (never
// zero), and clearing the field saves null ("never entered"), not 0.

import { useEffect, useRef, useState } from "react";
import { DASH } from "./primitives";
import { useToast } from "./Toast";

type SaveResult = { ok: true } | { ok: false; error: string };

function displayClass(pending: boolean, flash: boolean): string {
  return [
    "inline-flex min-h-[24px] w-full cursor-text items-center rounded-md px-1.5 -mx-1.5 py-0.5",
    "border border-transparent transition-colors duration-fast ease-out",
    "hover:border-app-border-strong hover:bg-app-card",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
    pending ? "opacity-60" : "",
    flash ? "motion-safe:animate-[cell-saved_900ms_var(--easing-out)]" : "",
  ].join(" ");
}

const EDITOR =
  "w-full rounded-md border border-app-border-strong bg-app-card px-1.5 py-0.5 -mx-1.5 font-sans text-ops-table text-content focus:outline focus:outline-2 focus:outline-accent";

/**
 * Number cell. `onSave` is the server action wrapper: it receives the new
 * value (null = cleared) and returns {ok} or {ok:false, error}.
 */
export function InlineNumberCell({
  value,
  onSave,
  format = (n) => n.toLocaleString("en-US"),
  align = "right",
  suffix,
  disabled = false,
  label,
  money = false,
}: {
  value: number | null;
  onSave: (next: number | null) => Promise<SaveResult>;
  format?: (n: number) => string;
  align?: "left" | "right";
  /** Rendered after the value in display mode (e.g. the `logged` tag). */
  suffix?: React.ReactNode;
  disabled?: boolean;
  /** Accessible name: "Mailings sent — Christine Harvey". */
  label: string;
  /** Dollar amounts: allows cents (2dp) instead of whole numbers. */
  money?: boolean;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState<number | null>(value);
  const [pending, setPending] = useState(false);
  const [flash, setFlash] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // A router.refresh() after another row's save may hand down fresher props.
  useEffect(() => setShown(value), [value]);

  function open() {
    if (disabled || pending) return;
    setDraft(shown === null ? "" : String(shown));
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function commit() {
    setEditing(false);
    const trimmed = draft.trim().replace(/^\$/, "").replace(/,/g, "");
    let next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0 || (!money && !Number.isInteger(next)))) {
      toast("error", money ? `${label}: enter an amount in dollars.` : `${label}: enter a whole number, or clear the field.`);
      return;
    }
    if (next !== null && money) next = Math.round(next * 100) / 100;
    if (next === shown) return;
    const prev = shown;
    setShown(next); // optimistic
    setPending(true);
    const result = await onSave(next);
    setPending(false);
    if (result.ok) {
      setFlash((f) => f + 1);
    } else {
      setShown(prev);
      toast("error", result.error);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        aria-label={label}
        type="number"
        min={0}
        step={money ? "0.01" : 1}
        inputMode={money ? "decimal" : "numeric"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
        }}
        className={`${EDITOR} ${align === "right" ? "text-right" : ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Edit ${label}`}
      title={disabled ? undefined : "Click to edit"}
      onClick={open}
      onFocus={undefined}
      disabled={disabled}
      key={flash} // remounts to restart the saved-flash animation
      className={`${displayClass(pending, flash > 0)} ${align === "right" ? "justify-end text-right" : ""} ${
        disabled ? "cursor-default hover:border-transparent hover:bg-transparent" : ""
      }`}
    >
      <span className={`tabular-nums ${shown === null ? "text-content-subtle" : "text-content"}`}>
        {shown === null ? DASH : format(shown)}
      </span>
      {shown !== null && suffix ? <span className="ml-1.5 inline-flex flex-none">{suffix}</span> : null}
    </button>
  );
}

/** Text cell — same contract, free text. Empty saves "" (or null via map). */
export function InlineTextCell({
  value,
  onSave,
  placeholder = DASH,
  disabled = false,
  label,
}: {
  value: string;
  onSave: (next: string) => Promise<SaveResult>;
  placeholder?: string;
  disabled?: boolean;
  label: string;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState(value);
  const [pending, setPending] = useState(false);
  const [flash, setFlash] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setShown(value), [value]);

  function open() {
    if (disabled || pending) return;
    setDraft(shown);
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next === shown) return;
    const prev = shown;
    setShown(next);
    setPending(true);
    const result = await onSave(next);
    setPending(false);
    if (result.ok) {
      setFlash((f) => f + 1);
    } else {
      setShown(prev);
      toast("error", result.error);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        aria-label={label}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
        }}
        className={EDITOR}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Edit ${label}`}
      title={disabled ? undefined : "Click to edit"}
      onClick={open}
      disabled={disabled}
      key={flash}
      className={`${displayClass(pending, flash > 0)} ${
        disabled ? "cursor-default hover:border-transparent hover:bg-transparent" : ""
      }`}
    >
      <span className={`truncate ${shown === "" ? "text-content-subtle" : "text-content"}`}>
        {shown === "" ? placeholder : shown}
      </span>
    </button>
  );
}

/** Select cell — closed lists (the outreach arm). Commits on change. */
export function InlineSelectCell({
  value,
  options,
  onSave,
  disabled = false,
  label,
  placeholder = DASH,
}: {
  value: string | null;
  options: readonly { key: string; label: string }[];
  onSave: (next: string) => Promise<SaveResult>;
  disabled?: boolean;
  label: string;
  placeholder?: string;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [shown, setShown] = useState(value);
  const [pending, setPending] = useState(false);
  const [flash, setFlash] = useState(0);

  useEffect(() => setShown(value), [value]);

  async function commit(next: string) {
    setEditing(false);
    if (next === shown) return;
    const prev = shown;
    setShown(next);
    setPending(true);
    const result = await onSave(next);
    setPending(false);
    if (result.ok) {
      setFlash((f) => f + 1);
    } else {
      setShown(prev);
      toast("error", result.error);
    }
  }

  if (editing) {
    return (
      <select
        autoFocus
        aria-label={label}
        defaultValue={shown ?? ""}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
        }}
        className={`${EDITOR} cursor-pointer`}
      >
        {shown === null && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    );
  }

  const current = options.find((o) => o.key === shown);
  return (
    <button
      type="button"
      aria-label={`Edit ${label}`}
      title={disabled ? undefined : "Click to edit"}
      onClick={() => !disabled && !pending && setEditing(true)}
      disabled={disabled}
      key={flash}
      className={`${displayClass(pending, flash > 0)} ${
        disabled ? "cursor-default hover:border-transparent hover:bg-transparent" : ""
      }`}
    >
      <span className={current ? "text-content" : "text-content-subtle"}>
        {current ? current.label : placeholder}
      </span>
    </button>
  );
}
