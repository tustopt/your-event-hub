import { createClient } from "@supabase/supabase-js";
import { createProductionAdapterRegistry } from "../core/production-adapters";
import { getProductionSources, getSourceDefinition } from "../core/source-registry";
import { getSourceFetcher } from "../core/source-fetchers";

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

async function main(): Promise<void> {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const secretKey = requiredEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adapters = createProductionAdapterRegistry();

  const requestedSource = process.env.INGEST_SOURCE?.trim();
  const sources = getProductionSources().filter(
    (source) => !requestedSource || source.key === requestedSource,
  );

  if (sources.length === 0) {
    throw new Error(
      requestedSource
        ? `Unknown production source: ${requestedSource}`
        : "No production sources are registered.",
    );
  }

  const limit = process.env.INGEST_LIMIT
    ? Number.parseInt(process.env.INGEST_LIMIT, 10)
    : undefined;

  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("INGEST_LIMIT must be a positive integer.");
  }

  const summary: Array<Record<string, unknown>> = [];
  let totalFailed = 0;

  for (const source of sources) {
    const definition = getSourceDefinition(source.key);
    if (!definition) throw new Error(`Missing source definition: ${source.key}`);

    const startedAt = new Date().toISOString();
    let fetched = 0;
    let processed = 0;
    let persisted = 0;
    let failed = 0;

    try {
      const fetcher = getSourceFetcher(source.key, {
        url: definition.canonicalUrl,
        now: () => new Date(),
      });
      const adapter = adapters.get(definition.adapterKey!);
      if (!adapter) throw new Error(`Adapter not installed: ${definition.adapterKey}`);

      const rawItems = await fetcher.fetch();
      const items = limit === undefined ? rawItems : rawItems.slice(0, limit);
      fetched = items.length;

      for (const [index, item] of items.entries()) {
        try {
          const parsed = fetcher.toParsedItem(item);
          const result = adapter.parse(parsed, item);

          for (const screening of result.screenings) {
            processed += 1;
            const { error } = await supabase.rpc("ingest_screening", {
              p_source_key: source.key,
              p_screening: screening,
            } as never);
            if (error) throw new Error(error.message);

            if (screening.festivalKey && screening.festivalEditionYear && screening.provenance.sourceExternalId) {
              const { error: festivalError } = await supabase.rpc("link_event_festival", {
                p_source_key: source.key,
                p_source_external_id: screening.provenance.sourceExternalId,
                p_festival_key: screening.festivalKey,
                p_festival_year: screening.festivalEditionYear,
              } as never);
              if (festivalError) throw new Error(festivalError.message);
            }

            persisted += 1;
          }

          for (const program of result.tvPrograms ?? []) {
            processed += 1;
            const { error } = await supabase.rpc("ingest_tv_program", {
              p_source_key: source.key,
              p_program: program,
            } as never);
            if (error) throw new Error(error.message);
            persisted += 1;
          }
        } catch (error) {
          failed += 1;
          console.error(
            JSON.stringify({
              source: source.key,
              index,
              message: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      }

      const { error: sourceUpdateError } = await supabase
        .from("sources")
        .update({
          last_fetched_at: startedAt,
          last_success_at: new Date().toISOString(),
          last_error_at: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("parser_key", source.key);

      if (sourceUpdateError) throw new Error(sourceUpdateError.message);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ingest:${source.key}] ${message}`);

      await supabase
        .from("sources")
        .update({
          last_fetched_at: startedAt,
          last_error_at: new Date().toISOString(),
          last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("parser_key", source.key);
    }

    totalFailed += failed;
    summary.push({
      source: source.key,
      fetched,
      processed,
      persisted,
      failed,
    });
  }

  console.log(JSON.stringify({ summary }, null, 2));

  if (totalFailed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
