import { createProductionAdapterRegistry } from "../core/production-adapters";
import { getProductionSources, getSourceDefinition } from "../core/source-registry";
import { getSourceFetcher } from "../core/source-fetchers";

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

async function main(): Promise<void> {
  const appUrl = requiredEnv("DOCUEVENTS_APP_URL").replace(/\/$/, "");
  const automationToken = requiredEnv("DOCUEVENTS_INGEST_AUTOMATION_TOKEN");

  const requestedSource = process.env.INGEST_SOURCE?.trim();
  const sourceKey = requestedSource || "cinemateca_pt";

  if (sourceKey !== "cinemateca_pt") {
    throw new Error(
      "Automated persistence is currently enabled only for cinemateca_pt.",
    );
  }

  const source = getProductionSources().find((item) => item.key === sourceKey);
  if (!source) {
    throw new Error(`Unknown production source: ${sourceKey}`);
  }

  const definition = getSourceDefinition(source.key);
  if (!definition) {
    throw new Error(`Missing source definition: ${source.key}`);
  }

  const limit = process.env.INGEST_LIMIT
    ? Number.parseInt(process.env.INGEST_LIMIT, 10)
    : undefined;

  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("INGEST_LIMIT must be a positive integer.");
  }

  const startedAt = new Date().toISOString();
  const adapters = createProductionAdapterRegistry();
  const adapter = adapters.get(definition.adapterKey!);

  if (!adapter) {
    throw new Error(`Adapter not installed: ${definition.adapterKey}`);
  }

  const fetcher = getSourceFetcher(source.key, {
    url: definition.canonicalUrl,
    now: () => new Date(),
  });

  const rawItems = await fetcher.fetch();
  const items = limit === undefined ? rawItems : rawItems.slice(0, limit);

  const screenings: unknown[] = [];
  const tvPrograms: unknown[] = [];
  const warnings: string[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  for (const [index, item] of items.entries()) {
    try {
      const parsed = fetcher.toParsedItem(item);
      const result = adapter.parse(parsed, item);

      screenings.push(...result.screenings);
      tvPrograms.push(...(result.tvPrograms ?? []));
      warnings.push(...result.warnings);
    } catch (error) {
      errors.push({
        index,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const payload = {
    fetched: items.length,
    screenings,
    tvPrograms,
    warnings,
    errors,
    fetchedAt: startedAt,
  };

  const response = await fetch(
    `${appUrl}/api/internal/ingest/source/${encodeURIComponent(source.key)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-docuevents-automation-token": automationToken,
      },
      body: JSON.stringify(payload),
    },
  );

  const responseText = await response.text();
  let result: Record<string, unknown>;

  try {
    result = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    throw new Error(
      `DocuEvents ingestion endpoint returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `DocuEvents ingestion endpoint failed (HTTP ${response.status}): ${JSON.stringify(result)}`,
    );
  }

  console.log(JSON.stringify(result, null, 2));

  if (Number(result.failed ?? 0) > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
