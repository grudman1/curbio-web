// ─────────────────────────────────────────────────────────────────────────────
// CONTACT STORE — one record per person, across Instantly, ActiveCampaign and
// the App.
//
// This is the glue neither platform can be. Instantly does not know AC exists,
// AC does not know Instantly exists, and neither can see an App deal. The
// dashboard is the only place all three are visible at once, which is why the
// PROMOTION GATE (cold → warm) lives here and nowhere else.
//
// WHAT THIS IS NOT: a second CRM. Every record is a READ-ONLY MIRROR. Nothing
// in the dashboard edits a contact — an editable mirror is a competing version
// of the truth, and the platforms would start disagreeing with it the moment
// someone typed into it.
//
// WHAT THIS DELIBERATELY DOES NOT SHOW: anything the platforms show natively.
// No open-rate charts, no warmup scores, no per-step sequence stats. If AC or
// Instantly renders it, we do not.
//
// THE PART THAT CANNOT BE BACKFILLED: status transitions. Campaign stats can
// be re-pulled from either API at any time; the moment a person moved from
// cold to engaged, and which campaign did it, exists only if it was written
// down when it happened. Both platforms go live this week. Every transition is
// appended immutably from the first send.
//
// Storage: Upstash Redis, the SAME connection the lead store uses. No second
// store.
// ─────────────────────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";

// ── Identity ─────────────────────────────────────────────────────────────────

/**
 * THE identity key. Normalized email, full stop.
 *
 * Campaign is an attribute of an EVENT, never part of identity — a person in
 * two sequences is one person, and keying on (email, campaign) would produce
 * two records for one human and promote them twice.
 *
 * Zero-width characters are stripped, not just trimmed: they survive copy-paste
 * out of spreadsheets and CRM exports, are invisible in every UI that would
 * show you the bug, and would silently split one person into two records.
 * Same treatment normalizeCampaignName() applies, for the same reason.
 */
export function normalizeEmail(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[​‌‍⁠﻿]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

/** A syntactically usable address. Deliberately loose — this rejects junk, it
 *  does not adjudicate deliverability, which is the platforms' job. */
export function isUsableEmail(normalized: string): boolean {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(normalized);
}

// ── Status ───────────────────────────────────────────────────────────────────

/**
 * Status is COMPUTED from the source flags below, never stored as a field you
 * can set. A stored status is a value that can disagree with its own inputs;
 * a computed one cannot.
 */
export type ContactStatus = "cold" | "engaged" | "opted_in" | "rfq" | "customer";

/** Highest wins. Order is the funnel: presence in the App outranks a mailing
 *  list, which outranks a positive reply, which outranks merely being cold. */
const STATUS_RANK: Record<ContactStatus, number> = {
  cold: 0,
  engaged: 1,
  opted_in: 2,
  rfq: 3,
  customer: 4,
};

export type ContactSources = {
  /** Present as a lead in Instantly (cold). */
  inInstantly: boolean;
  /** Instantly marked Interested, or a positive custom label. */
  instantlyPositive: boolean;
  /** ACTIVE subscriber on at least one AC list.
   *
   *  Per-LIST, not per-contact: the AC contact object's own `status` is null
   *  for every contact in this account (verified live against 116,995 of
   *  them). Subscription state lives on contactLists[].status, where '1' is
   *  active and '2' unsubscribed. Reading contact.status would have marked
   *  every single person un-subscribed. */
  acActive: boolean;
  /** A deal exists in the App. */
  appDeal: boolean;
  /** A Won deal exists in the App. */
  appWonDeal: boolean;
};

export function computeStatus(s: ContactSources): ContactStatus {
  if (s.appWonDeal) return "customer";
  if (s.appDeal) return "rfq";
  if (s.acActive) return "opted_in";
  if (s.instantlyPositive) return "engaged";
  return "cold";
}

export function statusRank(s: ContactStatus): number {
  return STATUS_RANK[s];
}

export const STATUS_LABEL: Record<ContactStatus, string> = {
  cold: "Cold",
  engaged: "Engaged",
  opted_in: "Opted in",
  rfq: "RFQ",
  customer: "Customer",
};

// ── Records ──────────────────────────────────────────────────────────────────

export type ContactRecord = {
  /** Normalized email — the identity key. Also the hash field. */
  email: string;
  sources: ContactSources;
  /** Free-form identity fields, best-effort, last writer wins per field. Only
   *  ever filled from a platform; never edited here. */
  firstName?: string;
  lastName?: string;
  companyName?: string;
  website?: string;
  phone?: string;
  /** Campaign that produced the FIRST qualifying (positive) event. */
  firstPositiveCampaign?: string;
  firstPositiveAt?: string;
  /** Reply text captured with that event, when the payload carried one. */
  firstPositiveReplyText?: string;
  /**
   * The status computed at the last write. Stored ONLY so the next write can
   * tell whether the status changed and therefore whether to append a
   * transition. It is never read as the answer to "what status is this?" —
   * computeStatus() is. Naming it `observed` rather than `status` keeps that
   * distinction visible at every call site.
   */
  lastObservedStatus: ContactStatus;
  firstSeenAt: string;
  updatedAt: string;
};

/** Immutable. Appended, never rewritten. This is the record that cannot be
 *  reconstructed later from any API. */
export type StatusTransition = {
  email: string;
  from: ContactStatus | null;
  to: ContactStatus;
  at: string;
  /** Campaign that caused it, when the triggering event named one. */
  sourceCampaign: string | null;
  /** Which integration wrote it — instantly | activecampaign | app. */
  source: string;
};

export const EMPTY_SOURCES: ContactSources = {
  inInstantly: false,
  instantlyPositive: false,
  acActive: false,
  appDeal: false,
  appWonDeal: false,
};

// ── Redis keys ───────────────────────────────────────────────────────────────
//
// One namespace, versioned, alongside the existing `email:campaigns:v1:*`.

export const K = {
  /** Hash: field = normalized email, value = ContactRecord JSON. A hash rather
   *  than a key per contact because AC alone carries ~113k active subscribers
   *  and 113k top-level keys is a scan problem, not a store. */
  contacts: "email:contacts:v1",
  /** List, newest first. Immutable transition log. */
  transitions: "email:contacts:transitions:v1",
  /** Hash: field = normalized email → PromotionEntry. */
  promotionQueue: "email:promotion:queue:v1",
  /** Hash: field = normalized email → PromotionDecision. */
  promotionDecisions: "email:promotion:decisions:v1",
  /** Raw webhook payloads, one key each, timestamped. Written BEFORE parsing. */
  rawEvent: (iso: string, id: string) => `email:events:raw:${iso}:${id}`,
  /** List of event_type strings we did not recognise, for surfacing. */
  unknownEvents: "email:events:unknown:v1",
  /** Set of every raw event_type string ever seen — the vocabulary we are
   *  learning from live traffic rather than guessing. */
  seenEventTypes: "email:events:types:v1",
  /** Where the AC walk got to: { list, offset }. PERSISTED rather than passed
   *  in the URL, because a cron cannot advance a query parameter — a scheduled
   *  job reading its cursor from the request would re-sync page 0 of list 0 on
   *  every run, forever, and look like it was working. */
  syncCursor: "email:contacts:sync:cursor:v1",
};

/** Transition log cap. High: this is the record that cannot be rebuilt, so it
 *  is the last thing that should silently roll off. */
export const TRANSITIONS_MAX = 10000;
/** Unknown-event samples kept for surfacing. The full payloads live in the
 *  raw keys regardless; this is only the queue that puts them in front of a
 *  human. */
export const UNKNOWN_EVENTS_MAX = 200;

// ── Redis access ─────────────────────────────────────────────────────────────
// Same env vars and same split as config/emailCampaigns.ts — read-write for
// writers, read-only token for anything that renders.

export function getReadWriteRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export function getReadOnlyRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}
