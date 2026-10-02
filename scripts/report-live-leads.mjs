#!/usr/bin/env node
// READ-ONLY report: what the Hub's Qualified card counts from Redis, i.e. leads
// AFTER the app snapshot's as-of date. Counts only — no PII is printed. Uses
// the READ-ONLY Upstash token; it cannot write.
//
//   UPSTASH_REDIS_REST_KV_REST_API_URL=…  \
//   UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN=…  \
//   node scripts/report-live-leads.mjs
//
// QUALIFIED = the website sent the lead to the app (lib/leadSource.ts). It is
// decided from leads:delivery:v1, never from `source`. This script mirrors
// that logic literally so it runs without a TS toolchain; the app's own copy is
// covered by lib/leadSource.test.mjs.
import { readFileSync } from "node:fs";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
if (!url || !token) {
  console.error("Set UPSTASH_REDIS_REST_KV_REST_API_URL and UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN (read-only).");
  process.exit(1);
}

const AS_OF = JSON.parse(readFileSync(new URL("../config/appLeadsSnapshot.json", import.meta.url), "utf8")).asOf;
const GIVEAWAY_ENTRIES = process.env.GIVEAWAY_ENTRIES_KEY ?? "giveaway:expcon-2026:entries";
const PENDING_GRACE_MS = 10 * 60_000;
const utc = (iso) => { const t = Date.parse(iso ?? ""); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null; };
const parse = (v) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return null; } };

const redis = new Redis({ url, token });
const [rawLeads, rawDeliv, waitlist, rawEntries] = await Promise.all([
  redis.lrange("leads:v1", 0, -1),
  redis.hgetall("leads:delivery:v1"),
  redis.llen("waitlist:leads"),
  redis.hgetall(GIVEAWAY_ENTRIES),
]);
const leads = rawLeads.map(parse).filter(Boolean);
const deliveries = Object.fromEntries(Object.entries(rawDeliv ?? {}).map(([k, v]) => [k, parse(v)]));
const logStart = Object.values(deliveries).map((d) => d?.submittedAt ?? d?.recordedAt).filter(Boolean).sort()[0] ?? null;
const now = Date.now();

function status(l) {
  if (l.source === "waitlist") return null;
  const d = l.leadId ? deliveries[l.leadId] : null;
  if (d) return !d.crmAttempted ? "not-sent" : !d.crmOk ? "failed" : d.unroutable === true ? "unroutable" : "sent";
  const at = Date.parse(l.submittedAt ?? "");
  if (Number.isFinite(at) && now - at < PENDING_GRACE_MS) return "pending";
  if (logStart && l.submittedAt && l.submittedAt < logStart) return "legacy";
  return "unconfirmed";
}
const FLAGGED = new Set(["failed", "unroutable", "not-sent", "unconfirmed"]);

const seen = new Set();
const cells = {}, sources = {}, statuses = {};
let latest = null, onOrBefore = 0, onAsOfDay = 0, dupes = 0, qualified = 0;
for (const l of leads) {
  const day = utc(l.submittedAt);
  if (!day) continue;
  if (day <= AS_OF) { onOrBefore++; if (day === AS_OF) onAsOfDay++; continue; }
  if (!latest || day > latest) latest = day;
  const s = status(l);
  if (!s) continue;
  if (l.leadId) { if (seen.has(l.leadId)) { dupes++; continue; } seen.add(l.leadId); }
  qualified++;
  const cell = (cells[`${day.slice(0, 7)} | ${l.market ?? "(no market)"}`] ??= { qualified: 0, flagged: 0 });
  cell.qualified++; if (FLAGGED.has(s)) cell.flagged++;
  statuses[s] = (statuses[s] ?? 0) + 1;
  const label = l.giveaway ? `giveaway:${l.giveaway} (${l.appReason ?? "?"})` : (l.source ?? "(none)");
  const src = (sources[label] ??= { n: 0 }); src.n++;
}

console.log(`Snapshot as-of ${AS_OF}. Redis leads:v1 holds ${leads.length}; delivery log holds ${Object.keys(deliveries).length}${logStart ? ` (starts ${logStart.slice(0, 10)})` : ""}.`);
console.log(`Excluded as already in the snapshot (UTC date ≤ as-of): ${onOrBefore}, of which ${onAsOfDay} fall ON ${AS_OF} itself (the one ambiguous day).`);
console.log(`waitlist:leads holds ${waitlist} — separate list, never Qualified.\n`);
console.log(`QUALIFIED after ${AS_OF}: ${qualified}   (latest lead ${latest ?? "—"}; ${dupes} duplicate leadIds ignored)`);
console.log("  by what the app did:", Object.entries(statuses).map(([k, v]) => `${k} ${v}`).join(" · ") || "—");
console.log("\nmonth | market → qualified (of which need attention)");
for (const k of Object.keys(cells).sort()) console.log(`  ${k}  →  ${cells[k].qualified} (${cells[k].flagged})`);
console.log("\nby source — a LABEL; every row here reached the app and counts");
for (const [s, v] of Object.entries(sources).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${v.n}  ${s}`);

// eXpcon cross-check: only entrants handed to the app may be Qualified.
const entries = Object.values(rawEntries ?? {}).map(parse).filter(Boolean);
if (entries.length) {
  const byAnswer = {};
  let inLeads = 0;
  for (const e of entries) {
    const k = `${e.listing90 ?? "?"} / app ${e.routing?.app?.status ?? "?"}`;
    byAnswer[k] = (byAnswer[k] ?? 0) + 1;
    if (e.routing?.app?.leadId && seen.has(e.routing.app.leadId)) inLeads++;
  }
  console.log(`\neXpcon giveaway entries (${GIVEAWAY_ENTRIES}): ${entries.length} total; ${inLeads} are in the Qualified feed`);
  for (const [k, v] of Object.entries(byAnswer).sort()) console.log(`  ${v}  ${k}`);
} else {
  console.log(`\neXpcon giveaway entries (${GIVEAWAY_ENTRIES}): none found`);
}
