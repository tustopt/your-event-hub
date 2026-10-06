import { getProductionSources, getSourceDefinition } from "../core/source-registry";
import { createProductionAdapterRegistry } from "../core/production-adapters";
import { getSourceFetcher } from "../core/source-fetchers";
import { enrichAdapterResultImages } from "../core/image-resolver";

const DEFAULT_SOURCES = [
  "cinemateca_pt",
  "cinema_sao_jorge",
  "cinema_fernando_lopes",
  "doclisboa",
];

async function main(): Promise<void> {
  const sourcesArg = process.argv.find((arg) => arg.startsWith("--sources="));
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const sourceKeys = sourcesArg
    ? sourcesArg.slice("--sources=".length).split(",").map((value) => value.trim()).filter(Boolean)
    : DEFAULT_SOURCES;
  const limit = limitArg ? Number.parseInt(limitArg.slice("--limit=".length), 10) : undefined;

  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive integer.");
  }

  const productionKeys = new Set(getProductionSources().map((source) => source.key));
  const invalid = sourceKeys.filter((key) => !productionKeys.has(key));
  if (invalid.length) {
    throw new Error(`Not production sources: ${invalid.join(", ")}`);
  }

  const adapters = createProductionAdapterRegistry();
  const results: Array<Record<string, unknown>> = [];

  for (const sourceKey of sourceKeys) {
    const definition = getSourceDefinition(sourceKey);
    if (!definition?.adapterKey) throw new Error(`Missing adapter for ${sourceKey}`);

    const adapter = adapters.get(definition.adapterKey);
    if (!adapter) throw new Error(`Adapter not installed: ${definition.adapterKey}`);

    const fetcher = getSourceFetcher(sourceKey, {
      url: definition.canonicalUrl,
      now: () => new Date(),
    });

    const raw = await fetcher.fetch();
    const items = limit === undefined ? raw : raw.slice(0, limit);
    let screenings = 0;
    let tvPrograms = 0;
    let imagesAvailable = 0;
    let imagesMissing = 0;
    let warnings = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (const [index, item] of items.entries()) {
      try {
        const parsed = fetcher.toParsedItem(item);
        const result = await enrichAdapterResultImages(adapter.parse(parsed, item));
        screenings += result.screenings.length;
        tvPrograms += result.tvPrograms?.length ?? 0;
        warnings += result.warnings.length;

        for (const screening of result.screenings) {
          const films = Array.isArray(screening["films"]) ? screening["films"] as Array<{ film?: { imageUrl?: unknown } }> : [];
          for (const film of films) {
            if (typeof film.film?.imageUrl === "string" && film.film.imageUrl.trim()) imagesAvailable++;
            else imagesMissing++;
          }
        }
        for (const program of result.tvPrograms ?? []) {
          if (typeof program.imageUrl === "string" && program.imageUrl.trim()) imagesAvailable++;
          else imagesMissing++;
        }
      } catch (error) {
        errors.push({ index, message: error instanceof Error ? error.message : String(error) });
      }
    }

    results.push({
      source: sourceKey,
      name: definition.name,
      fetched: items.length,
      screenings,
      tvPrograms,
      imagesAvailable,
      imagesMissing,
      warnings,
      failed: errors.length,
      errors,
    });
  }

  console.log(JSON.stringify({
    dryRun: true,
    persisted: false,
    sources: results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
