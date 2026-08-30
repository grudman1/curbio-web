// ─────────────────────────────────────────────────────────────────────────────
// EMAIL CAMPAIGNS STORE — unified per-campaign metrics across platforms.
//
// Platform tags: `mailchimp` (archived), `activecampaign` (opt-in), `instantly` (cold).
// Channel is always `email`; no platform value in utm_source.
//
// Primary key per platform: campaign_id (uuid on Instantly, numeric on AC).
// Join key: campaign_name → normalized utm_campaign (exact match after normalization).
//
// Storage: Upstash Redis (existing connection, no second store).
// Keys: email:campaigns:v1:{platform}:{campaign_id}
// Sync: Idempotent, hourly cron. Backfill from 2026-01-01. Fail soft per platform.
// Webhook: Instantly replies only (static header auth). AC replies from poll.
// ─────────────────────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";

export type EmailCampaignPlatform = "mailchimp" | "activecampaign" | "instantly";

export type EmailCampaign = {
  id: string;
  platform: EmailCampaignPlatform;
  platform_campaign_id: string;
  campaign_name: string;
  campaign_name_normalized: string;
  campaign_status: "active" | "scheduled" | "paused" | "sent" | "archived" | "unknown";
  sent_count: number;
  open_count: number;
  open_count_unique: number;
  click_count: number;
  click_count_unique: number;
  reply_count: number;
  reply_count_unique: number;
  bounce_count: number;
  bounce_hard_count: number;
  bounce_soft_count: number;
  unsubscribe_count: number;
  list_size: number | null;
  send_date: string | null;
  last_activity_date: string | null;
  synced_at: string;
  raw_data: Record<string, unknown>;
};

/**
 * Normalize campaign name for utm_campaign matching.
 * Rule: trim, collapse whitespace, strip invisible Unicode, lowercase.
 */
export function normalizeCampaignName(name: string): string {
  return (
    name
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[ ​‌‍﻿]/g, "")
      .toLowerCase()
  );
}

/**
 * Join campaign to utm_campaign after normalization.
 */
export function matchCampaignToUtm(
  campaignName: string,
  utmCampaignNormalized: string
): boolean {
  return normalizeCampaignName(campaignName) === utmCampaignNormalized;
}

// ── Redis access (existing connection, read-write for sync, read-only for page) ──

function getReadWriteRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

function getReadOnlyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

/**
 * Store a campaign in Redis. Called by sync (read-write).
 * Key: email:campaigns:v1:{platform}:{campaign_id}
 */
export async function storeCampaign(campaign: EmailCampaign): Promise<void> {
  const redis = getReadWriteRedis();
  if (!redis) throw new Error("Redis not configured (sync requires read-write access)");

  const key = `email:campaigns:v1:${campaign.platform}:${campaign.platform_campaign_id}`;
  await redis.set(key, JSON.stringify(campaign));
}

/**
 * Retrieve all campaigns from Redis. Called by page (read-only).
 * Scans for all keys matching email:campaigns:v1:*
 */
export async function getAllCampaigns(): Promise<EmailCampaign[]> {
  const redis = getReadOnlyRedis();
  if (!redis) return [];

  const campaigns: EmailCampaign[] = [];

  try {
    const keys = await redis.keys("email:campaigns:v1:*");
    if (keys.length === 0) return campaigns;

    const values = await redis.mget<(EmailCampaign | null)[]>(...keys);
    for (const val of values) {
      if (val) campaigns.push(val);
    }
  } catch (error) {
    console.error("[email-campaigns] Redis scan error:", error);
  }

  return campaigns;
}

/**
 * Get the last sync timestamp from Redis.
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  const redis = getReadOnlyRedis();
  if (!redis) return null;

  try {
    return (await redis.get<string>("email:sync:last")) || null;
  } catch (error) {
    console.error("[email-campaigns] Redis timestamp error:", error);
    return null;
  }
}

/**
 * Set the last sync timestamp in Redis.
 */
export async function setLastSyncTimestamp(timestamp: string): Promise<void> {
  const redis = getReadWriteRedis();
  if (!redis) throw new Error("Redis not configured");

  await redis.set("email:sync:last", timestamp);
}

/**
 * Clear all campaigns for a platform before re-syncing (idempotent rewrite).
 */
export async function clearPlatformCampaigns(platform: EmailCampaignPlatform): Promise<void> {
  const redis = getReadWriteRedis();
  if (!redis) throw new Error("Redis not configured");

  try {
    const keys = await redis.keys(`email:campaigns:v1:${platform}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error(`[email-campaigns] Failed to clear ${platform}:`, error);
  }
}

/**
 * Log unmatched campaigns (raw bytes + platform context) for audit.
 */
export function logUnmatchedCampaign(
  platform: EmailCampaignPlatform,
  platformId: string,
  campaignName: string,
  utmCampaignSearched: string
): void {
  const normalized = normalizeCampaignName(campaignName);
  console.warn(
    `[email-sync] unmatched campaign: platform=${platform} id=${platformId} ` +
      `name="${campaignName}" (normalized: "${normalized}") ` +
      `utm_campaign_sought="${utmCampaignSearched}" bytes=${JSON.stringify(
        Array.from(campaignName).map((c) => c.charCodeAt(0))
      )}`
  );
}
