import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
    limit: z.number().int().positive().max(25).optional(),
  })
  .strict();

function authenticateAutomationRequest(request: Request): Response | null {
  const expectedToken = process.env["DOCUEVENTS_INGEST_AUTOMATION_TOKEN"]?.trim();
  const suppliedToken = request.headers
    .get("x-docuevents-automation-token")
    ?.trim();

  if (!expectedToken || !suppliedToken || suppliedToken !== expectedToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

async function loadLibrary(): Promise<IngestionLibrary> {
  const { loadIngestionLibrary } = await import(
    "@/lib/ingestion/source-library.server"
  );
  return loadIngestionLibrary();
}

async function createPersist(): Promise<PersistScreening> {
  return async (screening, sourceKey) => {
    const { error } = await supabaseAdmin.rpc("ingest_screening", {
      p_source_key: sourceKey,
      p_screening: screening,
    } as never);
    if (error) throw new Error(error.message);

    if (screening["festivalKey"] && screening["festivalEditionYear"]) {
      const externalId = screening.provenance?.sourceExternalId;
      if (externalId) {
        const { error: festivalError } = await supabaseAdmin.rpc(
          "link_event_festival",
          {
            p_source_key: sourceKey,
            p_source_external_id: externalId,
            p_festival_key: screening["festivalKey"],
            p_festival_year: screening["festivalEditionYear"],
          } as never,
        );
        if (festivalError) throw new Error(festivalError.message);
      }
    }
  };
}

async function createPersistTVProgram(): Promise<PersistTVProgram> {
  return async (program, sourceKey) => {
    const { error } = await supabaseAdmin.rpc("ingest_tv_program", {
      p_source_key: sourceKey,
      p_program: program,
    } as never);
    if (error) throw new Error(error.message);
  };
}

const resolutionStatus: Record<string, number> = {
  unknown_source: 404,
  not_runnable: 409,
  no_adapter: 409,
  no_fetcher: 501,
};

export const Route = createFileRoute(
  "/api/internal/ingest/source/$sourceKey",
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const authError = authenticateAutomationRequest(request);
        if (authError) return authError;

        if (params.sourceKey !== "cinemateca_pt") {
          return Response.json(
            {
              error:
                "Automated ingestion is currently enabled only for cinemateca_pt.",
            },
            { status: 409 },
          );
        }

        let options: { limit?: number } = {};
        const rawBody = await request.text();

        if (rawBody.trim()) {
          try {
            options = bodySchema.parse(JSON.parse(rawBody));
          } catch {
            return Response.json(
              { error: "Invalid request body" },
              { status: 400 },
            );
          }
        }

        let library: IngestionLibrary;
        try {
          library = await loadLibrary();
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Ingestion library unavailable",
            },
            { status: 501 },
          );
        }

        let resolved;
        try {
          resolved = resolveRunnableSource(
            library,
            params.sourceKey,
            {},
            false,
          );
        } catch (error) {
          if (error instanceof SourceResolutionError) {
            return Response.json(
              { error: error.message, code: error.code },
              { status: resolutionStatus[error.code] ?? 400 },
            );
          }
          throw error;
        }

        try {
          const result = await runSourceIngestion(
            resolved,
            await createPersist(),
            await createPersistTVProgram(),
            options,
          );

          return Response.json({
            ...result,
            triggeredBy: "github-actions",
          });
        } catch (error) {
          console.error("[automated-ingest:cinemateca_pt]", error);
          return Response.json(
            {
              error:
                error instanceof Error ? error.message : "Ingestion failed",
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
