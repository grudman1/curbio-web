"use client";

import { useState } from "react";
import { ZipModal } from "./LpModals";
import { Icon } from "./LpKit";

export function ZipModalTrigger({
  label,
  marketSlug,
  initialOpen = false,
  basePath = "/",
  required = false,
}: {
  label: string;
  marketSlug: string | null;
  initialOpen?: boolean;
  basePath?: string;
  /** Neutral state only — see ZipModal. Makes the picker a gate the visitor
   *  must answer rather than a switcher they can dismiss. */
  required?: boolean;
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
        {label}
        <Icon name="chevronDown" size={14} color="var(--fg-muted)" stroke={2} style={{ marginLeft: 1 }} />
      </button>
      <ZipModal
        open={open}
        onClose={() => setOpen(false)}
        current={marketSlug ? { slug: marketSlug } : null}
        basePath={basePath}
        // `required` is only ever passed alongside the neutral auto-open, so
        // the gate and the auto-open are the same event. A visitor who already
        // HAS a market gets required={false} from the shell and keeps a fully
        // dismissible switcher.
        required={required}
      />
    </>
  );
}
