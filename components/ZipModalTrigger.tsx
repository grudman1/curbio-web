"use client";

import { useState } from "react";
import { ZipModal } from "./LpModals";
import { Icon } from "./LpKit";
import { MARKETS } from "@/config/markets";

export function ZipModalTrigger({
  label,
  marketSlug,
  initialOpen = false,
  basePath = "/",
  prompted = false,
}: {
  label: string;
  marketSlug: string | null;
  initialOpen?: boolean;
  basePath?: string;
  /** Neutral state only — see ZipModal. "Where are you listing?" copy. */
  prompted?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const known = marketSlug ? MARKETS.find((m) => m.slug === marketSlug) : undefined;
  const shortLabel = marketSlug ? (known?.shortName ?? label) : "Market";
  return (
    <>
      <button
        className="lp-mkt-btn"
        onClick={() => setOpen(true)}
        aria-label={marketSlug ? `Market: ${label}. Change market` : "Choose your market"}
      >
        <span className="lp-mkt-pin" aria-hidden>
          <Icon name="pin" size={13} color="var(--fg-muted)" stroke={1.75} />
        </span>
        {/* Narrow phones get a short label ("Market", or a market's shortName)
            so the pill stays on one line beside the logos — see globals.css
            for the breakpoint. The button's aria-label keeps the full wording. */}
        <span className="lp-mkt-btn-full">{label}</span>
        <span className="lp-mkt-btn-short" aria-hidden>{shortLabel}</span>
        <Icon name="chevronDown" size={14} color="var(--fg-muted)" stroke={2} style={{ marginLeft: 1 }} />
      </button>
      <ZipModal
        open={open}
        onClose={() => setOpen(false)}
        current={marketSlug ? { slug: marketSlug } : null}
        basePath={basePath}
        // `prompted` is only ever passed alongside the neutral auto-open; it
        // changes the copy, never whether the picker can be closed.
        prompted={prompted}
      />
    </>
  );
}
