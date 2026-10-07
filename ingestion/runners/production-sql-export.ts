import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AdapterResult, NormalizedScreening } from "../core/contracts";
import { createProductionAdapterRegistry } from "../core/production-adapters";
import { getSourceDefinition } from "../core/source-registry";
import { getSourceFetcher } from "../core/source-fetchers";
import { enrichAdapterResultImages } from "../core/image-resolver";

const DEFAULT_SOURCES = [
  "cinemateca_pt",
  "cinema_sao_jorge",
  "cinema_fernando_lopes",
  "doclisboa",
] as const;

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function sqlDollarQuote(value: string, preferredTag: string): string {
  let tag = preferredTag;
  let counter = 1;
  while (value.includes(`$${tag}$`)) {
    tag = `${preferredTag}_${counter++}`;
  }
  return `$${tag}$${value}$${tag}$`;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sourceBootstrapSql(): string {
  return DEFAULT_SOURCES.map((key) => {
    const source = getSourceDefinition(key);
    if (!source) throw new Error(`Missing source definition: ${key}`);
    return `INSERT INTO public.sources
  (name, url, type, country_code, language_code, active, fetch_interval_minutes, parser_key, configuration)
SELECT
  ${sqlLiteral(source.name)},
  ${sqlLiteral(source.canonicalUrl)},
  ${sqlLiteral(source.sourceType)},
  ${sqlLiteral(source.countryCode)},
  ${sqlLiteral(source.languageCode)},
  true,
  ${source.fetchIntervalMinutes ?? 360},
  ${sqlLiteral(source.key)},
  '{"timezone":"Europe/Lisbon"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.sources WHERE parser_key = ${sqlLiteral(source.key)}
);`;
  }).join("\n\n");
}

function screeningSql(sourceKey: string, screening: NormalizedScreening, index: number): string {
  const payload = JSON.stringify(screening, null, 2);
  const payloadSql = sqlDollarQuote(payload, `docuevents_screening_${index}`);
  const sourceSql = sqlLiteral(sourceKey);

  return `DO $docuevents_ingest$
DECLARE
  v_result jsonb;
  v_screening_id uuid;
  v_film jsonb;
  v_position integer;
BEGIN
  v_result := public.ingest_screening(
    ${sourceSql},
    ${payloadSql}::jsonb
  );

  v_screening_id := (v_result->>'screeningId')::uuid;

  FOR v_film IN
    SELECT value FROM jsonb_array_elements(COALESCE(${payloadSql}::jsonb->'films', '[]'::jsonb))
  LOOP
    v_position := COALESCE((v_film->>'position')::integer, 1);

    UPDATE public.films AS f
       SET poster_url = COALESCE(NULLIF(f.poster_url, ''), NULLIF(BTRIM(v_film->'film'->>'imageUrl'), '')),
           updated_at = now()
      FROM public.screening_films AS sf
     WHERE sf.screening_id = v_screening_id
       AND sf.film_id = f.id
       AND sf.position = v_position
       AND NULLIF(BTRIM(v_film->'film'->>'imageUrl'), '') IS NOT NULL;
  END LOOP;
END;
$docuevents_ingest$;`;
}

async function main(): Promise<void> {
  const requested = parseArg("sources");
  const sources = requested
    ? requested.split(",").map((value) => value.trim()).filter(Boolean)
    : [...DEFAULT_SOURCES];
  const limitArg = parseArg("limit");
  const limit = limitArg ? Number(limitArg) : undefined;

  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive integer");
  }

  const adapters = createProductionAdapterRegistry();
  const sqlParts = [
    "-- DocuEvents real-data ingestion export.",
    "-- Generated from the live production adapters in this repository.",
    "-- Review the summary before executing this file in the Supabase SQL Editor.",
    "-- The script is transactional: a failure rolls back the complete load.",
    "",
    "BEGIN;",
    "",
    "-- Register the four validated cinema sources if they are not already present.",
    sourceBootstrapSql(),
    "",
  ];

  const summary: Array<Record<string, unknown>> = [];

  for (const sourceKey of sources) {
    const definition = getSourceDefinition(sourceKey);
    if (!definition || definition.status !== "production" || !definition.adapterKey) {
      throw new Error(`Source is not a production source: ${sourceKey}`);
    }

    const adapter = adapters.get(definition.adapterKey);
    if (!adapter) throw new Error(`Adapter not installed for source: ${sourceKey}`);

    const fetcher = getSourceFetcher(sourceKey);
    const rawItems = await fetcher.fetch();
    const items = limit === undefined ? rawItems : rawItems.slice(0, limit);

    let screenings = 0;
    let imagesAvailable = 0;
    let imagesMissing = 0;
    let warnings = 0;
    let failed = 0;

    for (const [index, item] of items.entries()) {
      try {
        const parsed = fetcher.toParsedItem(item);
        const result: AdapterResult = await enrichAdapterResultImages(
          adapter.parse(parsed, item),
        );

        warnings += result.warnings.length;

        for (const screening of result.screenings) {
          screenings += 1;
          for (const screeningFilm of screening.films) {
            if (screeningFilm.film.imageUrl) imagesAvailable += 1;
            else imagesMissing += 1;
          }

          sqlParts.push(screeningSql(sourceKey, screening, sqlParts.length + index));
        }
      } catch (error) {
        failed += 1;
        throw new Error(
          `${sourceKey} item ${index} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    summary.push({
      source: sourceKey,
      fetched: items.length,
      screenings,
      imagesAvailable,
      imagesMissing,
      warnings,
      failed,
    });
  }

  sqlParts.push(
    "",
    "COMMIT;",
    "",
    "-- Post-load verification:",
    "SELECT s.parser_key, COUNT(e.id) AS events, COUNT(DISTINCT sf.film_id) AS films, COUNT(sc.id) AS screenings",
    "FROM public.sources s",
    "LEFT JOIN public.events e ON e.source_id = s.id",
    "LEFT JOIN public.screenings sc ON sc.event_id = e.id",
    "LEFT JOIN public.screening_films sf ON sf.screening_id = sc.id",
    "WHERE s.parser_key IN ('cinemateca_pt','cinema_sao_jorge','cinema_fernando_lopes','doclisboa')",
    "GROUP BY s.parser_key",
    "ORDER BY s.parser_key;",
    "",
  );

  const outputDir = resolve("tmp");
  const outputFile = resolve(outputDir, "production-ingestion.sql");
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, sqlParts.join("\n"), "utf8");

  console.log(JSON.stringify({
    generated: true,
    outputFile,
    sources: summary,
    totalScreenings: summary.reduce((sum, item) => sum + Number(item.screenings ?? 0), 0),
    totalImagesAvailable: summary.reduce((sum, item) => sum + Number(item.imagesAvailable ?? 0), 0),
    totalImagesMissing: summary.reduce((sum, item) => sum + Number(item.imagesMissing ?? 0), 0),
  }, null, 2));
}

await main();
