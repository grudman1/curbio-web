"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getStoredUtms } from "@/lib/analytics";
import type { PublicGiveaway } from "@/config/giveaways";

// ─────────────────────────────────────────────────────────────────────────────
// The giveaway page's shared client state: which giveaway this is, and whether
// its entry period has ended.
//
// ── Open or closed ──────────────────────────────────────────────────────────
// The page is prerendered and served from the CDN, so the HTML a visitor gets
// was built some time before they asked for it. `initialClosed` is what the
// server believed at build time; it has to be the first client render too, or
// React would be hydrating markup that does not match. An effect then checks
// the clock and arms a timer for the closing instant, so a phone left open on
// the page at noon on Friday flips without a reload. A phone that was asleep at
// noon is checked again the moment it is woken (visibilitychange / pageshow),
// because a sleeping page's timers are not reliable.
//
// This decides what the page SAYS. It does not decide who is in the drawing:
// the submit endpoint stamps each entry against the server's clock, and the
// form uses the server's verdict — not this one — to choose its confirmation.
// A phone with the wrong time sees the wrong headline for a moment, never the
// wrong outcome.
//
// ── The <html> marker ───────────────────────────────────────────────────────
// `data-giveaway` scopes giveaway.css to this page (see that file for why it
// cannot simply be imported and trusted to stay here). It is set on mount and
// removed on unmount, so the rules cannot follow a visitor to another route.
// ─────────────────────────────────────────────────────────────────────────────

type GiveawayContext = {
  giveaway: PublicGiveaway;
  closed: boolean;
  /** Arrived with no tags — the booth QR, or the address typed in. `null` until
   *  the browser has looked at the URL's tags (a moment after load); then true
   *  or false. Anything that differs between the two must stay hidden while it
   *  is null, so nobody sees the wrong version flash. */
  inPerson: boolean | null;
};

const Ctx = createContext<GiveawayContext | null>(null);

export function useGiveaway(): GiveawayContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGiveaway must be used inside <GiveawayShell>");
  return ctx;
}

/** setTimeout stores its delay in a signed 32-bit integer. A page opened more
 *  than ~24 days early would otherwise fire immediately. */
const MAX_TIMEOUT_MS = 2_000_000_000;

export function GiveawayShell({
  giveaway,
  initialClosed,
  children,
}: {
  /** The browser-safe subset — see publicGiveaway() in config/giveaways. */
  giveaway: PublicGiveaway;
  initialClosed: boolean;
  children: ReactNode;
}) {
  const [closed, setClosed] = useState(initialClosed);
  const [inPerson, setInPerson] = useState<boolean | null>(null);

  // Who is reading: the page is static, so "did they come through a tagged
  // link" can only be asked in the browser. EntryCard's mount effect captures
  // the URL's tags into session storage before stripping them, and child
  // effects run before this one, so by now they are there. Only a tagged
  // visitor sees one line differ, and it is not shown until this has decided.
  useEffect(() => {
    setInPerson(!getStoredUtms().utm_source?.trim());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-giveaway", giveaway.slug);
    return () => {
      root.removeAttribute("data-giveaway");
      root.removeAttribute("data-giveaway-engaged");
    };
  }, [giveaway.slug]);

  useEffect(() => {
    const closesAt = Date.parse(giveaway.closesAt);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const remaining = closesAt - Date.now();
      setClosed(remaining <= 0);
      if (remaining > 0) timer = setTimeout(check, Math.min(remaining + 250, MAX_TIMEOUT_MS));
    };
    const wake = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      check();
    };
    check();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pageshow", wake);
    };
  }, [giveaway.closesAt]);

  return <Ctx.Provider value={{ giveaway, closed, inPerson }}>{children}</Ctx.Provider>;
}

/** Fold the cookie notice down once the visitor is filling the form in. Called
 *  on the form's first focus; idempotent. See giveaway.css. */
export function markFormEngaged(): void {
  document.documentElement.setAttribute("data-giveaway-engaged", "");
}
