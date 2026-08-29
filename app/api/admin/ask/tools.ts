import { MARKETS, MARKET_BY_SLUG } from "@/config/markets";
import {
  OTHER_MARKETS_KEY,
  OTHER_MARKETS_LABEL,
  SNAPSHOT_AS_OF,
  SNAPSHOT_DEALS,
  SNAPSHOT_MONTHS,
  aggregateSnapshot,
  channelForDeal,
  directShareByMonth,
  directSourceBreakdown,
  isClosed,
} from "@/config/appLeadsSnapshot";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  FUNNEL_STAGES,
  QUALIFIED_TARGET_PER_MARKET_PER_MONTH,
  SYNC_SURFACES,
} from "@/config/marketingHub";
import { CHANNEL_PLAN } from "@/config/channelPlan";
import { buildPageRegistry } from "@/config/pageRegistry";
import { FORM_REGISTRY } from "@/config/formRegistry";
import { SEED_LINKS } from "@/config/linkRegistry";
import { VALID_CHANNELS, type Channel } from "@/lib/channels";
import {
  deliveryState,
  maskEmail,
  maskName,
  maskPhone,
  readRecentLeads,
  recentCrmFailures,
} from "@/lib/adminLeads";
import { computeUndocumentedCampaigns } from "@/lib/campaignOrphans";
import { readRegistryLinks } from "@/lib/marketingLinksStore";
import { paceRead } from "@/app/(site)/marketing/(hub)/pacing";
import pkg from "@/package.json";

// ─────────────────────────────────────────────────────────────────────────────
// THE TOOL SURFACE — every number the assistant can state, and nothing else.
//
// Three groups:
//   Data Q&A       the Performance grid and its drill-downs
//   Diagnosis      getSystemHealth — every known gap, ranked by leads at stake
//   Site and tech  getSiteContext — registries and the stack, read at runtime
//
// ── The one rule these all obey ────────────────────────────────────────────
// A tool NEVER invents a number to make a shape complete. Where a metric has
// no source — spend, CAC, first-touch — the field comes back `null` alongside
// an `unavailable` note naming what is missing. The system prompt turns that
// into a sentence; it must never turn it into a guess.
//
// ── Everything reads the same aggregation the screens do ───────────────────
// config/appLeadsSnapshot is the single Qualified source, and these tools call
// exactly the functions the Markets / Channels / Report screens call. An
// answer and the screen behind it can therefore never disagree — which is the
// entire point of wiring the Ask box to tools rather than to a prose dump.
// ─────────────────────────────────────────────────────────────────────────────

const PII_NOTE =
  "Contact fields are masked. The assistant is never given raw lead PII.";

// ── month resolution ────────────────────────────────────────────────────────

/** Resolve a month argument to a set of snapshot months.
 *  "2026-08" → that month · "ytd"/"all" → everything · omitted → latest. */
function resolveMonths(month?: string): {
  months: string[];
  label: string;
  note?: string;
} {
  const latest = SNAPSHOT_MONTHS[SNAPSHOT_MONTHS.length - 1];
  if (!month || month === "latest") {
    return { months: latest ? [latest] : [], label: latest ?? "no data" };
  }
  if (month === "ytd" || month === "all") {
    return { months: [...SNAPSHOT_MONTHS], label: "YTD" };
  }
  if (SNAPSHOT_MONTHS.includes(month)) return { months: [month], label: month };
  return {
    months: latest ? [latest] : [],
    label: latest ?? "no data",
    note: `No snapshot data for ${month}. Answered for ${latest} instead. Months with data: ${SNAPSHOT_MONTHS.join(", ")}.`,
  };
}

function marketLabel(key: string): string {
  return key === OTHER_MARKETS_KEY
    ? OTHER_MARKETS_LABEL
    : (MARKET_BY_SLUG[key]?.displayName ?? key);
}

/** Accept a slug, a display name, or a short name. Returns null when unknown. */
function resolveMarketKey(input: string): string | null {
  const q = input.trim().toLowerCase();
  if (q === "other" || q === OTHER_MARKETS_KEY) return OTHER_MARKETS_KEY;
  const hit = MARKETS.find(
    (m) =>
      m.slug === q ||
      m.name.toLowerCase() === q ||
      m.displayName.toLowerCase() === q ||
      m.crmName.toLowerCase() === q ||
      m.operatorName.toLowerCase() === q
  );
  return hit?.slug ?? null;
}

/** The snapshot carries LAST-known source only — the app's first-touch fields
 *  are empty. Any first-touch request gets this, never a silent last-touch
 *  answer wearing a first-touch label. */
const FIRST_TOUCH_UNAVAILABLE =
  "First-touch attribution is not available: the app snapshot carries last-known source only and the CRM's LeadSource column holds legacy values. Figures below are LAST TOUCH.";

// ── the snapshot freshness line every data answer carries ────────────────────

function snapshotMeta() {
  const asOfMs = Date.parse(`${SNAPSHOT_AS_OF}T00:00:00Z`);
  const ageDays = Math.floor((Date.now() - asOfMs) / 86_400_000);
  return {
    source: "config/appLeadsSnapshot.json — a one-time export of app.curbio.com, not a live sync",
    asOf: SNAPSHOT_AS_OF,
    ageDays,
    stale: ageDays > 10,
  };
}

// ── 1. getQualifiedByMarketChannel ──────────────────────────────────────────

function getQualifiedByMarketChannel(args: { month?: string; attribution?: string }) {
  const { months, label, note } = resolveMonths(args.month);
  const agg = aggregateSnapshot(new Set(months));

  const marketKeys = [
    ...MARKETS.map((m) => m.slug).filter((s) => agg.marketKeys.includes(s)),
    ...(agg.marketKeys.includes(OTHER_MARKETS_KEY) ? [OTHER_MARKETS_KEY] : []),
  ];
  const channels = CHANNEL_FUNNEL_ORDER.filter((ch) =>
    marketKeys.some((mk) => agg.cells[`${mk}|${ch}`]?.qualified)
  );

  const rows = marketKeys.map((mk) => {
    const byChannel: Record<string, number> = {};
    let total = 0;
    for (const ch of channels) {
      const n = agg.cells[`${mk}|${ch}`]?.qualified ?? 0;
      if (n) byChannel[CHANNEL_LABELS[ch]] = n;
      total += n;
    }
    // "Other markets" has no landing pages and therefore no target.
    const target = mk === OTHER_MARKETS_KEY ? null : QUALIFIED_TARGET_PER_MARKET_PER_MONTH * months.length;
    return { market: marketLabel(mk), qualified: total, target, byChannel };
  });

  const total = rows.reduce((a, r) => a + r.qualified, 0);
  const targetTotal = MARKETS.length * QUALIFIED_TARGET_PER_MARKET_PER_MONTH * months.length;

  return {
    window: label,
    attribution: "last touch",
    ...(args.attribution === "first" ? { firstTouch: FIRST_TOUCH_UNAVAILABLE } : {}),
    channels: channels.map((c) => CHANNEL_LABELS[c]),
    rows,
    total,
    targetTotal,
    snapshot: snapshotMeta(),
    ...(note ? { note } : {}),
  };
}

// ── 2. getMarketDetail ──────────────────────────────────────────────────────

function getMarketDetail(args: { market: string; month?: string }) {
  const key = resolveMarketKey(args.market);
  if (!key) {
    return {
      error: `Unknown market "${args.market}".`,
      knownMarkets: MARKETS.map((m) => m.displayName),
    };
  }
  const { months, label, note } = resolveMonths(args.month);
  const agg = aggregateSnapshot(new Set(months));

  let qualified = 0;
  let closed = 0;
  let revenue = 0;
  const byChannel: Record<string, number> = {};
  for (const ch of CHANNEL_FUNNEL_ORDER) {
    const cell = agg.cells[`${key}|${ch}`];
    if (!cell) continue;
    qualified += cell.qualified;
    closed += cell.closed;
    revenue += cell.revenue;
    if (cell.qualified) byChannel[CHANNEL_LABELS[ch]] = cell.qualified;
  }

  const target =
    key === OTHER_MARKETS_KEY ? null : QUALIFIED_TARGET_PER_MARKET_PER_MONTH * months.length;
  const pace = target ? paceRead(qualified, months, SNAPSHOT_AS_OF, QUALIFIED_TARGET_PER_MARKET_PER_MONTH) : null;
  const market = key === OTHER_MARKETS_KEY ? null : MARKET_BY_SLUG[key];

  return {
    market: marketLabel(key),
    window: label,
    qualified,
    target,
    pace: pace
      ? {
          expected: Math.round(pace.expected),
          delta: pace.delta,
          state: pace.state,
          coverage: pace.coverage,
          basis: "target prorated to the snapshot's as-of day, not the full month",
        }
      : null,
    closed,
    closeRate: qualified ? Number(((closed / qualified) * 100).toFixed(1)) : null,
    revenue: revenue || null,
    revenueNote: revenue ? "sum of deal value across WON deals only" : "no won deals with a recorded value in this window",
    owner: market?.hsm.name ?? null,
    ownerNote: market
      ? "static HSM assignment from config/markets.ts; the authoritative HSM identity comes from the operator API"
      : null,
    coverage: market?.coverage ?? null,
    byChannel,
    snapshot: snapshotMeta(),
    ...(note ? { note } : {}),
  };
}

// ── 3. getChannelDetail ─────────────────────────────────────────────────────

function getChannelDetail(args: { channel: string; month?: string }) {
  const raw = args.channel.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const channel = VALID_CHANNELS.find((c) => c === raw);
  if (!channel) {
    // Might be a PLANNING channel ("paid", "events", "content") rather than a
    // measured one. That distinction is the answer, not an error.
    const plan = CHANNEL_PLAN.find((p) => p.slug === raw || p.label.toLowerCase() === args.channel.trim().toLowerCase());
    if (plan) {
      return {
        planningChannel: plan.label,
        tier: plan.tier,
        owner: plan.owner,
        purpose: plan.purpose,
        measuredChannels: plan.channels.map((c) => CHANNEL_LABELS[c]),
        attributionBasis: plan.basis,
        basisNote: plan.basisNote ?? null,
        targets: plan.targets,
        needs: plan.needs,
        note:
          plan.channels.length === 0
            ? `${plan.label} maps to no measured channel value — it cannot be counted as a channel. See attributionBasis.`
            : `${plan.label} is a PLANNING channel covering the measured channels listed. Ask for one of those for lead counts.`,
      };
    }
    return {
      error: `Unknown channel "${args.channel}".`,
      measuredChannels: VALID_CHANNELS,
      planningChannels: CHANNEL_PLAN.map((p) => p.label),
    };
  }

  const { months, label, note } = resolveMonths(args.month);
  const agg = aggregateSnapshot(new Set(months));

  let qualified = 0;
  let closed = 0;
  let revenue = 0;
  const byMarket: Record<string, number> = {};
  for (const mk of agg.marketKeys) {
    const cell = agg.cells[`${mk}|${channel}`];
    if (!cell) continue;
    qualified += cell.qualified;
    closed += cell.closed;
    revenue += cell.revenue;
    if (cell.qualified) byMarket[marketLabel(mk)] = cell.qualified;
  }

  const targetTotal = MARKETS.length * QUALIFIED_TARGET_PER_MARKET_PER_MONTH * months.length;
  const plan = CHANNEL_PLAN.find((p) => (p.channels as readonly string[]).includes(channel));

  return {
    channel: CHANNEL_LABELS[channel],
    value: channel,
    window: label,
    qualified,
    shareOfTarget: targetTotal ? Number(((qualified / targetTotal) * 100).toFixed(1)) : null,
    shareOfTargetNote: `against the all-market target of ${targetTotal} for this window (${MARKETS.length} markets × ${QUALIFIED_TARGET_PER_MARKET_PER_MONTH} × ${months.length} month(s))`,
    closed,
    closeRate: qualified ? Number(((closed / qualified) * 100).toFixed(1)) : null,
    revenue: revenue || null,
    spend: null,
    cac: null,
    unavailable: [
      "spend — no spend store exists (month × market × channel × amount). Until it does, spend and CAC cannot be computed for any channel.",
    ],
    byMarket,
    plan: plan
      ? { planningChannel: plan.label, tier: plan.tier, owner: plan.owner, targets: plan.targets }
      : null,
    snapshot: snapshotMeta(),
    ...(note ? { note } : {}),
  };
}

// ── 4. getAttributionHealth ─────────────────────────────────────────────────

async function getAttributionHealth(args: { month?: string }) {
  const { months, label, note } = resolveMonths(args.month);
  const monthSet = new Set(months);

  const perMonth = directShareByMonth().filter((r) => monthSet.has(r.ym));
  const direct = perMonth.reduce((a, r) => a + r.direct, 0);
  const total = perMonth.reduce((a, r) => a + r.total, 0);

  const sources = directSourceBreakdown(monthSet);
  const { orphans, autoDocumented, testTags, leadJoinAvailable } =
    await computeUndocumentedCampaigns(200);

  return {
    window: label,
    unattributed: direct,
    total,
    unattributedShare: total ? Number(((direct / total) * 100).toFixed(1)) : null,
    interpretation:
      "Unattributed = the app recorded a referral source with no certain channel meaning, so it maps to `direct`. It is not a channel.",
    rawReferralSources: sources.slice(0, 15),
    rawReferralSourcesNote:
      "What the app actually recorded for the deals counted as direct. This is the to-do list for shrinking the number: phone sources need call tracking, site sources need UTM discipline, blanks need a form that captures.",
    undocumentedCampaignTags: orphans,
    undocumentedCampaignTagsNote: leadJoinAvailable
      ? "Campaign tags producing leads that no row in the Links registry documents. Each is spend that cannot be tied back to a link."
      : "Lead store not reachable — undocumented campaign tags could not be computed.",
    autoDocumentedCampaignTags: autoDocumented.map((c) => ({
      campaign: c.campaign,
      leads: c.leadCount,
      firstSeen: c.firstSeen,
      channel: c.channel,
      channelBasis: c.channelBasis,
      placeholder: c.placeholder,
    })),
    autoDocumentedCampaignTagsNote:
      "Tags described automatically from their own lead traffic and awaiting human review. The channel on these is INFERRED, not authored — say so if asked about them.",
    excludedTestCampaignTags: testTags,
    excludedTestCampaignTagsNote:
      "QA artifacts from our own testing (config/campaignHygiene.ts). Excluded from the undocumented count on purpose; they are not campaigns and need no documentation.",
    byMonth: perMonth,
    snapshot: snapshotMeta(),
    ...(note ? { note } : {}),
  };
}

// ── 5. getLeads ─────────────────────────────────────────────────────────────

async function getLeads(args: {
  market?: string;
  channel?: string;
  campaign?: string;
  deliveryFailedOnly?: boolean;
  limit?: number;
}) {
  const leads = await readRecentLeads(200);
  if (!leads.configured) {
    return { unavailable: "The lead store is not configured in this environment (Upstash env vars absent)." };
  }
  if (leads.error) return { unavailable: `Lead store read failed: ${leads.error}` };

  const wantMarket = args.market ? resolveMarketKey(args.market) : null;
  const wantMarketName = wantMarket ? MARKET_BY_SLUG[wantMarket]?.name.toLowerCase() : null;

  let rows = leads.rows;
  if (wantMarketName) {
    rows = rows.filter((r) => (r.lead.market ?? "").toLowerCase() === wantMarketName);
  }
  if (args.channel) {
    const c = args.channel.trim().toLowerCase();
    rows = rows.filter((r) => (r.lead.channel ?? "").toLowerCase() === c);
  }
  if (args.campaign) {
    const c = args.campaign.trim().toLowerCase();
    rows = rows.filter((r) => (r.lead.utm_campaign ?? "").trim().toLowerCase() === c);
  }
  if (args.deliveryFailedOnly) {
    rows = rows.filter((r) => deliveryState(r.delivery, r.lead).tone === "fail");
  }

  const limit = Math.min(args.limit ?? 20, 50);
  return {
    total: leads.total,
    matched: rows.length,
    showing: Math.min(limit, rows.length),
    pii: PII_NOTE,
    leads: rows.slice(0, limit).map(({ lead, delivery }) => ({
      submittedAt: lead.submittedAt ?? null,
      name: maskName(lead, "masked"),
      email: maskEmail(lead.email, "masked"),
      phone: maskPhone(lead.phone, "masked"),
      market: lead.market ?? null,
      marketSource: lead.marketSource ?? "unknown",
      channel: lead.channel ?? null,
      campaign: lead.utm_campaign ?? null,
      medium: lead.utm_medium ?? null,
      source: lead.utm_source ?? null,
      delivery: deliveryState(delivery, lead).label,
    })),
  };
}

// ── 6. getTrend ─────────────────────────────────────────────────────────────

const TREND_METRICS = ["qualified", "closed", "revenue", "close_rate", "unattributed_share"] as const;
type TrendMetric = (typeof TREND_METRICS)[number];

function getTrend(args: { metric: string; months?: number }) {
  const metric = TREND_METRICS.find((m) => m === args.metric) as TrendMetric | undefined;
  if (!metric) return { error: `Unknown metric "${args.metric}".`, metrics: TREND_METRICS };

  const n = Math.min(Math.max(args.months ?? 12, 1), SNAPSHOT_MONTHS.length);
  const months = SNAPSHOT_MONTHS.slice(-n);

  const series = months.map((ym) => {
    const deals = SNAPSHOT_DEALS.filter((d) => d.month === ym);
    const qualified = deals.length;
    const won = deals.filter(isClosed);
    const closed = won.length;
    const revenue = won.reduce((a, d) => a + (d.value ?? 0), 0);
    const directCount = deals.filter((d) => channelForDeal(d) === "direct").length;
    const value =
      metric === "qualified"
        ? qualified
        : metric === "closed"
          ? closed
          : metric === "revenue"
            ? revenue
            : metric === "close_rate"
              ? qualified
                ? Number(((closed / qualified) * 100).toFixed(1))
                : null
              : qualified
                ? Number(((directCount / qualified) * 100).toFixed(1))
                : null;
    return { month: ym, value };
  });

  return {
    metric,
    unit:
      metric === "revenue" ? "USD" : metric === "close_rate" || metric === "unattributed_share" ? "%" : "leads",
    series,
    partialLastMonth: `${SNAPSHOT_AS_OF.slice(0, 7)} is partial — the snapshot reaches ${SNAPSHOT_AS_OF} only.`,
    targetPerMonth: metric === "qualified" ? MARKETS.length * QUALIFIED_TARGET_PER_MARKET_PER_MONTH : null,
    snapshot: snapshotMeta(),
  };
}

// ── 7. getSystemHealth ──────────────────────────────────────────────────────
//
// Every known gap in ONE payload, ranked by how many leads each one affects.
// The ranking is the whole value: "what's broken" without an ordering is a
// list, not an answer.

async function getSystemHealth() {
  const meta = snapshotMeta();
  const monthSet = new Set(SNAPSHOT_MONTHS);

  const directSources = directSourceBreakdown(monthSet);
  const unattributed = directSources.reduce((a, s) => a + s.count, 0);
  const totalDeals = SNAPSHOT_DEALS.length;

  const [{ orphans, leadJoinAvailable }, leads, registry] = await Promise.all([
    computeUndocumentedCampaigns(200),
    readRecentLeads(200),
    readRegistryLinks(),
  ]);

  const leadRows = leads.configured && !leads.error ? leads.rows : [];
  const failures = recentCrmFailures(leadRows, 7 * 86_400_000);

  type Gap = {
    gap: string;
    leadsAffected: number | null;
    evidence: string;
    fix: string;
  };
  const gaps: Gap[] = [];

  // Unwired data sources.
  gaps.push({
    gap: "No spend store",
    leadsAffected: null,
    evidence:
      "No month × market × channel × amount store exists, so CAC is null on every channel and Blended CAC is an em-dash on Home.",
    fix: "Build the spend store and enter the agency invoice, creator payouts, event costs and card costs against month × market × channel.",
  });
  gaps.push({
    gap: "GA4 not wired (owner unknown)",
    leadsAffected: null,
    evidence:
      "GA4 account owner is UNKNOWN per Migration Plan v10. Search Console is self-serviceable by DNS; GA4 is not.",
    fix: "Verify Search Console by DNS, then use its Users and Permissions list to identify the GA4 owner.",
  });
  gaps.push({
    gap: "No contact store",
    leadsAffected: null,
    evidence:
      "ActiveCampaign (opt-in) and Instantly (cold) are both `waiting` in SYNC_SURFACES — no email events reach the Hub, so Engaged is empty everywhere.",
    fix: "Wire the ActiveCampaign and Instantly webhooks into /api/intake.",
  });

  // Attribution.
  gaps.push({
    gap: "Unattributed qualified leads",
    leadsAffected: unattributed,
    evidence: `${unattributed} of ${totalDeals} snapshot deals (${totalDeals ? ((unattributed / totalDeals) * 100).toFixed(0) : "0"}%) carry no usable channel. Top raw sources: ${directSources
      .slice(0, 4)
      .map((s) => `${s.source} (${s.count})`)
      .join(", ")}.`,
    fix: "Call tracking retires the phone sources; UTM discipline plus a self-reported 'How did you hear about us' field retires the site sources.",
  });

  for (const o of orphans) {
    gaps.push({
      gap: `Undocumented campaign tag "${o.campaign}"`,
      leadsAffected: o.count,
      evidence: `${o.count} recent lead(s) carry this tag and no row in the Links registry documents it.`,
      fix: `Add a row for "${o.campaign}" to the Links registry, or correct the link that emits it.`,
    });
  }
  if (!leadJoinAvailable) {
    gaps.push({
      gap: "Lead store unreachable — campaign-tag audit could not run",
      leadsAffected: null,
      evidence: "readRecentLeads returned unconfigured or errored, so undocumented campaign tags are unknown, not zero.",
      fix: "Check the Upstash read-only credentials for this environment.",
    });
  }

  // Forms not wired to intake. /api/intake does not exist, so EVERY form type
  // in the registry is unwired — this is not a per-form flag, it is one
  // missing route. Stated as such rather than as eight separate gaps.
  gaps.push({
    gap: `All ${FORM_REGISTRY.length} form types unwired — /api/intake does not exist`,
    leadsAffected: 0,
    evidence: `${FORM_REGISTRY.map((f) => f.slug).join(", ")} have no intake path, so every Engaged conversion is uncounted. The estimate form is unaffected — it posts to /api/lead and reaches the CRM.`,
    fix: "Build /api/intake with a formType field on the lead model, then point each form at it.",
  });

  // Delivery failures.
  if (failures.length) {
    gaps.push({
      gap: "Lead delivery failures in the last 7 days",
      leadsAffected: failures.length,
      evidence: `${failures.length} lead(s) failed CRM delivery. These are real leads that did not reach the CRM.`,
      fix: "Open Leads → filter to failed delivery and re-deliver; then fix the intake error behind them.",
    });
  }

  // Snapshot staleness.
  if (meta.stale) {
    gaps.push({
      gap: "App snapshot is stale",
      leadsAffected: null,
      evidence: `The snapshot is ${meta.ageDays} days old (as of ${meta.asOf}). Every Qualified number on every screen drifts from this date.`,
      fix: "Re-run scripts/import-app-leads.mjs, or build the live app sync that replaces the snapshot.",
    });
  }

  // Pages with no analytics.
  const registryPages = buildPageRegistry();
  const livePages = registryPages.filter((p) => p.status === "live");
  gaps.push({
    gap: "Page-level analytics incomplete",
    leadsAffected: null,
    evidence: `${livePages.length} live page(s) in the registry. Traffic comes from Vercel Analytics only — GA4 is unwired, so no page has a full picture.`,
    fix: "Resolve GA4 ownership, then join GA4 alongside Vercel Analytics in lib/pageStats.ts.",
  });

  // Rank: leads at stake first, unquantified gaps after.
  gaps.sort((a, b) => (b.leadsAffected ?? -1) - (a.leadsAffected ?? -1));

  return {
    ranking: "ordered by leads affected; gaps with no lead count attached sort last and are not therefore lower priority",
    gaps,
    syncSurfaces: SYNC_SURFACES.map((s) => ({ surface: s.label, carries: s.carries, status: s.status, note: s.note ?? null })),
    linkRegistry: registry.configured && !registry.error ? { rows: registry.links.length + SEED_LINKS.length } : { unavailable: true },
    snapshot: meta,
  };
}

// ── 8. getSiteContext ───────────────────────────────────────────────────────
//
// The stack is READ AT RUNTIME from package.json and the config files, never
// hardcoded — so an answer about the tech stack cannot go stale the moment a
// dependency is bumped.

async function getSiteContext() {
  const pages = buildPageRegistry();
  const registry = await readRegistryLinks();
  const registryLinks = registry.configured && !registry.error ? registry.links : [];

  const deps = pkg.dependencies as Record<string, string>;
  const devDeps = pkg.devDependencies as Record<string, string>;

  return {
    pages: {
      total: pages.length,
      byStatus: {
        live: pages.filter((p) => p.status === "live").length,
        stub: pages.filter((p) => p.status === "stub").length,
        planned: pages.filter((p) => p.status === "planned").length,
      },
      rows: pages.map((p) => ({
        path: p.path,
        group: p.group,
        title: p.title,
        status: p.status,
        indexed: p.indexed,
        derivedFrom: p.derivedFrom,
        note: p.note ?? null,
      })),
      plannedNote:
        "`planned` rows are pages the navigation links to that the app does not implement — the backlog maintains itself from config/navigation.ts.",
    },
    forms: {
      types: FORM_REGISTRY.map((f) => ({ slug: f.slug, label: f.label, deliversAsset: f.deliversAsset })),
      intakeWired: false,
      note: "/api/intake is not built, so no form type records submissions yet. The estimate form is separate — it posts to /api/lead.",
    },
    links: {
      seeded: SEED_LINKS.length,
      inRegistry: registryLinks.length,
      unavailable: registry.configured && !registry.error ? null : "link registry store not reachable",
      sample: [...registryLinks, ...SEED_LINKS].slice(0, 20).map((l) => ({
        label: l.label,
        type: l.type,
        channel: l.channel,
        medium: l.medium || null,
        campaign: l.campaign || null,
        shortLink: l.shortLink || null,
      })),
    },
    markets: MARKETS.map((m) => ({
      slug: m.slug,
      displayName: m.displayName,
      hsm: m.hsm.name,
      coverage: m.coverage,
      hasSoldProof: m.sold.length > 0,
    })),
    stack: {
      runtime: `Node ${(pkg as { engines?: { node?: string } }).engines?.node ?? "unspecified"}`,
      framework: `Next.js ${deps.next} (App Router)`,
      react: `React ${deps.react}`,
      language: `TypeScript ${devDeps.typescript}`,
      styling: `Tailwind CSS ${devDeps.tailwindcss}`,
      hosting: "Vercel",
      dataStore: `Upstash Redis (@upstash/redis ${deps["@upstash/redis"]})`,
      email: `Resend ${deps.resend}`,
      analytics: [
        `@vercel/analytics ${deps["@vercel/analytics"]}`,
        `@vercel/speed-insights ${deps["@vercel/speed-insights"]}`,
        `posthog-js ${deps["posthog-js"]}`,
      ],
      assistant: `@anthropic-ai/sdk ${deps["@anthropic-ai/sdk"]}`,
      auth: "signed session cookie (HMAC) verified at the edge in middleware.ts, session records in Redis",
      note: "read at runtime from package.json — never hardcoded",
    },
    funnelStages: FUNNEL_STAGES,
    snapshot: snapshotMeta(),
  };
}

// ── schemas ─────────────────────────────────────────────────────────────────

const MONTH_ARG = {
  type: "string" as const,
  description: `A snapshot month as YYYY-MM, or "ytd" for the whole snapshot, or "latest". Months with data: ${SNAPSHOT_MONTHS.join(", ")}. Defaults to the latest month.`,
};

export const TOOL_SCHEMAS = [
  {
    name: "getQualifiedByMarketChannel",
    description:
      "The Performance grid: Qualified leads for every market broken down by attribution channel, with each market's target. Use this for 'how are we pacing', 'which market is ahead/behind', and any market × channel question.",
    input_schema: {
      type: "object" as const,
      properties: {
        month: MONTH_ARG,
        attribution: {
          type: "string" as const,
          enum: ["last", "first"],
          description: "Attribution mode. First touch is not available in the snapshot and will be reported as such.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "getMarketDetail",
    description:
      "One market's Qualified, target, pace (prorated to the snapshot's as-of day), Closed, close rate, revenue, and owning HSM.",
    input_schema: {
      type: "object" as const,
      properties: {
        market: { type: "string" as const, description: "Market slug, short name, or display name — e.g. 'maryland', 'Atlanta', 'Washington, DC'." },
        month: MONTH_ARG,
      },
      required: ["market"],
      additionalProperties: false,
    },
  },
  {
    name: "getChannelDetail",
    description:
      "One channel's Qualified, share of target, spend and CAC where available, and its market breakdown. Accepts a measured channel value (email, partnership, paid_search…) or a planning channel (Paid, Events, Content).",
    input_schema: {
      type: "object" as const,
      properties: {
        channel: { type: "string" as const, description: `A measured channel: ${VALID_CHANNELS.join(", ")} — or a planning channel: ${CHANNEL_PLAN.map((p) => p.label).join(", ")}.` },
        month: MONTH_ARG,
      },
      required: ["channel"],
      additionalProperties: false,
    },
  },
  {
    name: "getAttributionHealth",
    description:
      "Attribution hygiene: the unattributed share, the raw referral sources behind it, and campaign tags producing leads that no Links-registry row documents.",
    input_schema: {
      type: "object" as const,
      properties: { month: MONTH_ARG },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "getLeads",
    description:
      "Recent individual leads with source, campaign, market and delivery status. Contact fields are masked. Use for 'show me recent leads', 'did anything fail to deliver', 'what came in from campaign X'.",
    input_schema: {
      type: "object" as const,
      properties: {
        market: { type: "string" as const, description: "Filter by market." },
        channel: { type: "string" as const, description: "Filter by channel value." },
        campaign: { type: "string" as const, description: "Filter by exact utm_campaign." },
        deliveryFailedOnly: { type: "boolean" as const, description: "Only leads whose delivery failed." },
        limit: { type: "number" as const, description: "Max leads to return (default 20, cap 50)." },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "getTrend",
    description: "A monthly series for a core metric across the snapshot's months.",
    input_schema: {
      type: "object" as const,
      properties: {
        metric: { type: "string" as const, enum: [...TREND_METRICS], description: "Which metric to trend." },
        months: { type: "number" as const, description: "How many trailing months (default 12)." },
      },
      required: ["metric"],
      additionalProperties: false,
    },
  },
  {
    name: "getSystemHealth",
    description:
      "Every known gap in one payload — unwired data sources, undocumented campaign tags with lead counts, forms not wired to intake, delivery failures, stale-snapshot warnings, pages with no analytics — ranked by how many leads each affects, each with the specific fix. Use this for 'what's broken', 'what should I fix', 'where are we losing leads'.",
    input_schema: { type: "object" as const, properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "getSiteContext",
    description:
      "The page registry (routes, status, indexability), the forms inventory, the redirect and vanity-link registry, the market list, and the deployment stack read at runtime from package.json and the config files. Use for 'what's our tech stack', 'what pages exist', 'what forms do we have'.",
    input_schema: { type: "object" as const, properties: {}, required: [], additionalProperties: false },
  },
];

// ── dispatch ────────────────────────────────────────────────────────────────

type ToolArgs = Record<string, unknown>;

export async function runTool(name: string, input: ToolArgs): Promise<unknown> {
  switch (name) {
    case "getQualifiedByMarketChannel":
      return getQualifiedByMarketChannel(input as { month?: string; attribution?: string });
    case "getMarketDetail":
      return getMarketDetail(input as unknown as { market: string; month?: string });
    case "getChannelDetail":
      return getChannelDetail(input as unknown as { channel: string; month?: string });
    case "getAttributionHealth":
      return getAttributionHealth(input as { month?: string });
    case "getLeads":
      return getLeads(input as Parameters<typeof getLeads>[0]);
    case "getTrend":
      return getTrend(input as unknown as { metric: string; months?: number });
    case "getSystemHealth":
      return getSystemHealth();
    case "getSiteContext":
      return getSiteContext();
    default:
      return { error: `Unknown tool "${name}".` };
  }
}

/** Re-exported so the system prompt can state the closed list without
 *  duplicating it. */
export { VALID_CHANNELS, FUNNEL_STAGES, SNAPSHOT_AS_OF, SNAPSHOT_MONTHS };
export type { Channel };
