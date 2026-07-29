import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";

// Sign-in for the internal surface. Deliberately anonymous: no mention of
// what is behind it, generic error copy ("invalid email or password" — never
// "no such user"), noindexed here and via X-Robots-Tag in middleware.
//
// Styled to the Curbio design system: cloud-white canvas, white card, Lora
// headline, amber pill CTA, stone borders. Tokens only.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — Curbio",
  robots: { index: false, follow: false },
};

const field: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 16, // ≥16px prevents iOS focus zoom
  color: "var(--color-text)",
  height: 48,
  padding: "0 14px",
  border: "1px solid var(--color-border-strong)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-surface-raised)",
  width: "100%",
};

const label: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 800,
  letterSpacing: "var(--tracking-label)",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  display: "block",
  marginBottom: 6,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const error =
    e === "rate"
      ? "Too many attempts — try again in a few minutes."
      : e === "pending"
        ? "Your access request is still pending approval."
        : e
          ? "Invalid email or password."
          : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-6)" }}>
          <Image src="/logo/curbio-navy.svg" alt="Curbio" width={120} height={31} unoptimized />
        </div>

        <div
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--elevation-card)",
            padding: "var(--space-8)",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-family-serif)",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Sign in
          </h1>
          <span
            aria-hidden
            style={{
              display: "block",
              width: 40,
              height: 3,
              background: "var(--color-accent)",
              borderRadius: 2,
              margin: "12px 0 20px",
            }}
          />

          {error && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-small)",
                color: "var(--color-state-error)",
                background: "rgba(226,75,74,0.08)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                margin: "0 0 16px",
              }}
            >
              {error}
            </p>
          )}

          <form action={login}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" style={label}>
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="username" required style={field} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="password" style={label}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                style={field}
              />
            </div>
            <button
              type="submit"
              style={{
                width: "100%",
                height: 52,
                background: "var(--color-accent)",
                color: "var(--color-text-on-accent)",
                border: 0,
                borderRadius: "var(--radius-pill)",
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          </form>

          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--color-text-muted)",
              textAlign: "center",
              margin: "20px 0 0",
            }}
          >
            Need access?{" "}
            <Link href="/admin/signup" style={{ color: "var(--color-text)", fontWeight: 700 }}>
              Request an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
