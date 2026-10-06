import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { loadIngestionLibrary } from "@/lib/ingestion/source-library.server";
import { handleSourceIngest } from "./source.$sourceKey";

const bodySchema = z
  .object({
    dryRun: z.boolean().optional(),
    limit: z.number().int().positive().max(500).optional(),
    sources: z.array(z.string().min(1)).max(20).optional(),
  })
  .strict();

export async function handleProductionIngest(request: Request): Promise<Response> {
  const unauthorized = await authenticateCronRequest(request);
  if (unauthorized) return unauthorized;

  let options: {
    dryRun?: boolean;
    limit?: number;
    sources?: string[];
  } = {};

  const rawBody = await request.text();
  if (rawBody.trim().length > 0) {
    try {
      options = bodySchema.parse(JSON.parse(rawBody));
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  const library = await loadIngestionLibrary();
  const productionSources = library.getProductionSources();
  const selectedKeys = options.sources ?? productionSources.map((source) => source.key);
  const productionKeys = new Set(productionSources.map((source) => source.key));
  const invalidSources = selectedKeys.filter((key) => !productionKeys.has(key));

  if (invalidSources.length > 0) {
    return Response.json(
      {
        error: "Only production sources can be included in the production batch.",
        invalidSources,
      },
      { status: 400 },
    );
  }

  const sourceResults: Array<{
    source: string;
    status: number;
    result: unknown;
  }> = [];

  for (const sourceKey of selectedKeys) {
    const headers = new Headers(request.headers);
    headers.set("content-type", "application/json");

    const sourceRequest = new Request(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(options.dryRun !== undefined ? { dryRun: options.dryRun } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
      }),
    });

    try {
      const response = await handleSourceIngest(sourceRequest, sourceKey);
      let result: unknown;
      try {
        result = await response.json();
      } catch {
        result = { error: "Source ingestion returned a non-JSON response." };
      }
      sourceResults.push({ source: sourceKey, status: response.status, result });
    } catch (error) {
      sourceResults.push({
        source: sourceKey,
        status: 502,
        result: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  const failed = sourceResults.filter((item) => item.status >= 400).length;
  const persisted = sourceResults.reduce((sum, item) => {
    const result = item.result;
    if (!result || typeof result !== "object") return sum;
    const value = (result as { persisted?: unknown }).persisted;
    return sum + (typeof value === "number" ? value : 0);
  }, 0);

  return Response.json(
    {
      dryRun: options.dryRun === true,
      sources: sourceResults,
      summary: {
        requested: selectedKeys.length,
        succeeded: selectedKeys.length - failed,
        failed,
        persisted,
      },
    },
    { status: failed > 0 ? 207 : 200 },
  );
}

export const Route = createFileRoute("/api/public/ingest/production")({
  server: {
    handlers: {
      POST: ({ request }) => handleProductionIngest(request),
    },
  },
});
