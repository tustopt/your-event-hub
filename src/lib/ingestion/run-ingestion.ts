import type { CinematecaSource, NormalizedScreening } from "./contract";

export type IngestOptions = {
  dryRun?: boolean;
  limit?: number;
};

export type IngestItemError = {
  index: number;
  sourceExternalId: string | null;
  message: string;
};

export type IngestResult = {
  dryRun: boolean;
  fetched: number;
  processed: number;
  persisted: number;
  failed: number;
  errors: IngestItemError[];
  screenings?: NormalizedScreening[];
};

/** Persists one screening; supplied by the route (supabase rpc) or a test double. */
export type PersistScreening = (screening: NormalizedScreening) => Promise<void>;

function externalId(screening: NormalizedScreening | undefined): string | null {
  const value = screening?.provenance?.sourceExternalId;
  return typeof value === "string" ? value : null;
}

/**
 * Runs the ingestion pipeline: fetch via the GitHub parser, normalize with the
 * GitHub normalizer, then persist each screening independently.
 */
export async function runCinematecaIngestion(
  source: CinematecaSource,
  persist: PersistScreening,
  options: IngestOptions = {},
): Promise<IngestResult> {
  const dryRun = options.dryRun === true;
  const raw = await source.fetchCinematecaScreenings(
    options.limit !== undefined ? { limit: options.limit } : {},
  );
  const items = options.limit !== undefined ? raw.slice(0, options.limit) : raw;

  const screenings: NormalizedScreening[] = [];
  const errors: IngestItemError[] = [];
  let persisted = 0;

  for (const [index, item] of items.entries()) {
    let screening: NormalizedScreening | undefined;
    try {
      screening = source.normalizeCinematecaScreening(item);
      screenings.push(screening);
      if (!dryRun) {
        await persist(screening);
        persisted += 1;
      }
    } catch (error) {
      errors.push({
        index,
        sourceExternalId: externalId(screening),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    dryRun,
    fetched: items.length,
    processed: items.length,
    persisted,
    failed: errors.length,
    errors,
    ...(dryRun ? { screenings } : {}),
  };
}
