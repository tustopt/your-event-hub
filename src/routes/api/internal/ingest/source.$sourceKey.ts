import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const payloadItemSchema = z.record(z.string(), z.unknown());

const bodySchema = z
  .object({
    fetched: z.number().int().nonnegative(),
    screenings: z.array(payloadItemSchema).max(1000),
    tvPrograms: z.array(payloadItemSchema).max(1000),
    warnings: z.array(z.string()).max(5000).optional(),
    errors: z
      .array(
        z.object({
          index: z.number().int().nonnegative(),
          message: z.string(),
        }),
      )
      .max(1000)
      .optional(),
    fetchedAt: z.string().datetime().optional(),
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

export const Route = createFileRoute(
  "/api/internal/ingest/source/$sourceKey",
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const authError = authenticateAutomationRequest(request);
        if (authError) return authError;

        if (!["cinemateca_pt", "doclisboa"].includes(params.sourceKey)) {
          return Response.json(
            {
              error:
                "Automated ingestion is currently enabled only for cinemateca_pt and doclisboa.",
            },
            { status: 409 },
          );
        }

        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json(
            { error: "Invalid normalized ingestion payload" },
            { status: 400 },
          );
        }

        const startedAt = body.fetchedAt ?? new Date().toISOString();
        const errors = [...(body.errors ?? [])];
        let persisted = 0;

        for (const [index, screening] of body.screenings.entries()) {
          try {
            const { error } = await supabaseAdmin.rpc("ingest_screening", {
              p_source_key: params.sourceKey,
              p_screening: screening,
            } as never);
            if (error) throw new Error(error.message);

            if (
              screening["festivalKey"] &&
              screening["festivalEditionYear"] &&
              screening["provenance"] &&
              typeof screening["provenance"] === "object" &&
              screening["provenance"] !== null &&
              "sourceExternalId" in screening["provenance"]
            ) {
              const externalId = screening["provenance"]["sourceExternalId"];
              if (typeof externalId === "string" && externalId) {
                const { error: festivalError } = await supabaseAdmin.rpc(
                  "link_event_festival",
                  {
                    p_source_key: params.sourceKey,
                    p_source_external_id: externalId,
                    p_festival_key: screening["festivalKey"],
                    p_festival_year: screening["festivalEditionYear"],
                  } as never,
                );
                if (festivalError) throw new Error(festivalError.message);
              }
            }

            persisted += 1;
          } catch (error) {
            errors.push({
              index,
              message:
                error instanceof Error ? error.message : String(error),
            });
          }
        }

        for (const [index, program] of body.tvPrograms.entries()) {
          try {
            const { error } = await supabaseAdmin.rpc("ingest_tv_program", {
              p_source_key: params.sourceKey,
              p_program: program,
            } as never);
            if (error) throw new Error(error.message);

            persisted += 1;
          } catch (error) {
            errors.push({
              index: body.screenings.length + index,
              message:
                error instanceof Error ? error.message : String(error),
            });
          }
        }

        const finishedAt = new Date().toISOString();
        const hasErrors = errors.length > 0;
        const lastError = hasErrors
          ? errors
              .slice(0, 20)
              .map((error) => String(error.index) + ": " + error.message)
              .join(" | ")
              .slice(0, 4000)
          : null;

        const { error: sourceUpdateError } = await supabaseAdmin
          .from("sources")
          .update({
            last_fetched_at: startedAt,
            ...(hasErrors
              ? {
                  last_error_at: finishedAt,
                  last_error: lastError,
                }
              : {
                  last_success_at: finishedAt,
                  last_error_at: null,
                  last_error: null,
                }),
            updated_at: finishedAt,
          })
          .eq("parser_key", params.sourceKey);

        if (sourceUpdateError) {
          return Response.json(
            { error: sourceUpdateError.message },
            { status: 502 },
          );
        }

        return Response.json({
          source: params.sourceKey,
          fetched: body.fetched,
          processed: body.screenings.length + body.tvPrograms.length,
          persisted,
          failed: errors.length,
          warnings: body.warnings ?? [],
          errors,
          triggeredBy: "github-actions",
        });
      },
    },
  },
});
