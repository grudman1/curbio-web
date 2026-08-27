// ─────────────────────────────────────────────────────────────────────────────
// THE self-reported marker. Sits beside the tone scale (tone.ts) as the other
// half of the honesty vocabulary: tone says how a number is doing, this says
// where a number CAME FROM.
//
// The rule (DECISIONS.md → "Leads are measured; operational records are
// claimed"): a value someone typed into a form must never render
// indistinguishably from a value that arrived over the wire. Wherever a
// typed-in count appears — the Call Plan's meetings, an outreach week's
// mailings — it carries this marker, so "meetings booked: 4" always answers
// "four logged entries, or four measured events?" at a glance.
//
// Deliberately grey and small: it is provenance, not judgment. It must not
// look like a tone (a claim is not a warning) and must not use amber
// (signal-only inside /admin).
// ─────────────────────────────────────────────────────────────────────────────

export function LoggedTag() {
  return (
    <span
      title="Self-reported — typed in by a person, not measured by the system"
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--color-text-subtle)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        padding: "1px 4px",
        verticalAlign: "middle",
      }}
    >
      logged
    </span>
  );
}

/** A self-reported number with its marker attached. Null renders the caller's
 *  dash upstream — a count never entered is unknown, not zero, so it gets no
 *  marker (there is no claim to mark). */
export function LoggedValue({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <LoggedTag />
    </span>
  );
}
