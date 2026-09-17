// Shared ingestion contract between the DocuEvents GitHub parser
// (tustopt/docuevents, ingestion/sources/cinemateca_pt/) and this project.
// This file holds ONLY the data shape expected by public.ingest_screening();
// no parsing, normalizing or entity-resolution logic lives in Lovable.

/** Screening payload passed to public.ingest_screening() as p_screening. */
export type NormalizedScreening = {
  title: string;
  startAt: string;
  endAt?: string | null;
  venue: Record<string, unknown>;
  films?: unknown[];
  provenance: {
    sourceExternalId: string;
    sourceUrl?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * The surface the GitHub ingestion package must expose so this project can
 * reuse it without copying the parser.
 */
export type CinematecaSource = {
  /** Fetches the current Cinemateca programme and returns raw items. */
  fetchCinematecaScreenings: (options?: {
    limit?: number;
  }) => Promise<unknown[]>;
  /** Maps one raw item to the ingest_screening() contract above. */
  normalizeCinematecaScreening: (raw: unknown) => NormalizedScreening;
};

export const CINEMATECA_SOURCE_KEY = "cinemateca_pt";
