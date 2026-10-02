import type { MouseEvent } from "react";

// "Enter to win" / "Enter the giveaway" / "Get in touch": take the visitor to
// the entry card, smoothly, and put the cursor in the Name field.
//
// The link keeps its `href="#enter"`, so with JavaScript off — or before the
// page has hydrated — it still jumps to the card. With it, the jump is
// smooth (unless the visitor has asked their device for less motion), the
// sticky header's height is honoured through `scroll-padding-top`
// (giveaway.css), and the first field is focused.
//
// The focus happens INSIDE the tap, not after the scroll settles: a phone only
// raises the keyboard for a focus that comes straight from a touch. The scroll
// is already under way by then, so `preventScroll` stops the focus starting a
// second, competing jump.
//
// If the card is showing the confirmation rather than the form, there is no
// Name field; focus goes to the confirmation's heading instead, so a keyboard
// or screen-reader visitor lands where the scroll did.

export function goToEntry(event?: MouseEvent): void {
  // A Cmd/Ctrl/Shift/Alt-click or a middle-click is the visitor asking the
  // browser to do something else with the link; leave it alone.
  if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
  const card = document.getElementById("enter");
  if (!card) return; // not this page: let the link do what a link does
  event?.preventDefault();

  const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });

  const target = document.getElementById("gw-name") ?? card.querySelector<HTMLElement>("[tabindex='-1']");
  target?.focus({ preventScroll: true });
}
