import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Instantly reply webhook receiver.
 *
 * Events: email replies (first reply per lead, automatic replies excluded).
 * Auth: Custom HTTP header `X-Curbio-Webhook-Token` with shared secret value.
 *
 * Webhook is registered in Instantly app settings:
 * - URL: https://[domain]/api/admin/webhooks/instantly-reply
 * - Custom header: Name="X-Curbio-Webhook-Token", Value=<the shared secret>
 *
 * Payload includes: campaign_id, contact_email, replied_at, reply_text (optional).
 */

const WEBHOOK_SECRET = process.env.INSTANTLY_WEBHOOK_SECRET || "";
const WEBHOOK_HEADER = "x-curbio-webhook-token";

function verifyWebhookToken(headerValue: string | null): boolean {
  if (!headerValue || !WEBHOOK_SECRET) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(headerValue),
      Buffer.from(WEBHOOK_SECRET)
    );
  } catch {
    return false;
  }
}

type InstantlyReplyEvent = {
  event_type: string;
  campaign_id: string;
  contact_email: string;
  replied_at: string;
  reply_text?: string;
};

export async function POST(req: NextRequest) {
  const headerValue = req.headers.get(WEBHOOK_HEADER);

  // Verify token before processing body.
  if (!verifyWebhookToken(headerValue)) {
    console.warn(`[instantly-webhook] unauthorized: missing or invalid ${WEBHOOK_HEADER}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.text();
    const payload = JSON.parse(body) as InstantlyReplyEvent;

    if (payload.event_type !== "email.replied") {
      return NextResponse.json({ success: true });
    }

    // Log the reply event. Later: store in DB or queue for processing.
    console.log(
      `[instantly-webhook] reply: campaign=${payload.campaign_id} ` +
        `contact=${payload.contact_email} at=${payload.replied_at}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[instantly-webhook] error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
