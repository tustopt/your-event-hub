/**
 * Source-specific selectors belong here so a future Cinemateca markup change
 * does not leak into shared ingestion code.
 *
 * These selectors are intentionally conservative until a live/fixture HTML
 * sample is validated. Do not treat them as stable API guarantees.
 */
export const selectors = {
  programmeItem: [
    "article.programme-item",
    ".programa-item",
    "article",
  ],
  title: [
    ".title",
    ".titulo",
    "h2",
    "h3",
  ],
  date: [
    "time[datetime]",
    "time",
    ".date",
    ".data",
  ],
  venue: [
    ".venue",
    ".sala",
    ".local",
  ],
  metadata: [
    ".metadata",
    ".meta",
    ".details",
  ],
} as const;

export type CinematecaSelectorKey = keyof typeof selectors;
