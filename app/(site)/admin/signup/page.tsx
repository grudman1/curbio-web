import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { signup } from "./actions";

// Self-service account request. @curbio.com only (config/adminAccess.ts).
// The owner allowlist auto-approves on first signup and signs straight in;
// everyone else lands pending until an owner approves them from the Control
// Room. Noindexed, anonymous — same treatment as /admin/login.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request access — Curbio",
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

const ERROR_COPY: Record<string, string> = {
  "bad-domain": "Use your @curbio.com email address.",
  "weak-password": "Password must be at least 12 characters.",
  mismatch: "Passwords don't match.",
  "already-pending": "A request for that email is already pending approval.",
  "already-approved": "That email already has an account — sign in instead.",
  unavailable: "Something went wrong. Try again in a moment.",
  rate: "Too many attempts — try again in a few minutes.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const { e, ok } = await searchParams;
  const error = e ? (ERROR_COPY[e] ?? "Something went wrong.") : null;
  const submitted = ok === "pending";

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
            Request access
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

          {submitted ? (
            <>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-small)",
                  color: "var(--color-text-muted)",
                  lineHeight: "var(--leading-body)",
                  margin: "0 0 20px",
                }}
              >
                Request submitted. You&rsquo;ll be able to sign in once an admin approves your
                account.
              </p>
              <Link
                href="/admin/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--color-text)",
                }}
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
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

              <form action={signup}>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="email" style={label}>
                    Curbio email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@curbio.com"
                    autoComplete="username"
                    required
                    style={field}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="password" style={label}>
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    required
                    style={field}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="confirm" style={label}>
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
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
                  Request access
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
                Already have an account?{" "}
                <Link href="/admin/login" style={{ color: "var(--color-text)", fontWeight: 700 }}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
