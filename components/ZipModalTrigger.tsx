"use client";

import { useState } from "react";
import { ZipModal } from "./LpModals";
import { Icon } from "./LpKit";

export function ZipModalTrigger({
  label,
  marketSlug,
  initialOpen = false,
  basePath = "/",
}: {
  label: string;
  marketSlug: string | null;
  initialOpen?: boolean;
  basePath?: string;
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
      />
    </>
  );
}
