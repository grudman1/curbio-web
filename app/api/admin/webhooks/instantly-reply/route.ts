import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  isKnownEventType,
  isPositiveEvent,
  readLabel,
  readReplyText,
  type InstantlyEvent,
} from "@/config/instantlyEvents";
import { applySources, persistRawEvent, recordUnknownEvent } from "@/lib/contactStore";
import { normalizeEmail } from "@/config/contactStore";

/**
 * Instantly webhook receiver — ALL EVENTS.
 *
 * Subscribe to "All events" in Instantly, not a filtered list. The filter this
 * route used to apply (`event_type === "email.replied"`, dot notation and
 * invented) would have acknowledged every real event with a 200 and dropped it.
 * The one confirmed string is snake_case —
 * `campaign_completed_for_lead_without_reply` — so the guess was wrong in both
 * spelling and shape, and nothing anywhere would have recorded the loss.
 *
 * ORDER MATTERS: the raw payload is persisted BEFORE anything parses it. A
 * parse bug then costs a parse, not the event; the raw key can be re-read and
 * re-parsed. An unrecognised event_type is stored and surfaced, never dropped —
 * silently discarding an unknown event is the same failure class as an
 * unrecognised utm_source silently falling through to `direct`.
 *
 * Auth: custom header `X-Curbio-Webhook-Token`, registered in Instantly
 * alongside the URL.
 *
 * Note: promotion is NOT automatic. A positive event puts a person in a QUEUE
 * for manual approval. Instantly's Interested label is AI-generated from reply
 * content, and AI misreads sarcasm and soft brush-offs; a wrong promotion
 * degrades the warm list and eventually burns the sending domain.
 */

const WEBHOOK_SECRET = process.env.INSTANTLY_WEBHOOK_SECRET || "";
const WEBHOOK_HEADER = "x-curbio-webhook-token";

function verifyWebhookToken(headerValue: string | null): boolean {
  if (!headerValue || !WEBHOOK_SECRET) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(WEBHOOK_SECRET);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookToken(req.headers.get(WEBHOOK_HEADER))) {
    console.warn(`[instantly-webhook] unauthorized: missing or invalid ${WEBHOOK_HEADER}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const receivedAt = new Date().toISOString();
  const body = await req.text();

  // ── 1. Persist raw, before understanding anything ──────────────────────────
  let eventType: string | null = null;
  let payload: InstantlyEvent | null = null;
  try {
    payload = JSON.parse(body) as InstantlyEvent;
    eventType = typeof payload.event_type === "string" ? payload.event_type : null;
  } catch {
    // Unparseable body is still evidence. Store it and say so.
    payload = null;
  }

  let rawKey: string | null = null;
  try {
    rawKey = await persistRawEvent(body, { receivedAt, eventType });
  } catch (err) {
    // A failure HERE is the one worth shouting about: it is the only path that
    // loses data permanently. Return 500 so Instantly retries.
    console.error("[instantly-webhook] RAW PERSIST FAILED — event may be lost:", err);
    return NextResponse.json({ error: "Storage unavailable" }, { status: 500 });
  }

  if (!payload || !eventType) {
    await recordUnknownEvent({
      eventType,
      rawKey,
      receivedAt,
      preview: body.slice(0, 500),
    });
    // 200: the payload is safely stored. Returning an error would make Instantly
    // retry an event we already hold, and the problem is ours, not theirs.
    return NextResponse.json({ ok: true, stored: rawKey, parsed: false });
  }

  // ── 2. Surface anything we do not recognise ────────────────────────────────
  if (!isKnownEventType(eventType)) {
    await recordUnknownEvent({
      eventType,
      rawKey,
      receivedAt,
      preview: body.slice(0, 500),
    });
    console.warn(`[instantly-webhook] unrecognised event_type="${eventType}" stored at ${rawKey}`);
    // Fall through: an unknown type can still carry a usable lead_email, and
    // recording that the person exists is better than discarding them.
  }

  // ── 3. Parse into the contact store ────────────────────────────────────────
  const email = normalizeEmail(payload.lead_email);
  if (!email) {
    return NextResponse.json({ ok: true, stored: rawKey, parsed: true, contact: null });
  }

  const label = readLabel(payload);
  const positive = isPositiveEvent(eventType, label);
  const at =
    typeof payload.timestamp === "string" && payload.timestamp ? payload.timestamp : receivedAt;

  try {
    const result = await applySources({
      email,
      // Only Instantly flags. `acActive` is deliberately absent — this route has
      // no opinion about AC, and passing false would un-subscribe people.
      patch: { inInstantly: true, ...(positive ? { instantlyPositive: true } : {}) },
      identity: {
        firstName: typeof payload.firstName === "string" ? payload.firstName : undefined,
        lastName: typeof payload.lastName === "string" ? payload.lastName : undefined,
        companyName: typeof payload.companyName === "string" ? payload.companyName : undefined,
        website: typeof payload.website === "string" ? payload.website : undefined,
        phone: typeof payload.phone === "string" ? payload.phone : undefined,
      },
      source: "instantly",
      campaign: typeof payload.campaign_name === "string" ? payload.campaign_name : null,
      at,
      replyText: readReplyText(payload),
    });

    return NextResponse.json({
      ok: true,
      stored: rawKey,
      parsed: true,
      contact: result?.record.email ?? null,
      transition: result?.transition?.to ?? null,
    });
  } catch (err) {
    // The raw payload is already safe, so this is recoverable by re-parsing.
    console.error(`[instantly-webhook] parse/store failed for ${rawKey}:`, err);
    return NextResponse.json({ ok: true, stored: rawKey, parsed: false });
  }
}
