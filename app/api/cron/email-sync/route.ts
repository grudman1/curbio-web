import { NextRequest, NextResponse } from "next/server";
import {
  normalizeCampaignName,
  storeCampaign,
  clearPlatformCampaigns,
  setLastSyncTimestamp,
  logUnmatchedCampaign,
  type EmailCampaign,
} from "@/config/emailCampaigns";
import crypto from "crypto";

const AC_ACCOUNT_URL = process.env.ACTIVECAMPAIGN_ACCOUNT_URL;
const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

type AcCampaign = {
  id: string;
  name: string;
  status: string;
  send_amt: string;
  opens: string;
  uniqueopens: string;
  linkclicks: string;
  uniquelinkclicks: string;
  replies: string;
  uniquereplies: string;
  hardbounces: string;
  softbounces: string;
  unsubscribes: string;
  sdate: string | null;
  ldate: string | null;
};

type InstantlyCampaign = {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  emails_sent_count: number;
  contacted_count: number;
  open_count_unique: number;
  link_click_count_unique: number;
  reply_count_unique: number;
  bounced_count: number;
  unsubscribed_count: number;
};

function verifyCronSecret(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    console.warn("[email-sync-cron] no CRON_SECRET configured");
    return false;
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  try {
    return crypto.timingSafeEqual(
      Buffer.from(bearerToken),
      Buffer.from(CRON_SECRET)
    );
  } catch {
    return false;
  }
}

async function fetchActiveCampaignCampaigns(
  startDate: string
): Promise<{ campaigns: EmailCampaign[]; error: string | null }> {
  const campaigns: EmailCampaign[] = [];
  let error: string | null = null;

  try {
    if (!AC_API_KEY || !AC_ACCOUNT_URL) {
      return { campaigns, error: "ActiveCampaign credentials not configured" };
    }

    let page = 0;
    const limit = 100;

    while (true) {
      const offset = page * limit;
      const url = `${AC_ACCOUNT_URL}/api/3/campaigns?limit=${limit}&offset=${offset}`;

      const res = await fetch(url, {
        headers: { "Api-Token": AC_API_KEY },
      });

      if (!res.ok) {
        error = `ActiveCampaign API error: ${res.status}`;
        break;
      }

      const data = (await res.json()) as { campaigns: AcCampaign[] };
      if (!data.campaigns || data.campaigns.length === 0) break;

      for (const ac of data.campaigns) {
        const campaign: EmailCampaign = {
          id: `ac-${ac.id}`,
          platform: "activecampaign",
          platform_campaign_id: ac.id,
          campaign_name: ac.name,
          campaign_name_normalized: normalizeCampaignName(ac.name),
          campaign_status: ac.status === "5" ? "sent" : "unknown",
          sent_count: parseInt(ac.send_amt) || 0,
          open_count: parseInt(ac.opens) || 0,
          open_count_unique: parseInt(ac.uniqueopens) || 0,
          click_count: parseInt(ac.linkclicks) || 0,
          click_count_unique: parseInt(ac.uniquelinkclicks) || 0,
          reply_count: parseInt(ac.replies) || 0,
          reply_count_unique: parseInt(ac.uniquereplies) || 0,
          bounce_count:
            (parseInt(ac.hardbounces) || 0) + (parseInt(ac.softbounces) || 0),
          bounce_hard_count: parseInt(ac.hardbounces) || 0,
          bounce_soft_count: parseInt(ac.softbounces) || 0,
          unsubscribe_count: parseInt(ac.unsubscribes) || 0,
          list_size: null,
          send_date: ac.sdate,
          last_activity_date: ac.ldate,
          synced_at: new Date().toISOString(),
          raw_data: ac,
        };
        campaigns.push(campaign);
      }

      page++;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return { campaigns, error };
}

async function fetchInstantlyCampaigns(
  startDate: string
): Promise<{ campaigns: EmailCampaign[]; error: string | null }> {
  const campaigns: EmailCampaign[] = [];
  let error: string | null = null;

  try {
    if (!INSTANTLY_API_KEY) {
      return { campaigns, error: "Instantly API key not configured" };
    }

    const url = new URL("https://api.instantly.ai/api/v2/campaigns/analytics");
    url.searchParams.append("start_date", startDate);
    url.searchParams.append("exclude_total_leads_count", "true");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
    });

    if (!res.ok) {
      error = `Instantly API error: ${res.status}`;
      return { campaigns, error };
    }

    const data = (await res.json()) as { campaigns: InstantlyCampaign[] };

    if (!data.campaigns) return { campaigns, error };

    for (const inst of data.campaigns) {
      const campaign: EmailCampaign = {
        id: `inst-${inst.campaign_id}`,
        platform: "instantly",
        platform_campaign_id: inst.campaign_id,
        campaign_name: inst.campaign_name,
        campaign_name_normalized: normalizeCampaignName(inst.campaign_name),
        campaign_status: inst.campaign_status as
          | "active"
          | "scheduled"
          | "paused"
          | "sent"
          | "unknown",
        sent_count: inst.emails_sent_count,
        open_count: inst.open_count_unique,
        open_count_unique: inst.open_count_unique,
        click_count: inst.link_click_count_unique,
        click_count_unique: inst.link_click_count_unique,
        reply_count: inst.reply_count_unique,
        reply_count_unique: inst.reply_count_unique,
        bounce_count: inst.bounced_count,
        bounce_hard_count: inst.bounced_count,
        bounce_soft_count: 0,
        unsubscribe_count: inst.unsubscribed_count,
        list_size: inst.contacted_count || null,
        send_date: null,
        last_activity_date: null,
        synced_at: new Date().toISOString(),
        raw_data: inst,
      };
      campaigns.push(campaign);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return { campaigns, error };
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn("[email-sync-cron] unauthorized request (bad or missing CRON_SECRET)");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startDate = "2026-01-01";
  const now = new Date().toISOString();
  const results: Record<string, unknown> = {
    synced_at: now,
    platforms: {} as Record<string, unknown>,
    errors: {} as Record<string, unknown>,
  };

  try {
    // Clear platforms before re-syncing (idempotent rewrite).
    await Promise.all([
      clearPlatformCampaigns("activecampaign"),
      clearPlatformCampaigns("instantly"),
    ]);

    // Fetch both platforms in parallel, fail soft per platform.
    const [acResult, instResult] = await Promise.all([
      fetchActiveCampaignCampaigns(startDate),
      fetchInstantlyCampaigns(startDate),
    ]);

    // Store ActiveCampaign campaigns (if any), log errors.
    if (acResult.error) {
      (results.errors as Record<string, unknown>).activecampaign = acResult.error;
      console.error(`[email-sync-cron] ActiveCampaign error: ${acResult.error}`);
    } else {
      for (const campaign of acResult.campaigns) {
        await storeCampaign(campaign);
      }
      (results.platforms as Record<string, unknown>).activecampaign = acResult.campaigns.length;
    }

    // Store Instantly campaigns (if any), log errors.
    if (instResult.error) {
      (results.errors as Record<string, unknown>).instantly = instResult.error;
      console.error(`[email-sync-cron] Instantly error: ${instResult.error}`);
    } else {
      for (const campaign of instResult.campaigns) {
        await storeCampaign(campaign);
      }
      (results.platforms as Record<string, unknown>).instantly = instResult.campaigns.length;
    }

    // Record sync timestamp.
    await setLastSyncTimestamp(now);

    return NextResponse.json(results);
  } catch (error) {
    console.error("[email-sync-cron] fatal error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
        synced_at: now,
      },
      { status: 500 }
    );
  }
}
