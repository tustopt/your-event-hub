import type { AdapterResult, ParsedSourceItem, SourceAdapter } from "./contracts.js";
import { resolveSourceAdapter, type AdapterRegistry } from "./adapter-registry.js";
import { enrichAdapterResultImages, type ImageResolverOptions } from "./image-resolver.js";

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
  imageResolver?: ImageResolverOptions;
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

  const enrichedResult = await enrichAdapterResultImages(result, options.imageResolver);

  void options.dryRun;

  return {
    sourceKey: fetcher.sourceKey,
    fetched: rawItems.length,
    parsed: rawItems.length,
    result: enrichedResult,
  };
}

function mergeAdapterResults(results: readonly AdapterResult[]): AdapterResult {
  const festivals = results.flatMap((result) => result.festivals ?? []);
  const festivalEditions = results.flatMap((result) => result.festivalEditions ?? []);
  const tvPrograms = results.flatMap((result) => result.tvPrograms ?? []);

  return {
    events: results.flatMap((result) => result.events),
    screenings: results.flatMap((result) => result.screenings),
    tvPrograms: tvPrograms.length ? tvPrograms : undefined,
    festivals: festivals.length ? festivals : undefined,
    festivalEditions: festivalEditions.length ? festivalEditions : undefined,
    warnings: results.flatMap((result) => result.warnings),
  };
}
