"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE, openSession } from "@/lib/adminSession";
import { getSessionUser, sessionSecret } from "@/lib/adminAuth";
import {
  assembleTrackedUrl,
  campaignError,
  LINK_STATUSES,
  LINK_TYPES,
  type LinkStatus,
  type LinkType,
  type TrackedLink,
} from "@/lib/marketingLinks";
import { readRegistryLink, writeRegistryLink } from "@/lib/marketingLinksStore";
import { VALID_CHANNELS, type Channel } from "@/lib/channels";
import { MARKET_BY_SLUG } from "@/config/markets";

// Save writes a row; it does not publish anything anywhere. The middleware
// already gates POSTs to /marketing/*, and requireAdmin() re-checks the
// session here — the same defense-in-depth rule the Control Room actions
// follow: display gating is never the security boundary.

async function requireAdmin(): Promise<void> {
  const jar = await cookies();
  const opened = await openSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  const user = opened ? await getSessionUser(opened.sid) : null;
  if (!user) throw new Error("not signed in");
}

export type SaveLinkInput = {
  /** Present when editing an existing registry row. */
  id?: string;
  label: string;
  type: string;
  owner: string;
  channel: string;
  medium: string;
  campaign: string;
  market: string;
  destination: string;
  shortLink: string;
  status: string;
  notes: string;
  /** Required to change a printed row's URL — "the asset is being reprinted". */
  reprintConfirmed?: boolean;
};

export type SaveLinkResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveLinkAction(input: SaveLinkInput): Promise<SaveLinkResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not signed in." };
  }

  // ── validate — the same rules the builder shows live ─────────────────────
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Label is required — a row nobody can recognise is a row nobody maintains." };

  if (!LINK_TYPES.some((t) => t.key === input.type)) return { ok: false, error: "Unknown type." };
  const type = input.type as LinkType;

  if (!(VALID_CHANNELS as readonly string[]).includes(input.channel))
    return { ok: false, error: "utm_source must be one of the nine channels — anything else lands as direct." };
  const channel = input.channel as Channel;

  const campErr = campaignError(input.campaign.trim());
  if (campErr) return { ok: false, error: `utm_campaign: ${campErr}` };

  if (input.market !== "all" && !MARKET_BY_SLUG[input.market])
    return { ok: false, error: "Unknown market." };

  if (!(LINK_STATUSES as readonly string[]).includes(input.status))
    return { ok: false, error: "Unknown status." };
  const status = input.status as LinkStatus;

  const destination = input.destination.trim();
  const trackedUrl = assembleTrackedUrl(destination, channel, input.medium.trim(), input.campaign.trim());
  if (!trackedUrl) return { ok: false, error: "Destination must be a full valid URL (https://…)." };

  // ── printed lock — the stored state decides, not the client ──────────────
  const existing = input.id ? await readRegistryLink(input.id) : null;
  if (input.id && !existing) return { ok: false, error: "Row not found (seed rows are edited in git, not here)." };
  if (existing && existing.status === "printed" && existing.trackedUrl !== trackedUrl && !input.reprintConfirmed) {
    return {
      ok: false,
      error:
        "This link is printed — the physical asset in the world is the source of truth. Confirm the asset is being reprinted to change its URL.",
    };
  }

  const now = new Date().toISOString();
  const link: TrackedLink = {
    id: existing?.id ?? `reg:${crypto.randomUUID()}`,
    label,
    type,
    owner: input.owner.trim() || "Marketing",
    channel,
    medium: input.medium.trim(),
    campaign: input.campaign.trim(),
    market: input.market,
    destination,
    trackedUrl,
    shortLink: input.shortLink.trim(),
    status,
    notes: input.notes.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    printedAt:
      status === "printed" ? existing?.printedAt ?? now.slice(0, 10) : existing?.printedAt ?? null,
    origin: "registry",
  };

  try {
    await writeRegistryLink(link);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "write failed" };
  }
  revalidatePath("/marketing/links");
  return { ok: true, id: link.id };
}
