"use client";

// The topbar's ⌘K affordance — the palette itself listens for the shortcut,
// so this just replays it for mouse users (and advertises that it exists).

import { Icon } from "./Icon";

export function PaletteHint() {
  return (
    <button
      type="button"
      aria-label="Open command palette"
      title="Jump to any screen (⌘K)"
      onClick={() =>
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
      }
      className="hidden cursor-pointer items-center gap-1.5 rounded-md border border-nav3-border bg-app-card px-2.5 py-2 font-sans text-[13px] font-medium text-nav3-muted-text transition-colors duration-fast ease-out hover:bg-app-well hover:text-nav3-hover-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent sm:inline-flex"
    >
      <Icon name="search" size={13} />
      <kbd className="font-sans text-ops-micro font-bold">⌘K</kbd>
    </button>
  );
}
