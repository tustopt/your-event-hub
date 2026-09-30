import {
  RUNNABLE_STATUSES,
  type AdapterLike,
  type IngestionLibrary,
  type ScreeningLike,
  type SourceFetcherLike,
  type TVProgramLike,
} from "./source-contract";
import { enrichAdapterResultImages } from "../../../ingestion/core/image-resolver";

export type SourceIngestOptions = {
  dryRun?: boolean | undefined;
  limit?: number | undefined;
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
  tvPrograms?: TVProgramLike[];
};

export type PersistScreening = (screening: ScreeningLike, sourceKey: string) => Promise<void>;
export type PersistTVProgram = (program: TVProgramLike, sourceKey: string) => Promise<void>;

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

export function resolveRunnableSource(
  library: IngestionLibrary,
  sourceKey: string,
  fetcherOptions: Record<string, unknown> = {},
  allowNonProduction = false,
): ResolvedSource {
  const definition = library.getSourceDefinition(sourceKey);
  if (!definition) {
    throw new SourceResolutionError("unknown_source", `Unknown DocuEvents source: ${sourceKey}`);
  }
  const allowedStatuses = allowNonProduction
    ? [...RUNNABLE_STATUSES, "candidate", "validated", "registered"] as const
    : RUNNABLE_STATUSES;
  if (!allowedStatuses.includes(definition.status)) {
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
    throw new SourceResolutionError("no_adapter", `Adapter not installed for source: ${sourceKey}`);
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

function externalId(item: ScreeningLike | TVProgramLike | undefined): string | null {
  const value = item?.provenance?.sourceExternalId;
  return typeof value === "string" ? value : null;
}

export async function runSourceIngestion(
  resolved: ResolvedSource,
  persistScreening: PersistScreening,
  persistTVProgram: PersistTVProgram = async () => {},
  options: SourceIngestOptions = {},
): Promise<SourceIngestResult> {
  const dryRun = options.dryRun === true;
  const raw = await resolved.fetcher.fetch();
  const items = options.limit !== undefined ? raw.slice(0, options.limit) : raw;

  const screenings: ScreeningLike[] = [];
  const tvPrograms: TVProgramLike[] = [];
  const warnings: string[] = [];
  const errors: IngestItemError[] = [];
  let processed = 0;
  let persisted = 0;

  for (const [index, item] of items.entries()) {
    let lastItem: ScreeningLike | TVProgramLike | undefined;
    try {
      const parsedItem = resolved.fetcher.toParsedItem(item);
      const result = await enrichAdapterResultImages(resolved.adapter.parse(parsedItem, item));
      warnings.push(...result.warnings);

      for (const parsedScreening of result.screenings) {
        lastItem = parsedScreening;
        processed += 1;
        screenings.push(parsedScreening);
        if (!dryRun) {
          await persistScreening(parsedScreening, resolved.sourceKey);
          persisted += 1;
        }
      }

      for (const parsedProgram of result.tvPrograms ?? []) {
        lastItem = parsedProgram;
        processed += 1;
        tvPrograms.push(parsedProgram);
        if (!dryRun) {
          await persistTVProgram(parsedProgram, resolved.sourceKey);
          persisted += 1;
        }
      }
    } catch (error) {
      errors.push({
        index,
        sourceExternalId: externalId(lastItem),
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
    ...(dryRun ? { screenings, tvPrograms } : {}),
  };
}
