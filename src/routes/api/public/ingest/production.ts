import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { handleSourceIngest } from "@/routes/api/public/ingest/source.$sourceKey";

type SourceResult = {
  source: string;
  status: number;
  ok: boolean;
  result: unknown;
};

export const Route = createFileRoute("/api/public/ingest/production")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;

        let library;
        try {
          const { loadIngestionLibrary } = await import(
            "@/lib/ingestion/source-library.server"
          );
          library = await loadIngestionLibrary();
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

        const productionSources = library
          .getProductionSources()
          .filter(
            (source) =>
              source.status === "production" && Boolean(source.adapterKey),
          );

        if (productionSources.length === 0) {
          return Response.json(
            { error: "No production sources configured." },
            { status: 409 },
          );
        }

        const results: SourceResult[] = [];

        for (const source of productionSources) {
          try {
            const response = await handleSourceIngest(
              request.clone(),
              source.key,
            );
            let body: unknown = null;
            try {
              body = await response.json();
            } catch {
              body = null;
            }
            results.push({
              source: source.key,
              status: response.status,
              ok: response.ok,
              result: body,
            });
          } catch (error) {
            results.push({
              source: source.key,
              status: 502,
              ok: false,
              result: {
                error:
                  error instanceof Error ? error.message : String(error),
              },
            });
          }
        }

        const allOk = results.every((result) => result.ok);

        return Response.json(
          {
            sources: results.length,
            succeeded: results.filter((result) => result.ok).length,
            failed: results.filter((result) => !result.ok).length,
            results,
          },
          { status: allOk ? 200 : 207 },
        );
      },
    },
  },
});
