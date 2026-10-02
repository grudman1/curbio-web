#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY check: does the live feed agree with the app?
//
// Compares the app export's WEBSITE leads (Origin = web_form — what
// sell.curbio.com's /api/lead posts) against the leads the live feed has in
// Redis, over a window of days, matched person by person. Counts and non-PII
// ids only: deal IDs, lead IDs, dates, markets, sources. Never a name or email.
//
//   UPSTASH_REDIS_REST_KV_REST_API_URL=… \
//   UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN=… \
//   node scripts/compare-export-vs-live.mjs [--from 2026-08-29] [--to 2026-10-01]
//
// Window: strictly after --from, through --to (UTC dates). Defaults: --to is
// the new snapshot's asOf (config/appLeadsSnapshot.json); --from
// is required the first time you run it against a new export — pass the
// PREVIOUS snapshot's asOf, so the window is exactly the days the live feed was
// covering on its own.
//
// Run it BEFORE committing a refresh: it reads the raw attribution export in
// data/imports/ and matches on agent email. Emails are compared in memory and
// never printed.
//
// Matching: same agent, created within 3 days of submission, closest first.
// An unmatched row is reported with the most likely reason, so a difference is
// an explanation, not just a number.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const meta = JSON.parse(readFileSync(resolve(ROOT, "config/appLeadsSnapshot.json"), "utf8"));
const FROM = arg("--from");
const TO = arg("--to") ?? meta.asOf;
if (!FROM) {
  console.error("Pass --from <previous snapshot asOf>, e.g. --from 2026-08-29.");
  process.exit(1);
}
const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN;
if (!url || !token) {
  console.error("Set UPSTASH_REDIS_REST_KV_REST_API_URL and UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN (read-only).");
  process.exit(1);
}

// ── market names: app code (export) ↔ CRM name (Redis), from config/markets.ts
const marketsSrc = readFileSync(resolve(ROOT, "config/markets.ts"), "utf8");
const CODE_TO_CRM = {};
for (const m of marketsSrc.matchAll(/crmName:\s*"([^"]+)",\s*appMarketCodes:\s*\[([^\]]*)\]/g)) {
  for (const code of m[2].match(/"([^"]+)"/g) ?? []) CODE_TO_CRM[code.replace(/"/g, "")] = m[1];
}

// ── the export side ──────────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}
// Row 0 is the section band (Identity/Funnel/…); row 1 is the header.
const [, header, ...attrRows] = parseCsv(readFileSync(resolve(ROOT, "data/imports/reports_attributionreport.csv"), "utf8").replace(/^\uFEFF/, ""));
const col = (n) => header.indexOf(n);
const inWindow = (day) => day > FROM && day <= TO;
const exportWeb = attrRows
  .map((r) => ({
    dealId: r[col("Deal ID")],
    at: Date.parse(r[col("Created date")]),
    day: r[col("Created date")].slice(0, 10),
    market: CODE_TO_CRM[r[col("Market code")]] ?? r[col("Market code")],
    origin: r[col("Origin")],
    referral: r[col("Referral source")],
    key: (r[col("Agent email")] ?? "").trim().toLowerCase(),
  }))
  .filter((r) => inWindow(r.day));
const exportAllInWindow = exportWeb.length;
const exportWebOnly = exportWeb.filter((r) => r.origin === "web_form");

// ── the live side (READ-ONLY token) ──────────────────────────────────────────
const parse = (v) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return null; } };
const redis = new Redis({ url, token });
const [rawLeads, rawDeliv] = await Promise.all([
  redis.lrange("leads:v1", 0, -1),
  redis.hgetall("leads:delivery:v1"),
]);
const deliveries = rawDeliv ?? {};
const seenIds = new Set();
const live = rawLeads
  .map(parse)
  .filter(Boolean)
  .filter((l) => l.source !== "waitlist")
  .filter((l) => (l.leadId ? (seenIds.has(l.leadId) ? false : (seenIds.add(l.leadId), true)) : true))
  .map((l) => {
    const d = parse(l.leadId ? deliveries[l.leadId] : null);
    const status = !d ? "no-record" : !d.crmAttempted ? "not-sent" : !d.crmOk ? `failed (HTTP ${d.crmStatus ?? "none"})` : d.unroutable === true ? "unroutable" : "sent";
    const at = Date.parse(l.submittedAt ?? "");
    return {
      leadId: l.leadId ?? "(none)",
      at,
      day: Number.isFinite(at) ? new Date(at).toISOString().slice(0, 10) : "",
      market: l.market ?? "(no market)",
      source: l.giveaway ? `giveaway:${l.giveaway}` : l.source ?? "quote",
      internal: /@curbio\.com\s*$/i.test(l.email ?? ""),
      key: (l.email ?? "").trim().toLowerCase(),
      status,
    };
  })
  .filter((l) => inWindow(l.day));

// ── match: same agent, within 3 days, closest first ─────────────────────────
const WINDOW_MS = 3 * 86_400_000;
const pairs = [];
for (const l of live) for (const e of exportWebOnly) {
  if (l.key && l.key === e.key && Math.abs(e.at - l.at) <= WINDOW_MS) pairs.push({ l, e, gap: Math.abs(e.at - l.at) });
}
pairs.sort((a, b) => a.gap - b.gap);
const usedL = new Set(), usedE = new Set(), matched = [];
for (const p of pairs) {
  if (usedL.has(p.l) || usedE.has(p.e)) continue;
  usedL.add(p.l); usedE.add(p.e); matched.push(p);
}
const liveOnly = live.filter((l) => !usedL.has(l));
const exportOnly = exportWebOnly.filter((e) => !usedE.has(e));
// A live lead the app has under a DIFFERENT origin (e.g. the HSM re-keyed it).
const otherOriginByKey = new Map();
for (const e of exportWeb) if (e.origin !== "web_form") (otherOriginByKey.get(e.key) ?? otherOriginByKey.set(e.key, []).get(e.key)).push(e);

// ── report ───────────────────────────────────────────────────────────────────
const cells = {};
const bump = (k, f) => { (cells[k] ??= { export: 0, live: 0, matched: 0 })[f]++; };
for (const e of exportWebOnly) bump(`${e.day.slice(0, 7)} | ${e.market}`, "export");
for (const l of live) bump(`${l.day.slice(0, 7)} | ${l.market}`, "live");
for (const { e } of matched) bump(`${e.day.slice(0, 7)} | ${e.market}`, "matched");

console.log(`Window: after ${FROM} through ${TO} (UTC). Export holds ${exportAllInWindow} deals in it; ${exportWebOnly.length} are website leads (Origin web_form).`);
console.log(`Live feed holds ${live.length} leads in it. Matched person-to-person: ${matched.length}.\n`);
console.log("month | market                 export web_form   live   matched");
for (const k of Object.keys(cells).sort()) {
  const c = cells[k];
  const flag = c.export === c.live && c.live === c.matched ? "" : "   ←";
  console.log(`  ${k.padEnd(24)} ${String(c.export).padStart(8)} ${String(c.live).padStart(9)} ${String(c.matched).padStart(9)}${flag}`);
}

function liveReason(l) {
  if (l.internal) return "internal @curbio.com test — the app refuses these (403)";
  if (l.status.startsWith("failed")) return `delivery ${l.status} — the app never got it`;
  if (l.status === "unroutable") return "no market and no ZIP — accepted but cannot become a deal";
  if (l.status === "not-sent") return "the lead route had no CRM webhook";
  const other = (otherOriginByKey.get(l.key) ?? []).find((e) => Math.abs(e.at - l.at) <= WINDOW_MS);
  if (other) return `in the app as deal ${other.dealId} with Origin "${other.origin || "(blank)"}" / referral "${other.referral}" — re-keyed, not missing`;
  if (!l.key) return "no email on the live lead — cannot be matched";
  return `delivered (${l.status}) but no deal for this agent within 3 days — merged into another deal, deleted, or created under another agent`;
}
console.log(`\nLIVE ONLY (${liveOnly.length}) — in Redis, not a website deal in the export:`);
for (const l of liveOnly) console.log(`  ${l.day}  ${l.market.padEnd(12)} ${l.source.padEnd(26)} lead ${l.leadId}  → ${liveReason(l)}`);

console.log(`\nEXPORT ONLY (${exportOnly.length}) — a website deal in the app with no live lead:`);
for (const e of exportOnly) {
  const near = live.find((l) => l.key === e.key);
  const why = near
    ? `same agent has live lead ${near.leadId} on ${near.day} — more than 3 days apart`
    : "no lead for this agent in Redis — posted before Redis persistence, a Redis write failure, or a web_form deal created in the app by hand";
  console.log(`  ${e.day}  ${e.market.padEnd(12)} deal ${e.dealId}  referral "${e.referral}"  → ${why}`);
}
