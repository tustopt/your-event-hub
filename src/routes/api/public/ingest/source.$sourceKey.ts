import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import type { IngestionLibrary } from "@/lib/ingestion/source-contract";
import {
  resolveRunnableSource,
  runSourceIngestion,
  SourceResolutionError,
  type PersistScreening,
} from "@/lib/ingestion/run-source-ingestion";

const bodySchema = z
  .object({
    dryRun: z.boolean().optional(),
    limit: z.number().int().positive().max(500).optional(),
  })
  .strict();

export type Deps = {
  loadLibrary: () => Promise<IngestionLibrary>;
  createPersist: () => Promise<PersistScreening>;
};

const defaultDeps: Deps = {
  loadLibrary: async () => {
    const { loadIngestionLibrary } = await import("@/lib/ingestion/source-library.server");
    return loadIngestionLibrary();
  },
  createPersist: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return async (screening, sourceKey) => {
      const { error } = await supabaseAdmin.rpc("ingest_screening", {
        p_source_key: sourceKey,
        p_screening: screening,
      } as never);
      if (error) throw new Error(error.message);
    };
  },
};

const RESOLUTION_STATUS: Record<string, number> = {
  unknown_source: 404,
  not_runnable: 409,
  no_adapter: 409,
  no_fetcher: 501,
};

export async function handleSourceIngest(
  request: Request,
  sourceKey: string,
  deps: Deps = defaultDeps,
): Promise<Response> {
  const unauthorized = await authenticateCronRequest(request);
  if (unauthorized) return unauthorized;

  let options: { dryRun?: boolean | undefined; limit?: number | undefined } = {};
  const rawBody = await request.text();
  if (rawBody.trim().length > 0) {
    try {
      options = bodySchema.parse(JSON.parse(rawBody));
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  let library: IngestionLibrary;
  try {
    library = await deps.loadLibrary();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Ingestion library unavailable" },
      { status: 501 },
    );
  }

  let resolved;
  try {
    resolved = resolveRunnableSource(library, sourceKey);
  } catch (error) {
    if (error instanceof SourceResolutionError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: RESOLUTION_STATUS[error.code] ?? 400 },
      );
    }
    throw error;
  }

  const persist: PersistScreening =
    options.dryRun === true ? async () => {} : await deps.createPersist();

  try {
    return Response.json(await runSourceIngestion(resolved, persist, options));
  } catch (error) {
    console.error(`[ingest:${sourceKey}]`, error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 502 },
    );
  }
}

export const Route = createFileRoute("/api/public/ingest/source/$sourceKey")({
  server: {
    handlers: {
      POST: ({ request, params }) => handleSourceIngest(request, params.sourceKey),
    },
  },
});
