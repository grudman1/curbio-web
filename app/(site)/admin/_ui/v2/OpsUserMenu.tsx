"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { firstNameFrom } from "../userDisplay";

// Account chip + menu. Replaces the header's flat avatar / email / "Sign out"
// row: three controls competing at the same weight, where only one of them is
// ever used. The chip is now identity, and the actions are behind it.
//
// The chip shows the FIRST NAME (the roster in userDisplay.ts), and the menu
// shows the full email — the name is what you recognise at a glance, the
// address is what you check when you need to know exactly which account you
// are in.

export function OpsUserMenu({
  email,
  signOut,
}: {
  email: string | null;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const local = (email ?? "").split("@")[0] || "?";
  const initials = local.slice(0, 2).toUpperCase();
  const name = email ? firstNameFrom(email) : "Signed in";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Account — ${email ?? "signed in"}`}
        className="flex cursor-pointer items-center gap-2 rounded-full border bg-transparent py-1 pl-1 pr-2.5 transition-colors"
        style={{ borderColor: "var(--ops-border)" }}
      >
        <span
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: "var(--ops-brand)" }}
        >
          {initials}
        </span>
        <span className="hidden text-[14px] font-medium sm:inline" style={{ color: "var(--ops-text)" }}>
          {name}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{ color: "var(--ops-text-subtle)" }}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="ops-pop absolute right-0 z-overlay mt-2 w-[240px]">
          <p className="px-2.5 pb-2 pt-1">
            <span className="block text-[14px] font-semibold" style={{ color: "var(--ops-text)" }}>
              {name}
            </span>
            <span className="ops-subtle block truncate text-[12px]">{email ?? "Signed in"}</span>
          </p>
          <div className="my-1 h-px" style={{ background: "var(--ops-divider)" }} />
          <Link href="/admin/settings" className="ops-pop-item" onClick={() => setOpen(false)}>
            Settings
          </Link>
          {/* A form, not a client handler: signOut is a server action and
              nothing here needs state. */}
          <form action={signOut}>
            <button type="submit" className="ops-pop-item">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
