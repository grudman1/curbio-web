// ─────────────────────────────────────────────────────────────────────────────
// Checks for how a team-lead coffee-card visit is attributed, against the REAL
// settings (lib/channels.ts, config/campaigns/coffee.ts, config/linkRegistry.ts):
//
//   npx tsx scripts/test-coffee-attribution.mjs
//
// (tsx, not plain node: the modules import each other without extensions.)
// No build, no network. Run it after ANY change to lib/channels.ts, the coffee
// config, or the mail link row.
//
// The card prints curbio.com/coffee; WordPress redirects it to
//   https://sell.curbio.com/lp/coffee?utm_source=mail&utm_medium=direct_mail&utm_campaign=teamlead-starbucks-nov
// and the lead must land as Channel mail / teamlead-starbucks-nov / web_form.
// ─────────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import { deriveChannel, VALID_CHANNELS, CHANNEL_COLORS } from "../lib/channels.ts";
import { CHANNEL_FUNNEL_ORDER, CHANNEL_LABELS } from "../config/marketingHub.ts";
import { CAMPAIGNS, CAMPAIGN_BY_SLUG } from "../config/campaigns/index.ts";
import { coffee } from "../config/campaigns/coffee.ts";
import { SEED_LINKS } from "../config/linkRegistry.ts";
import { isPickerPageSource, withMarketSlug } from "../lib/marketGate.ts";
import { marketBaseFor, campaignBaseFor, campaignHref } from "../lib/campaignBase.ts";

const REDIRECT =
  "https://sell.curbio.com/lp/coffee?utm_source=mail&utm_medium=direct_mail&utm_campaign=teamlead-starbucks-nov";
const CAMPAIGN = "teamlead-starbucks-nov";
const BEFORE_MAIL = ["email", "paid_search", "paid_social", "creator", "hsm_field", "partnership", "organic", "referral", "direct", "event"];

let n = 0;
const check = (name, fn) => { fn(); n++; console.log(`  ok  ${name}`); };

check("1. THE REDIRECT URL derives to mail, with the campaign and medium riding alongside", () => {
  const p = new URL(REDIRECT).searchParams;
  assert.equal(deriveChannel(p.get("utm_source")), "mail");
  assert.equal(p.get("utm_campaign"), CAMPAIGN);
  assert.equal(p.get("utm_medium"), "direct_mail");
  assert.equal(new URL(REDIRECT).pathname, `/lp/${coffee.slug}`);
});
check("1b. mail is in the closed list, spelled exactly, with a colour, a label and a funnel slot", () => {
  assert.ok(VALID_CHANNELS.includes("mail"));
  assert.equal(VALID_CHANNELS.length, 11);
  assert.ok(CHANNEL_COLORS.mail); assert.ok(CHANNEL_LABELS.mail); assert.ok(CHANNEL_FUNNEL_ORDER.includes("mail"));
  for (const c of VALID_CHANNELS) { assert.ok(CHANNEL_COLORS[c], c); assert.ok(CHANNEL_LABELS[c], c); assert.ok(CHANNEL_FUNNEL_ORDER.includes(c), c); }
});
check("1c. case and whitespace are tolerated — ' Mail ' is still mail", () => {
  for (const v of ["mail", "MAIL", " Mail ", "mail\n"]) assert.equal(deriveChannel(v), "mail");
});
check("2. EVERY EXISTING CHANNEL still maps to itself — the list only grew", () => {
  for (const c of BEFORE_MAIL) { assert.ok(VALID_CHANNELS.includes(c), c); assert.equal(deriveChannel(c), c); }
});
check("2b. absent, blank and unknown sources still land as direct — no phantom channels", () => {
  for (const v of [null, undefined, "", "   ", "newsletter-x", "starbucks"]) assert.equal(deriveChannel(v), "direct");
});
check("2c. the 'new format' tags (utm_source=teamlead_card / utm_medium=direct_mail) would NOT derive to mail — why the redirect carries utm_source=mail", () => {
  assert.equal(deriveChannel("teamlead_card"), "direct");
  assert.equal(deriveChannel("direct_mail"), "direct");
});
check("3. THE PAGE is registered at /lp/coffee as an owned page: no partner, no referral source", () => {
  assert.equal(CAMPAIGN_BY_SLUG.coffee, coffee);
  assert.ok(CAMPAIGNS.includes(coffee));
  assert.equal(coffee.partner, undefined);
  assert.equal(coffee.attribution.referralSourceId, undefined);
  assert.equal(coffee.market.mode, "picker");
});
check("3b. the page's fallback is mail, and it is a VALID channel (an invalid fallback would silently derive to direct)", () => {
  assert.equal(coffee.attribution.defaultUtmSource, "mail");
  assert.equal(deriveChannel(coffee.attribution.defaultUtmSource), "mail");
});
check("3c. the FormCard send-time rule: a real tag wins, blank falls back, the fallback is never written anywhere", () => {
  // Mirrors FormCard: stored.utm_source?.trim() ? stored : { ...stored, utm_source: default }
  const apply = (stored) => (stored.utm_source?.trim() ? stored : { ...stored, utm_source: coffee.attribution.defaultUtmSource });
  assert.equal(deriveChannel(apply({ utm_source: "email", utm_campaign: "nurture-x" }).utm_source), "email");
  assert.equal(deriveChannel(apply({ utm_source: "" }).utm_source), "mail");
  assert.equal(deriveChannel(apply({}).utm_source), "mail");
  // The fallback carries no campaign of its own — only the redirect does.
  assert.equal(apply({}).utm_campaign, undefined);
});
check("3d. the lead source names the market and is a picker-page source, so the ZIP gate applies", () => {
  const src = coffee.attribution.source.replace(/\{marketSlug\}/g, "unknown");
  assert.equal(src, "teamlead-coffee-unknown");
  assert.ok(isPickerPageSource(src));
  assert.equal(withMarketSlug(src, "atlanta"), "teamlead-coffee-atlanta");
  assert.ok(!coffee.attribution.source.startsWith("email-campaign-"), "must not look like /lp/sell's source");
});
check("3e. the market picker on /lp/coffee links back to /lp/coffee, not to /lp/sell (config/routes.ts MARKET_LINK_BASES)", () => {
  assert.equal(marketBaseFor("/lp/coffee"), "/lp/coffee");
  assert.equal(marketBaseFor("/lp/coffee/m/atlanta"), "/lp/coffee");
  assert.equal(marketBaseFor("/lp/coffee/v/control"), "/lp/coffee");
  // and the confirm handoff still goes to the shared /confirm
  assert.equal(campaignHref(campaignBaseFor("/lp/coffee"), "/confirm"), "/confirm");
});
check("4. THE LINK REGISTRY ROW matches the card: print / Marketing / mail / campaign / all / curbio.com/coffee / printed", () => {
  const row = SEED_LINKS.find((l) => l.label === "Team lead coffee card · back panel");
  assert.ok(row, "row missing");
  assert.deepEqual(
    { type: row.type, owner: row.owner, channel: row.channel, campaign: row.campaign, market: row.market, shortLink: row.shortLink, status: row.status, medium: row.medium },
    { type: "print", owner: "Marketing", channel: "mail", campaign: CAMPAIGN, market: "all", shortLink: "curbio.com/coffee", status: "printed", medium: "direct_mail" }
  );
  assert.equal(row.trackedUrl, REDIRECT);
  assert.equal(deriveChannel(new URL(row.trackedUrl).searchParams.get("utm_source")), row.channel);
});
check("5. the copy on the page is the card's", () => {
  assert.equal(coffee.hero.headline, "Coffee’s *on us.*");
  assert.deepEqual(coffee.hero.trust, ["We handle everything", "Ready by your list date", "Sellers can pay at closing"]);
  assert.equal(coffee.cta, "Book 15 minutes with your local Curbio rep.");
  assert.equal(coffee.sections.howItWorks, false);
});
console.log(`coffee attribution: ${n} checks passed`);
