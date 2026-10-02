// ─────────────────────────────────────────────────────────────────────────────
// Calendly's inline embed, built as a plain iframe URL.
//
// The same construction components/ConfirmShell.tsx uses for the /confirm
// page, and it has to stay the same in three ways that are easy to get wrong:
//
//   - One event slug for EVERY manager: `<profile>/<eventSlug>`. /confirm
//     hardcodes `general-meeting` (README, "Calendly event slugs"); here the
//     slug comes from the giveaway's settings so an event can have its own
//     shorter call. Either way a mismatch is fixed by renaming the event in
//     Calendly, never by a per-manager override.
//   - `embed_domain` is REQUIRED for Calendly to post its lifecycle messages
//     to the parent window. Without it the iframe books normally and tells
//     nobody — and here the booking message is what awards the bonus entries.
//   - The phone prefill is the `location` parameter in E.164, because every
//     HSM event's location is "Phone call (invitee provides number)".
//
// It is a copy rather than an import because ConfirmShell does not export its
// builder and is part of the flow /exp depends on; exporting it would be an
// edit to that file. If the two ever disagree, ConfirmShell is the reference.
// ─────────────────────────────────────────────────────────────────────────────

export type CalendlyPrefill = { name?: string; email?: string; phone?: string };

export function calendlyIframeSrc(
  profileUrl: string,
  eventSlug: string,
  prefill: CalendlyPrefill,
  embedDomain: string
): string {
  const params = new URLSearchParams({
    embed_type: "Inline",
    hide_gdpr_banner: "1",
    background_color: "ffffff",
    text_color: "0d254d",
    primary_color: "cd8629",
    embed_domain: embedDomain,
  });
  if (prefill.name) params.set("name", prefill.name);
  if (prefill.email) params.set("email", prefill.email);
  if (prefill.phone) {
    const digits = prefill.phone.replace(/\D/g, "");
    if (digits.length === 10) params.set("location", `+1${digits}`);
    else if (digits.length === 11 && digits[0] === "1") params.set("location", `+${digits}`);
  }
  return `${profileUrl.replace(/\/$/, "")}/${eventSlug}?${params.toString()}`;
}

export type CalendlyMessage =
  | { kind: "height"; height: number }
  | { kind: "scheduled"; eventUri: string | null };

/**
 * Read a window `message` event from Calendly. Null for anything else —
 * including a message that merely claims to be Calendly's: the origin is
 * checked, because any frame on the page can post to its parent.
 */
export function readCalendlyMessage(e: MessageEvent): CalendlyMessage | null {
  let host = "";
  try {
    host = new URL(e.origin).hostname;
  } catch {
    return null;
  }
  if (host !== "calendly.com" && !host.endsWith(".calendly.com")) return null;

  const data = e.data as {
    event?: string;
    payload?: { height?: string | number; event?: { uri?: string } };
  } | null;
  if (data?.event === "calendly.page_height") {
    const height = parseInt(String(data.payload?.height ?? ""), 10);
    return Number.isFinite(height) && height > 0 ? { kind: "height", height } : null;
  }
  if (data?.event === "calendly.event_scheduled") {
    const uri = data.payload?.event?.uri;
    return { kind: "scheduled", eventUri: typeof uri === "string" ? uri : null };
  }
  return null;
}
