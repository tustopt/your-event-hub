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
    dryRun: z.boolean().optional(),
    limit: z.number().int().positive().max(25).optional(),
  })
  .strict();

type User = { id: string; email: string | null };

async function proxyLocalRequest(request: Request, sourceKey: string): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId =
    process.env["SUPABASE_PROJECT_ID"] ?? process.env["VITE_SUPABASE_PROJECT_ID"];
  const cloudAppUrl =
    process.env["DOCUEVENTS_CLOUD_APP_URL"] ??
    (projectId ? `https://id-preview--${projectId}.lovable.app` : undefined);

  if (!cloudAppUrl) {
    return Response.json(
      { error: "Cloud application URL is not configured." },
      { status: 500 },
    );
  }

  const target = `${cloudAppUrl.replace(/\\/$/, "")}/api/admin/ingest/source/${encodeURIComponent(sourceKey)}`;

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": request.headers.get("content-type") ?? "application/json",
      },
      body: await request.text(),
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[admin-ingest:local-proxy]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Cloud ingestion request failed" },
      { status: 502 },
    );
  }
}

async function authenticateAdminRequest(
  request: Request,
): Promise<{ user: User } | { response: Response }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const allowedEmail = process.env["DOCUEVENTS_INGEST_ADMIN_EMAIL"]?.trim().toLowerCase();
  const userEmail = data.user.email?.trim().toLowerCase();

  if (!allowedEmail || !userEmail || userEmail !== allowedEmail) {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: { id: data.user.id, email: data.user.email ?? null } };
}

async function loadLibrary(): Promise<IngestionLibrary> {
  const { loadIngestionLibrary } = await import("@/lib/ingestion/source-library.server");
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

export const Route = createFileRoute("/api/admin/ingest/source/$sourceKey")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        // During local development the private Supabase service-role key remains
        // in Cloud. The local server proxies the authenticated request to Cloud.
        if (import.meta.env.DEV) {
          return proxyLocalRequest(request, params.sourceKey);
        }

        const auth = await authenticateAdminRequest(request);
        if ("response" in auth) return auth.response;

        let options: { dryRun?: boolean; limit?: number } = {};
        const rawBody = await request.text();

        if (rawBody.trim()) {
          try {
            options = bodySchema.parse(JSON.parse(rawBody));
          } catch {
            return Response.json({ error: "Invalid request body" }, { status: 400 });
          }
        }

        let library: IngestionLibrary;
        try {
          library = await loadLibrary();
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Ingestion library unavailable" },
            { status: 501 },
          );
        }

        let resolved;
        try {
          resolved = resolveRunnableSource(library, params.sourceKey);
        } catch (error) {
          if (error instanceof SourceResolutionError) {
            return Response.json(
              { error: error.message, code: error.code },
              { status: resolutionStatus[error.code] ?? 400 },
            );
          }
          throw error;
        }

        const persist: PersistScreening =
          options.dryRun === true ? async () => {} : await createPersist();
        const persistTVProgram: PersistTVProgram =
          options.dryRun === true ? async () => {} : await createPersistTVProgram();

        try {
          const result = await runSourceIngestion(
            resolved,
            persist,
            persistTVProgram,
            options,
          );

          return Response.json({
            ...result,
            triggeredBy: auth.user.email ?? auth.user.id,
          });
        } catch (error) {
          console.error(`[admin-ingest:${params.sourceKey}]`, error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Ingestion failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});
