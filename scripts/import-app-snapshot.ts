// ─────────────────────────────────────────────────────────────────────────────
// Historical import: app snapshot CSVs → config/appLeadsSnapshot.json
//
//   npx tsx scripts/import-app-snapshot.ts
//
// One-time snapshot from the company app + Mailchimp, exported 2026-08-29.
// Reads the committed CSVs under data/imports/ and writes the enriched lead
// snapshot the whole dashboard reads. IDEMPOTENT: rerunning replaces the
// snapshot wholesale — it never appends, never duplicates.
//
// What it does, in order:
//   1. Joins the three app reports. The attribution report is the spine (it
//      carries Deal IDs and the sparse real UTMs); the leads report joins on
//      exact (created date, agent email) — verified unique both sides; the
//      sales report joins won projects on (agent email, created minute).
//      UNJOINABLE ROWS ARE REPORTED, NEVER GUESSED.
//   2. Backfills channel + entryPoint from config/referral-backfill.ts
//      (Attribution Spec v3.2 §8). Real UTMs always win — a row with a real
//      channel signal stays `attribution: "measured"` and the mapping never
//      touches it; mapped rows carry `attribution: "inferred"`.
//   3. Correlates backfilled email leads against Mailchimp send times —
//      most recent qualifying campaign within 72h before lead creation,
//      market-token aware. Matches get utm_campaign = the slugified name and
//      `attribution: "inferred-by-date"`.
//   4. Attaches won-project revenue (project + unambiguously-matched change
//      orders) to won deals.
//
// PII: agent name, agent email, deal title, and brokerage are used ONLY for
// the joins inside this process and are dropped at the boundary — they never
// reach the JSON. Deal IDs are kept: they are not PII, and they are the key
// the live API supersedes these records on when it lands.
//
// The import report (join coverage, channel distribution before/after,
// correlation stats) is printed and written to data/imports/import-report.json.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveChannel, VALID_CHANNELS, type Channel } from "../lib/channels";
import {
  backfillForReferralSource,
  BACKFILL_MAPPING_VERSION,
  type AttributionQuality,
} from "../config/referral-backfill";
import { reportingMarketForAppCode } from "../config/market-map";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IMPORTS = resolve(ROOT, "data/imports");
const SNAPSHOT_DATE = "2026-08-29";

// ── CSV ──────────────────────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function loadCsv(name: string): string[][] {
  return parseCsv(readFileSync(resolve(IMPORTS, name), "utf8").replace(/^﻿/, ""));
}

function indexer(header: string[]): (name: string) => number {
  const map = new Map(header.map((h, i) => [h, i] as const));
  return (name) => {
    const i = map.get(name);
    if (i === undefined) throw new Error(`missing expected column "${name}"`);
    return i;
  };
}

const money = (s: string): number | null => {
  const n = Number(String(s).replace(/[',]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
};

// ── Load the three app reports ───────────────────────────────────────────────

const attrRows = loadCsv("reports_attributionreport__10_.csv");
// Row 0 is the section band (Identity/Funnel/Attribution/Agent); row 1 is the header.
const A = indexer(attrRows[1]);
const attr = attrRows.slice(2);

const leadRows = loadCsv("reports_leadsreport__3_.csv");
const L = indexer(leadRows[0]);
const leads = leadRows.slice(1);

const salesRows = loadCsv("reports_salesreport__1_.csv");
const S = indexer(salesRows[0]);
const sales = salesRows.slice(1);

// ── 1. Join leads → attribution on exact (created date, agent email) ─────────

const leadByKey = new Map<string, string[]>();
const leadKeyDupes: string[] = [];
for (const r of leads) {
  const key = `${r[L("Created date")]}|${r[L("Agent email")].trim().toLowerCase()}`;
  if (leadByKey.has(key)) leadKeyDupes.push(key);
  leadByKey.set(key, r);
}

type Joined = {
  attr: string[];
  lead: string[] | null;
};
const joined: Joined[] = [];
const unjoinedAttr: { dealId: string; created: string; market: string }[] = [];
for (const r of attr) {
  const key = `${r[A("Created date")]}|${r[A("Agent email")].trim().toLowerCase()}`;
  const lead = leadByKey.get(key) ?? null;
  if (!lead) {
    unjoinedAttr.push({
      dealId: r[A("Deal ID")],
      created: r[A("Created date")].slice(0, 10),
      market: r[A("Market code")],
    });
  }
  joined.push({ attr: r, lead });
}

// ── 2. Sales report → won-deal revenue ───────────────────────────────────────
// Projects (non-change-order rows) join on (agent email, created minute); a
// miss retries at day precision ONLY when exactly one candidate exists.
// Change orders attach by agent email ONLY when that agent has exactly one
// matched won project — anything ambiguous is reported, not guessed.

const minuteKey = (iso: string, email: string) => `${iso.slice(0, 16)}|${email.trim().toLowerCase()}`;
const dayKey = (iso: string, email: string) => `${iso.slice(0, 10)}|${email.trim().toLowerCase()}`;

const attrByMinute = new Map<string, Joined>();
const attrByDay = new Map<string, Joined[]>();
for (const j of joined) {
  const created = j.attr[A("Created date")];
  const email = j.attr[A("Agent email")];
  attrByMinute.set(minuteKey(created, email), j);
  const dk = dayKey(created, email);
  attrByDay.set(dk, [...(attrByDay.get(dk) ?? []), j]);
}

/** dealId → accumulated revenue from the sales report. */
const revenueByDealId = new Map<string, number>();
/** agent email → dealIds of won projects that matched (for change orders). */
const wonProjectsByEmail = new Map<string, Set<string>>();
const unjoinableSales: { project: string; type: string; reason: string }[] = [];

const projects = sales.filter((r) => r[S("Deal type")] !== "Change order");
const changeOrders = sales.filter((r) => r[S("Deal type")] === "Change order");

for (const r of projects) {
  const email = r[S("Agent email")].trim().toLowerCase();
  const created = r[S("Created date")];
  const rev = money(r[S("Revenue")]);
  let hit = attrByMinute.get(minuteKey(created, email)) ?? null;
  if (!hit) {
    const candidates = (attrByDay.get(dayKey(created, email)) ?? []);
    hit = candidates.length === 1 ? candidates[0] : null;
    if (!hit) {
      unjoinableSales.push({
        project: r[S("Project")],
        type: r[S("Deal type")],
        reason: !email
          ? "no agent email on the sales row"
          : candidates.length > 1
            ? `ambiguous: ${candidates.length} deals for this agent on this day`
            : "no deal for this agent at this created date (minute or day)",
      });
      continue;
    }
  }
  const dealId = hit.attr[A("Deal ID")];
  if (rev != null) revenueByDealId.set(dealId, (revenueByDealId.get(dealId) ?? 0) + rev);
  if (email) {
    const set = wonProjectsByEmail.get(email) ?? new Set<string>();
    set.add(dealId);
    wonProjectsByEmail.set(email, set);
  }
}

for (const r of changeOrders) {
  const email = r[S("Agent email")].trim().toLowerCase();
  const rev = money(r[S("Revenue")]);
  const won = email ? wonProjectsByEmail.get(email) : undefined;
  if (!email || !won || won.size !== 1) {
    unjoinableSales.push({
      project: r[S("Project")],
      type: "Change order",
      reason: !email
        ? "no agent email on the change order"
        : !won
          ? "agent has no matched won project"
          : `ambiguous: agent has ${won.size} matched won projects`,
    });
    continue;
  }
  const dealId = [...won][0];
  if (rev != null) revenueByDealId.set(dealId, (revenueByDealId.get(dealId) ?? 0) + rev);
}

// ── 3. Mailchimp campaigns → logical campaigns ───────────────────────────────

const campRows = loadCsv("mailchimp-campaigns.csv");
const C = indexer(campRows[0]);
const campaigns = campRows.slice(1);

const baseName = (n: string) => n.replace(/\s*\(copy \d+\)\s*$/i, "").trim();
const slugify = (n: string) =>
  n.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Campaign-name market token → reporting market codes it addresses.
 *  DMV covers the DC-area trio. A name with no token is generic: any market. */
const MARKET_TOKENS: Record<string, string[]> = {
  MARYLAND: ["MD"],
  DFW: ["DAL"],
  DALLAS: ["DAL"],
  ATLANTA: ["ATL"],
  LA: ["LA"],
  NOVA: ["NVA"],
  DC: ["DC"],
  DMV: ["DC", "MD", "NVA"],
  SEATTLE: ["SEA"],
  RIVERSIDE: ["RS"],
};

type LogicalCampaign = {
  slug: string;
  name: string;
  /** Reporting-market codes the name addresses; null = generic (any market). */
  markets: string[] | null;
  /** Send timestamps (ms), ascending — one entry per collapsed send. */
  sends: number[];
};

// Exclude tests: name contains "test", or the send went to fewer than 20.
const qualifying = campaigns.filter((r) => {
  const name = baseName(r[C("Campaign")]);
  if (/test/i.test(name)) return false;
  const sent = Number(r[C("Emails sent")].replace(/,/g, ""));
  return sent >= 20;
});

// Mailchimp export timestamps carry no zone; they are treated as UTC here.
// The 72h window absorbs the actual offset, and tie-breaks compare sends on
// the same clock, so ordering is unaffected.
const sendTime = (r: string[]) => Date.parse(r[C("Date Sent")].replace(" ", "T") + "Z");

const logicalBySlug = new Map<string, LogicalCampaign>();
let collapsedSends = 0;
for (const r of qualifying) {
  const name = baseName(r[C("Campaign")]);
  const slug = slugify(name);
  const t = sendTime(r);
  const tokens = name.toUpperCase().split(/[^A-Z0-9&\]]+/).filter(Boolean);
  const markets = new Set<string>();
  for (const tok of tokens) for (const m of MARKET_TOKENS[tok] ?? []) markets.add(m);
  const existing = logicalBySlug.get(slug);
  if (existing) {
    // Same-name sends within 24h collapse into the one logical campaign.
    if (existing.sends.some((s) => Math.abs(s - t) <= 86_400_000)) collapsedSends++;
    existing.sends.push(t);
    existing.sends.sort((a, b) => a - b);
  } else {
    logicalBySlug.set(slug, {
      slug,
      name,
      markets: markets.size ? [...markets] : null,
      sends: [t],
    });
  }
}
const logicalCampaigns = [...logicalBySlug.values()];
const EARLIEST_SEND = Math.min(...logicalCampaigns.flatMap((c) => c.sends));

/** Most recent qualifying campaign sent within 72h before `leadTime`, market-
 *  aware. Returns null when nothing qualifies. `ambiguous` when two or more
 *  distinct logical campaigns qualify — the nearer send wins, flagged. */
function correlate(leadTime: number, reportingMarket: string | null): {
  slug: string;
  ambiguous: boolean;
} | null {
  const WINDOW = 72 * 3_600_000;
  const candidates: { slug: string; send: number }[] = [];
  for (const c of logicalCampaigns) {
    if (c.markets && (!reportingMarket || !c.markets.includes(reportingMarket))) continue;
    // Latest send inside (leadTime - 72h, leadTime].
    let best = -1;
    for (const s of c.sends) {
      if (s <= leadTime && leadTime - s <= WINDOW && s > best) best = s;
    }
    if (best > 0) candidates.push({ slug: c.slug, send: best });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.send - a.send);
  return { slug: candidates[0].slug, ambiguous: candidates.length > 1 };
}

// ── 4. Build the enriched snapshot deals ─────────────────────────────────────

type SnapshotDealOut = {
  dealId: string;
  marketCode: string;
  date: string;
  month: string;
  stage: string;
  status: string;
  referralSource: string;
  dealType: string;
  value: number | null;
  /** Won-project revenue from the sales report, where it joined. */
  revenue?: number;
  channel: Channel;
  entryPoint: "web_form" | "phone" | "manual" | "inbound_email";
  attribution: AttributionQuality;
  /** low-confidence backfill entries, flagged for reclassification. */
  lowConfidence?: true;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  /** Correlation matched ≥2 candidate campaigns; the nearer send won. */
  campaignAmbiguous?: true;
};

const CHANNEL_SET = new Set<string>(VALID_CHANNELS);
const deals: SnapshotDealOut[] = [];
const stats = {
  measured: 0,
  inferred: 0,
  inferredByDate: 0,
  correlationCandidates: 0,
  correlationMatched: 0,
  correlationAmbiguous: 0,
  preSendDataLeads: 0,
  utmWhitespaceTrimmed: 0,
  unknownMarketCodes: [] as string[],
};
const byChannelBefore = new Map<string, number>();
const byChannelAfter = new Map<string, number>();
const campaignCounts = new Map<string, number>();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

const cleanUtm = (s: string): string | undefined => {
  const t = s.replace(/[\s ]+$/g, "").trim();
  if (t !== s && s.trim()) stats.utmWhitespaceTrimmed++;
  return t || undefined;
};

for (const j of joined) {
  const a = j.attr;
  const created = a[A("Created date")];
  const date = created.slice(0, 10);
  const referralSource = a[A("Referral source")].trim();
  const marketCode = a[A("Market code")].trim();
  if (!reportingMarketForAppCode(marketCode) && !stats.unknownMarketCodes.includes(marketCode)) {
    stats.unknownMarketCodes.push(marketCode);
  }

  const rawChannel = a[A("Channel")].trim().toLowerCase();
  const utmSource = cleanUtm(a[A("UTM source")]);
  const utmMedium = cleanUtm(a[A("UTM medium")]);
  const utmCampaign = cleanUtm(a[A("UTM campaign")]);
  const utmContent = cleanUtm(a[A("UTM content")]);
  const origin = a[A("Origin")].trim();

  // What the raw export said, before any backfill — for the report.
  bump(byChannelBefore, CHANNEL_SET.has(rawChannel) ? rawChannel : "(none)");

  const deal: SnapshotDealOut = {
    dealId: a[A("Deal ID")].trim(),
    marketCode,
    date,
    month: date.slice(0, 7),
    stage: a[A("Stage")].trim(),
    status: a[A("Status")].trim(),
    referralSource, // verbatim, never normalised — spec §3b
    dealType: (j.lead?.[L("Deal type")] ?? "Seller").trim(),
    value: money(a[A("Deal value")]),
    channel: "direct",
    entryPoint: "web_form",
    attribution: "inferred",
  };
  const revenue = revenueByDealId.get(deal.dealId);
  if (revenue != null) deal.revenue = Math.round(revenue * 100) / 100;

  const derivedFromUtm = deriveChannel(utmSource);
  if (CHANNEL_SET.has(rawChannel)) {
    // Real channel captured at submission — the web door working. Measured;
    // the mapping never touches it.
    deal.channel = rawChannel as Channel;
    deal.attribution = "measured";
    deal.entryPoint =
      origin === "web_form" || origin === "phone" || origin === "manual" || origin === "inbound_email"
        ? origin
        : "web_form";
  } else if (utmSource && derivedFromUtm !== "direct") {
    // No Channel column, but a real utm_source that derives one (spec §4).
    deal.channel = derivedFromUtm;
    deal.attribution = "measured";
  } else {
    // Backfill: channel + entryPoint from the referral-source mapping.
    const entry = backfillForReferralSource(referralSource);
    deal.channel = entry.channel;
    deal.entryPoint = entry.entryPoint;
    deal.attribution = "inferred";
    if (entry.confidence === "low") deal.lowConfidence = true;
    if (entry.utm_source && !utmSource) deal.utmSource = entry.utm_source;
    if (entry.utm_medium && !utmMedium) deal.utmMedium = entry.utm_medium;
    // partnership only: campaign = partner name, verbatim (spec §3b).
    if (entry.utm_campaign && !utmCampaign) deal.utmCampaign = entry.utm_campaign;
  }

  // Real UTM fields ride along verbatim wherever present.
  if (utmSource) deal.utmSource = utmSource;
  if (utmMedium) deal.utmMedium = utmMedium;
  if (utmCampaign) deal.utmCampaign = utmCampaign;
  if (utmContent) deal.utmContent = utmContent;

  // Mailchimp correlation — ONLY backfilled email leads with no real campaign.
  if (deal.attribution === "inferred" && deal.channel === "email" && !utmCampaign) {
    const t = Date.parse(created);
    if (t < EARLIEST_SEND) {
      stats.preSendDataLeads++; // no send data exists before Jan 30 — no campaign
    } else {
      stats.correlationCandidates++;
      const rm = reportingMarketForAppCode(marketCode);
      const hit = correlate(t, rm?.code ?? null);
      if (hit) {
        deal.utmCampaign = hit.slug;
        deal.attribution = "inferred-by-date";
        if (hit.ambiguous) {
          deal.campaignAmbiguous = true;
          stats.correlationAmbiguous++;
        }
        stats.correlationMatched++;
      }
    }
  }

  if (deal.attribution === "measured") stats.measured++;
  else if (deal.attribution === "inferred-by-date") stats.inferredByDate++;
  else stats.inferred++;
  bump(byChannelAfter, deal.channel);
  if (deal.utmCampaign) bump(campaignCounts, deal.utmCampaign);
  deals.push(deal);
}

deals.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));

// ── Write the snapshot (full replace — idempotent) ───────────────────────────

const out = {
  asOf: SNAPSHOT_DATE,
  source: "app-import",
  generatedBy: `scripts/import-app-snapshot.ts · backfill mapping v${BACKFILL_MAPPING_VERSION}`,
  deals,
};
writeFileSync(resolve(ROOT, "config/appLeadsSnapshot.json"), JSON.stringify(out));

// ── Report ───────────────────────────────────────────────────────────────────

const sortDesc = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
const report = {
  snapshotDate: SNAPSHOT_DATE,
  mappingVersion: BACKFILL_MAPPING_VERSION,
  rowsImported: deals.length,
  join: {
    attributionRows: attr.length,
    leadsRows: leads.length,
    leadsJoined: joined.filter((j) => j.lead).length,
    attrRowsWithoutLeadsRow: unjoinedAttr,
    leadKeyDuplicates: leadKeyDupes,
    salesRows: sales.length,
    salesProjects: projects.length,
    salesChangeOrders: changeOrders.length,
    salesUnjoinable: unjoinableSales,
    wonDealsWithRevenue: revenueByDealId.size,
  },
  attribution: {
    measured: stats.measured,
    inferred: stats.inferred,
    inferredByDate: stats.inferredByDate,
    channelBefore: Object.fromEntries(sortDesc(byChannelBefore)),
    channelAfter: Object.fromEntries(sortDesc(byChannelAfter)),
    utmWhitespaceTrimmed: stats.utmWhitespaceTrimmed,
    unknownMarketCodes: stats.unknownMarketCodes,
  },
  correlation: {
    logicalCampaigns: logicalCampaigns.length,
    collapsedDuplicateSends: collapsedSends,
    emailLeadsEligible: stats.correlationCandidates,
    matched: stats.correlationMatched,
    ambiguous: stats.correlationAmbiguous,
    preSendDataLeads: stats.preSendDataLeads,
    topCampaigns: sortDesc(campaignCounts).slice(0, 15),
  },
};
writeFileSync(resolve(IMPORTS, "import-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`\nwrote ${deals.length} deals → config/appLeadsSnapshot.json`);
