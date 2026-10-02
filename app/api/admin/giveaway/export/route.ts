import { type NextRequest } from "next/server";
import { ANSWER_LABEL, giveawayBySlug } from "@/config/giveaways";
import { MARKET_BY_SLUG } from "@/config/markets";
import { requireAdminApiSession, unauthorized } from "@/lib/adminApiAuth";
import { entryCount, isDrawable } from "@/lib/giveaway/entry";
import { storeScope } from "@/lib/giveaway/mode";
import { readEntries } from "@/lib/giveaway/store";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/giveaway/export?giveaway=<slug> — every entry, as a CSV.
//
// OWNER-ONLY, and gated HERE: middleware does not run for /api/* (see
// lib/adminApiAuth.ts), so this handler is public unless it says otherwise.
// The file carries full names, emails and phone numbers — the one place the
// giveaway's PII leaves the app whole — which is why a signed-in member is
// not enough.
//
// One row per person; the store is keyed by email, so there is nothing to
// dedupe. Times are given twice: Mountain (the event's clock, for reading)
// and UTC (for sorting and for anyone joining this to another system).
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

const MT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * One CSV cell. Quoted when it must be, and DEFUSED when it would be read as
 * a formula: a name typed as `=HYPERLINK(...)` on a public form is otherwise
 * live code the moment someone opens this file in Excel or Sheets.
 */
function cell(value: string | number | boolean | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * "(404) 555-0100". Every stored number is ten digits (or eleven with a
 * leading 1) however it was typed, and one shape makes the column sortable and
 * diallable. It also keeps a number typed as "+1 404…" from starting with a
 * "+", which `cell` would have to defuse with a visible apostrophe.
 */
function phone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : raw;
}

export async function GET(req: NextRequest) {
  const session = await requireAdminApiSession();
  if (!session) return unauthorized();
  if (session.role !== "owner") {
    return new Response(JSON.stringify({ error: "Owner access required." }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const giveaway = giveawayBySlug(req.nextUrl.searchParams.get("giveaway"));
  if (!giveaway) return new Response("Unknown giveaway", { status: 404 });

  const read = await readEntries(storeScope(giveaway));
  if (!read.configured || read.error) {
    return new Response(`Entry store unavailable: ${read.configured ? read.error : "not configured"}`, { status: 503 });
  }

  const header = [
    "entered_mountain",
    "entered_utc",
    "name",
    "first_name",
    "last_name",
    "email",
    "phone",
    "market",
    "market_slug",
    "zip",
    "listing_next_90_days",
    "entries",
    "in_drawing",
    "is_test",
    "after_close",
    "contact_form_used_utc",
    "bonus",
    "bonus_added_by",
    "booked_call",
    "booking_source",
    "sent_to_app",
    "app_reason",
    "app_lead_id",
    "email_list",
    "email_list_ids",
    "channel",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "referral_source",
    "first_touch_channel",
    "first_touch_campaign",
    "tags_defaulted",
    "resubmissions",
    "updated_utc",
  ];

  // Oldest first: the order people arrived in.
  const lines = [...read.entries].reverse().map((e) => {
    const a = e.attribution;
    return [
      MT.format(new Date(e.createdAt)),
      e.createdAt,
      e.name,
      e.firstName,
      e.lastName,
      e.email,
      phone(e.phone),
      e.marketSlug ? (MARKET_BY_SLUG[e.marketSlug]?.name ?? e.marketSlug) : "Not listed",
      e.marketSlug ?? "",
      e.zip,
      ANSWER_LABEL[e.listing90],
      entryCount(e, giveaway),
      isDrawable(e) ? "yes" : "no",
      e.isTest ? "yes" : "no",
      e.inEntryPeriod ? "no" : "yes",
      e.contactRequestedAt ?? "",
      e.bonus?.source ?? "",
      e.bonus?.by ?? "",
      e.booking ? "yes" : "no",
      e.booking?.via ?? "",
      e.routing.app.status,
      e.routing.app.reason ?? "",
      e.routing.app.leadId ?? "",
      e.routing.emailList.status,
      (e.routing.emailList.listIds ?? []).join("|"),
      a.channel,
      a.utm_source,
      a.utm_medium,
      a.utm_campaign,
      a.utm_content,
      a.referralSourceId,
      a.firstTouchChannel,
      a.firstTouchCampaign,
      a.defaulted ? "yes" : "no",
      e.revisions,
      e.updatedAt,
    ]
      .map(cell)
      .join(",");
  });

  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  // The BOM makes Excel read the file as UTF-8, so an accented name survives.
  const body = `﻿${header.join(",")}\r\n${lines.join("\r\n")}\r\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${giveaway.slug}-entries-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
