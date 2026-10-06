import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import type { IngestionLibrary } from "@/lib/ingestion/source-contract";
import {
  resolveRunnableSource,
  runSourceIngestion,
  SourceResolutionError,
  type PersistScreening,
  type PersistTVProgram,
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
  createPersistTVProgram: () => Promise<PersistTVProgram>;
};

const defaultDeps: Deps = {
  loadLibrary: async () => {
    const { loadIngestionLibrary } = await import("@/lib/ingestion/source-library.server");
    return loadIngestionLibrary();
  },
  createPersist: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return async (screening, sourceKey) => {
      const { data: ingestResult, error } = await supabaseAdmin.rpc("ingest_screening", {
        p_source_key: sourceKey,
        p_screening: screening,
      } as never);
      if (error) throw new Error(error.message);

      // The existing ingestion RPC creates/resolves the film and screening.
      // Persist the already-resolved source image onto films.poster_url
      // without changing the established ingestion contract.
      const screeningId =
        ingestResult && typeof ingestResult === "object" && "screeningId" in ingestResult
          ? (ingestResult as { screeningId?: unknown }).screeningId
          : undefined;
      const films = Array.isArray(screening["films"])
        ? (screening["films"] as Array<{ film?: { imageUrl?: unknown } }>)
        : [];

      if (typeof screeningId === "string" && films.length > 0) {
        const { data: screeningFilms, error: screeningFilmsError } = await supabaseAdmin
          .from("screening_films")
          .select("film_id,position,films(id,poster_url)")
          .eq("screening_id", screeningId)
          .order("position", { ascending: true });

        if (screeningFilmsError) throw new Error(screeningFilmsError.message);

        for (const [index, relation] of (screeningFilms ?? []).entries()) {
          const imageUrl = films[index]?.film?.imageUrl;
          if (typeof imageUrl !== "string" || imageUrl.trim() === "") continue;

          const filmRecord = Array.isArray(relation.films) ? relation.films[0] : relation.films;
          if (!filmRecord || filmRecord.poster_url) continue;

          const { error: imageError } = await supabaseAdmin
            .from("films")
            .update({ poster_url: imageUrl })
            .eq("id", relation.film_id);

          if (imageError) throw new Error(imageError.message);
        }
      }

      if (screening["festivalKey"] && screening["festivalEditionYear"]) {
        const externalId = screening.provenance?.sourceExternalId;
        if (externalId) {
          const { error: festivalError } = await supabaseAdmin.rpc("link_event_festival", {
            p_source_key: sourceKey,
            p_source_external_id: externalId,
            p_festival_key: screening["festivalKey"],
            p_festival_year: screening["festivalEditionYear"],
          } as never);
          if (festivalError) throw new Error(festivalError.message);
        }
      }
    };
  },
  createPersistTVProgram: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return async (program, sourceKey) => {
      const { error } = await supabaseAdmin.rpc("ingest_tv_program", {
        p_source_key: sourceKey,
        p_program: program,
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
    resolved = resolveRunnableSource(library, sourceKey, {}, options.dryRun === true);
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
  const persistTVProgram: PersistTVProgram =
    options.dryRun === true ? async () => {} : await deps.createPersistTVProgram();

  try {
    return Response.json(await runSourceIngestion(resolved, persist, persistTVProgram, options));
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
