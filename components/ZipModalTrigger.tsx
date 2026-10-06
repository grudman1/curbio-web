"use client";

import { useState } from "react";
import { ZipModal } from "./LpModals";
import { Icon } from "./LpKit";

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
  return (
    <>
      <button
        className="lp-mkt-btn"
        onClick={() => setOpen(true)}
        aria-label={marketSlug ? `Market: ${label}. Change market` : "Choose your market"}
      >
        <Icon name="pin" size={13} color="var(--fg-muted)" stroke={1.75} />
        {/* Narrow phones (<360px) get "Market" instead of "Choose your market"
            so the pill stays on one line beside the logos. A chosen market's
            name is shown as-is. The button's aria-label always has the full
            wording. */}
        <span className="lp-mkt-btn-full">{label}</span>
        <span className="lp-mkt-btn-short" aria-hidden>{marketSlug ? label : "Market"}</span>
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
