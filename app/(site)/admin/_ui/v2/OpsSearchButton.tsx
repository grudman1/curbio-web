"use client";

// The header's search affordance. It does not own a search box — it opens the
// command palette, which is already mounted app-wide and already the one place
// search lives.
//
// It opens it by dispatching the ⌘K the palette already listens for, rather
// than by exporting an imperative open() from CommandPalette. That keeps the
// palette owning its own state with no new cross-module coupling, and it means
// this button and the keyboard shortcut can never drift into two code paths
// that behave differently.

export function OpsSearchButton() {
  function openPalette() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  }

  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Search — opens the command palette"
      className="ops-field hidden min-w-[220px] cursor-pointer text-left md:flex"
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="9" cy="9" r="6" />
        <path d="M13.5 13.5 17 17" strokeLinecap="round" />
      </svg>
      <span className="flex-1">Search</span>
      <kbd className="ops-kbd">⌘K</kbd>
    </button>
  );
}
