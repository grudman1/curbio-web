/**
 * Content Registry — published pieces shipped by Curbio.
 * Currently read-only. Rows are: published blogs, newsletters, case studies,
 * one-pagers, videos, and links tagged as content pieces.
 *
 * Types: blog (blog post), newsletter (email), case-study, one-pager, video
 * Location: full URL or a label like "partner packet" or "HSM field kit"
 * Campaign tag: optional, used to join with leads if set
 * Leads: attributed to the campaign tag; shows em-dash if no tag
 */

export type ContentType = "blog" | "newsletter" | "case study" | "one-pager" | "video";

export type ContentEntry = {
  id: string;
  title: string;
  type: ContentType;
  /** ISO date string. */
  publishedAt: string;
  /** Full URL or human label ("partner packet", "HSM field kit", etc). */
  location: string;
  /** Campaign tag for leads attribution, if any. */
  campaignTag?: string;
};

const SEED: ContentEntry[] = [
  {
    id: "content:blog-1",
    title: "The Complete Pre-Listing Home Prep Guide",
    type: "blog",
    publishedAt: "2026-06-15",
    location: "https://blog.curbio.com/complete-pre-listing-guide",
  },
  {
    id: "content:blog-2",
    title: "How Pre-Listing Prep Reduces Days on Market",
    type: "blog",
    publishedAt: "2026-07-22",
    location: "https://blog.curbio.com/prep-reduces-dom",
  },
];

export const CONTENT_REGISTRY: ContentEntry[] = SEED;
