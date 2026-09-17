import {
  RUNNABLE_STATUSES,
  type AdapterLike,
  type IngestionLibrary,
  type ScreeningLike,
  type SourceFetcherLike,
} from "./source-contract";

export type SourceIngestOptions = {
  dryRun?: boolean;
  limit?: number;
};

export type IngestItemError = {
  index: number;
  sourceExternalId: string | null;
  message: string;
};

export type SourceIngestResult = {
  source: string;
  adapterKey: string;
  dryRun: boolean;
  fetched: number;
  processed: number;
  persisted: number;
  failed: number;
  warnings: string[];
  errors: IngestItemError[];
  screenings?: ScreeningLike[];
};

/** Persists one screening; supplied by the route (supabase rpc) or a test double. */
export type PersistScreening = (screening: ScreeningLike, sourceKey: string) => Promise<void>;

export type SourceResolutionCode = "unknown_source" | "not_runnable" | "no_adapter" | "no_fetcher";

export class SourceResolutionError extends Error {
  readonly code: SourceResolutionCode;
  constructor(code: SourceResolutionCode, message: string) {
    super(message);
    this.name = "SourceResolutionError";
    this.code = code;
  }
}

export type ResolvedSource = {
  sourceKey: string;
  adapterKey: string;
  adapter: AdapterLike;
  fetcher: SourceFetcherLike;
};

/**
 * Resolves a source by key through the authoritative registries: only sources
 * with a runnable status, a declared adapter and an implemented fetcher run.
 */
export function resolveRunnableSource(
  library: IngestionLibrary,
  sourceKey: string,
  fetcherOptions: Record<string, unknown> = {},
): ResolvedSource {
  const definition = library.getSourceDefinition(sourceKey);
  if (!definition) {
    throw new SourceResolutionError("unknown_source", `Unknown DocuEvents source: ${sourceKey}`);
  }
  if (!RUNNABLE_STATUSES.includes(definition.status)) {
    throw new SourceResolutionError(
      "not_runnable",
      `Source ${sourceKey} has status "${definition.status}" and cannot be ingested.`,
    );
  }
  if (!definition.adapterKey) {
    throw new SourceResolutionError("no_adapter", `Source ${sourceKey} has no adapter configured.`);
  }

  const adapter = library.createProductionAdapterRegistry().get(definition.adapterKey);
  if (!adapter) {
    throw new SourceResolutionError(
      "no_adapter",
      `Adapter not installed for source: ${sourceKey}`,
    );
  }

  let fetcher: SourceFetcherLike;
  try {
    fetcher = library.getSourceFetcher(sourceKey, fetcherOptions);
  } catch (error) {
    throw new SourceResolutionError(
      "no_fetcher",
      error instanceof Error ? error.message : `No fetcher implemented for source: ${sourceKey}`,
    );
  }

  return { sourceKey, adapterKey: adapter.key, adapter, fetcher };
}

function externalId(screening: ScreeningLike | undefined): string | null {
  const value = screening?.provenance?.sourceExternalId;
  return typeof value === "string" ? value : null;
}

/**
 * Generic ingestion run: fetch raw items with the source fetcher, parse and
 * normalize through the registered adapter, then persist each screening
 * independently so one failure never stops the rest.
 */
export async function runSourceIngestion(
  resolved: ResolvedSource,
  persist: PersistScreening,
  options: SourceIngestOptions = {},
): Promise<SourceIngestResult> {
  const dryRun = options.dryRun === true;
  const raw = await resolved.fetcher.fetch();
  const items = options.limit !== undefined ? raw.slice(0, options.limit) : raw;

  const screenings: ScreeningLike[] = [];
  const warnings: string[] = [];
  const errors: IngestItemError[] = [];
  let processed = 0;
  let persisted = 0;

  for (const [index, item] of items.entries()) {
    let screening: ScreeningLike | undefined;
    try {
      const parsedItem = resolved.fetcher.toParsedItem(item);
      const result = resolved.adapter.parse(parsedItem, item);
      warnings.push(...result.warnings);
      for (const parsedScreening of result.screenings) {
        screening = parsedScreening;
        processed += 1;
        screenings.push(parsedScreening);
        if (!dryRun) {
          await persist(parsedScreening, resolved.sourceKey);
          persisted += 1;
        }
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
    source: resolved.sourceKey,
    adapterKey: resolved.adapterKey,
    dryRun,
    fetched: items.length,
    processed,
    persisted,
    failed: errors.length,
    warnings,
    errors,
    ...(dryRun ? { screenings } : {}),
  };
}
