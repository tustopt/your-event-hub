import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { CINEMATECA_SOURCE_KEY, type CinematecaSource } from "@/lib/ingestion/contract";
import {
  runCinematecaIngestion,
  type PersistScreening,
} from "@/lib/ingestion/run-ingestion";

const bodySchema = z
  .object({
    dryRun: z.boolean().optional(),
    limit: z.number().int().positive().max(500).optional(),
  })
  .strict();

// Injectable for tests; defaults to the real GitHub parser + Cloud database.
export type Deps = {
  loadSource: () => Promise<CinematecaSource>;
  createPersist: () => Promise<PersistScreening>;
};

const defaultDeps: Deps = {
  loadSource: async () => {
    const { loadCinematecaSource } = await import("@/lib/ingestion/cinemateca-source.server");
    return loadCinematecaSource();
  },
  createPersist: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return async (screening) => {
      const { error } = await supabaseAdmin.rpc("ingest_screening", {
        p_source_key: CINEMATECA_SOURCE_KEY,
        p_screening: screening,
      } as never);
      if (error) throw new Error(error.message);
    };
  },
};

export async function handleCinematecaIngest(
  request: Request,
  deps: Deps = defaultDeps,
): Promise<Response> {
  const unauthorized = await authenticateCronRequest(request);
  if (unauthorized) return unauthorized;

  let options = {};
  const rawBody = await request.text();
  if (rawBody.trim().length > 0) {
    try {
      options = bodySchema.parse(JSON.parse(rawBody));
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  let source: CinematecaSource;
  try {
    source = await deps.loadSource();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Parser unavailable" },
      { status: 501 },
    );
  }

  const dryRun = (options as { dryRun?: boolean }).dryRun === true;
  const persist: PersistScreening = dryRun
    ? async () => {}
    : await deps.createPersist();

  try {
    const result = await runCinematecaIngestion(source, persist, options);
    return Response.json({ source: CINEMATECA_SOURCE_KEY, ...result });
  } catch (error) {
    console.error("[ingest:cinemateca_pt]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 502 },
    );
  }
}

export const Route = createFileRoute("/api/public/ingest/cinemateca")({
  server: {
    handlers: {
      POST: ({ request }) => handleCinematecaIngest(request),
    },
  },
});
