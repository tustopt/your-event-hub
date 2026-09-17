import type { AdapterResult, ParsedSourceItem, SourceAdapter } from "./contracts.js";
import { resolveSourceAdapter, type AdapterRegistry } from "./adapter-registry.js";

export interface SourceFetcher<T = unknown> {
  readonly sourceKey: string;
  readonly sourceType: SourceAdapter["sourceType"];
  fetch(): Promise<readonly T[]>;
  toParsedItem(input: T): ParsedSourceItem;
}

export interface SourcePipelineResult {
  sourceKey: string;
  fetched: number;
  parsed: number;
  result: AdapterResult;
}

export interface SourcePipelineOptions {
  dryRun?: boolean;
}

export async function runSourcePipeline<T>(
  fetcher: SourceFetcher<T>,
  adapters: AdapterRegistry,
  options: SourcePipelineOptions = {},
): Promise<SourcePipelineResult> {
  const adapter = resolveSourceAdapter(fetcher.sourceKey, adapters);

  if (adapter.sourceType !== fetcher.sourceType) {
    throw new Error(
      `Fetcher type mismatch for ${fetcher.sourceKey}: expected=${adapter.sourceType}, received=${fetcher.sourceType}`,
    );
  }

  const rawItems = await fetcher.fetch();
  const result = mergeAdapterResults(
    rawItems.map((item) => {
      const parsedItem = fetcher.toParsedItem(item);
      return adapter.parse(parsedItem, item);
    }),
  );

  void options.dryRun;

  return {
    sourceKey: fetcher.sourceKey,
    fetched: rawItems.length,
    parsed: rawItems.length,
    result,
  };
}

function mergeAdapterResults(results: readonly AdapterResult[]): AdapterResult {
  const festivals = results.flatMap((result) => result.festivals ?? []);
  const festivalEditions = results.flatMap((result) => result.festivalEditions ?? []);

  return {
    events: results.flatMap((result) => result.events),
    screenings: results.flatMap((result) => result.screenings),
    festivals: festivals.length ? festivals : undefined,
    festivalEditions: festivalEditions.length ? festivalEditions : undefined,
    warnings: results.flatMap((result) => result.warnings),
  };
}
