// ─────────────────────────────────────────────────────────────────────────────
// One-time import: WordPress "Redirection" plugin export → the Links
// registry's seed (config/linkRegistrySeed.json).
//
//   node scripts/import-redirect-log.mjs "/path/to/redirection-export.csv" 2026-07-28
//
// Every live vanity redirect on curbio.com becomes a registry row with status
// live (disabled → retired), owner unknown — so the registry starts as a TRUE
// INVENTORY of what is already in the world, not an empty table. Channel is
// derived from the target's utm_source by the same closed-list rule the lead
// boundary uses: unknown sources (PM, paid_partner, hs_automation…) map to
// direct, and the raw value is kept for audit.
//
// `hits` from the export are LIFETIME hits as of the export date — the UI
// labels them that way and never dresses them up as 30-day clicks.
//
// NOTE: these redirects live in the WordPress Redirection plugin. They must
// be recreated at website cutover or every printed/shared link through them
// dies — which is exactly the kind of fact the registry exists to surface.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [, , csvPath, exportedAt] = process.argv;
if (!csvPath || !/^\d{4}-\d{2}-\d{2}$/.test(exportedAt ?? "")) {
  console.error("usage: node scripts/import-redirect-log.mjs <redirection-export.csv> <exported YYYY-MM-DD>");
  process.exit(1);
}

// Minimal CSV parser (quoted fields, embedded commas).
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
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

const VALID_CHANNELS = new Set([
  "email", "paid_search", "paid_social", "creator", "hsm_field",
  "partnership", "organic", "referral", "direct",
]);

const raw = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
const [header, ...records] = parseCsv(raw);
const col = Object.fromEntries(header.map((h, i) => [h, i]));
for (const required of ["source", "target", "type", "hits", "status"]) {
  if (!(required in col)) {
    console.error(`missing expected column "${required}" — is this a Redirection export?`);
    process.exit(1);
  }
}

function utmOf(target) {
  try {
    const url = new URL(target, "https://curbio.com");
    return {
      source: url.searchParams.get("utm_source"),
      medium: url.searchParams.get("utm_medium"),
      campaign: url.searchParams.get("utm_campaign"),
      referralSourceId: url.searchParams.get("referral_source_id"),
    };
  } catch {
    return { source: null, medium: null, campaign: null, referralSourceId: null };
  }
}

const seen = new Set();
const rows = [];
let skipped = 0;
for (const r of records) {
  if (r[col.type] !== "url") { skipped++; continue; }
  const source = r[col.source].trim();
  const target = r[col.target].trim();
  if (!source || !target) { skipped++; continue; }

  // Stable id from the redirect path; disambiguate duplicates.
  let id = `seed:${source.replace(/^\/+|\/+$/g, "").toLowerCase() || "root"}`;
  while (seen.has(id)) id += "+";
  seen.add(id);

  const utm = utmOf(target);
  const rawSource = (utm.source ?? "").trim().toLowerCase();

  rows.push({
    id,
    label: source.replace(/^\/+|\/+$/g, "") || "/",
    type: "redirect",
    owner: "unknown",
    channel: VALID_CHANNELS.has(rawSource) ? rawSource : "direct",
    rawUtmSource: utm.source,
    medium: utm.medium ?? "",
    campaign: utm.campaign ?? "",
    referralSourceId: utm.referralSourceId,
    market: "all",
    destination: target,
    trackedUrl: target,
    shortLink: `curbio.com${source.replace(/\/+$/, "") || "/"}`,
    status: r[col.status] === "active" ? "live" : "retired",
    lifetimeHits: Number(r[col.hits]) || 0,
    createdAt: null, // the export carries no creation date — never invent one
  });
}

const out = {
  exportedAt,
  source: `WordPress Redirection export (${rows.length} url redirects, ${skipped} non-url rows skipped)`,
  generatedBy: "scripts/import-redirect-log.mjs",
  rows,
};

const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../config/linkRegistrySeed.json");
writeFileSync(dest, JSON.stringify(out));
console.log(`wrote ${rows.length} redirect rows (${skipped} skipped) → ${dest}`);
