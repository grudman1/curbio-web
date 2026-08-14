"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MUTED } from "../ui";
import { HUB_SURFACES, hubPath } from "@/config/marketingHub";
import { STATUS_TONE } from "./hubUi";

// Sub-nav for the Marketing Hub: eight real routes, each with a status dot
// read from the wiring registry. While the Hub is unwired, this nav is the
// build tracker — the dots turn from subtle to green as surfaces come live.

export function HubNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Marketing Hub sections"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 22px",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "var(--space-5)",
      }}
    >
      {HUB_SURFACES.map((s) => {
        const href = hubPath(s.slug);
        const active = pathname.startsWith(href);
        return (
          <Link
            key={s.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "4px 2px 10px",
              marginBottom: -1,
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-label)",
              fontWeight: active ? 700 : 600,
              color: active ? "var(--color-text)" : MUTED,
              borderBottom: active
                ? "2px solid var(--color-accent)"
                : "2px solid transparent",
              transition: "color var(--duration-base) ease-out",
            }}
          >
            <span
              aria-hidden
              title={`wiring: ${s.status}`}
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: 999,
                background:
                  s.status === "waiting" ? "transparent" : STATUS_TONE[s.status],
                border: `1.5px solid ${STATUS_TONE[s.status]}`,
                flex: "none",
              }}
            />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
