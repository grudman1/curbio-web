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
      className="hidden h-[30px] cursor-pointer items-center gap-1.5 rounded-md border border-app-border-strong bg-app-card px-2.5 font-sans text-ops-label font-semibold text-content-subtle transition-colors duration-fast ease-out hover:bg-app-well hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent sm:inline-flex"
    >
      <Icon name="search" size={13} />
      <kbd className="font-sans text-ops-micro font-bold">⌘K</kbd>
    </button>
  );
}
