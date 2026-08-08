"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MUTED } from "./ui";

// Real navigation, not a client-side toggle: each tab is a route with its own
// URL, so /admin/design-system keeps working as a direct link and the browser
// back button behaves. Ordered by how often each gets scanned: Pages daily,
// Leads second, Design System as occasional reference.
const TABS = [
  { href: "/admin", label: "Pages" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/design-system", label: "Design System" },
];

export function Tabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Control Room sections"
      style={{
        display: "flex",
        gap: 28,
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "var(--space-5)",
      }}
    >
      {TABS.map((t) => {
        const active =
          t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            style={{
              padding: "6px 2px 12px",
              marginBottom: -1,
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-small)",
              fontWeight: active ? 700 : 600,
              letterSpacing: "-0.005em",
              color: active ? "var(--color-text)" : MUTED,
              borderBottom: active
                ? "2px solid var(--color-accent)"
                : "2px solid transparent",
              transition: "color var(--duration-base) ease-out",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
