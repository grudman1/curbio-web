"use client";

import { useEffect, useState } from "react";

/**
 * Reads a custom property's RESOLVED value off the live document.
 *
 * Deliberately not a hardcoded value table: the point of this page is to be a
 * mirror, not a second source of truth. If tokens.css and this page could
 * disagree, the page would be worse than useless during a rebrand — it would
 * be confidently wrong. Reading getComputedStyle means the only way this
 * renders a value is if that value is genuinely in the document.
 *
 * Empty during SSR (no document); fills in on mount.
 */
export function TokenValue({ token, inline = false }: { token: string; inline?: boolean }) {
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
    setValue(raw || "—");
  }, [token]);

  return (
    <code
      style={{
        fontSize: "var(--text-micro)",
        color: "var(--color-text-subtle)",
        display: inline ? "inline" : "block",
        wordBreak: "break-all",
      }}
      title={value}
    >
      {value || " "}
    </code>
  );
}
