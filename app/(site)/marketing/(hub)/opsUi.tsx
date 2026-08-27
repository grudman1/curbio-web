"use client";

// Shared form furniture for the ops write surfaces. Lifted out of the Call
// Plan once a second object needed the same field, button and error
// treatments — one place, so the five write screens cannot drift apart.

import { SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";

export const opsField: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "7px 10px",
  background: "var(--color-surface-raised)",
  width: "100%",
};

export const opsFieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SUBTLE,
  display: "block",
  marginBottom: 5,
};

export const opsLinkButton: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-label)",
  color: "var(--color-brand)",
  background: "none",
  border: 0,
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
};

export function OpsError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: "var(--text-small)",
        color: "var(--color-state-error)",
        margin: "12px 0 0",
      }}
    >
      {children}
    </p>
  );
}

export function OpsSaveButton({
  saving,
  label,
  onClick,
}: {
  saving: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: "var(--text-small)",
        fontWeight: 700,
        color: "var(--color-text-on-brand, #fff)",
        background: "var(--color-brand)",
        border: 0,
        borderRadius: "var(--radius-pill, 999px)",
        padding: "7px 16px",
        cursor: saving ? "default" : "pointer",
        opacity: saving ? 0.6 : 1,
      }}
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

/** The editor shell every ops form sits in. */
export function OpsFormCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: 16,
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--color-surface)",
      }}
    >
      {children}
    </div>
  );
}

export function OpsFormGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{children}</div>;
}

/** Archived records, collapsed. Present on every write surface because
 *  "no deletes" is only credible if the archive is reachable. */
export function ArchivedList<T extends { id: string }>({
  records,
  label,
  isOwner,
  onRestore,
}: {
  records: T[];
  label: (r: T) => string;
  isOwner: boolean;
  onRestore: (id: string) => void;
}) {
  if (records.length === 0) return null;
  return (
    <details style={{ marginTop: 16 }}>
      <summary
        style={{
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-label)",
          color: SUBTLE,
          cursor: "pointer",
        }}
      >
        Archived ({records.length}) — records never delete
      </summary>
      <ul
        style={{
          margin: "8px 0 0",
          paddingLeft: 20,
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-small)",
          color: SUBTLE,
        }}
      >
        {records.map((r) => (
          <li key={r.id} style={{ marginBottom: 4 }}>
            {label(r)}
            {isOwner && (
              <>
                {" · "}
                <button type="button" style={opsLinkButton} onClick={() => onRestore(r.id)}>
                  restore
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
