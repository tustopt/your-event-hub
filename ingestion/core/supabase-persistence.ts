import type { IngestionPersistencePort, ScreeningPersistenceInput } from "./persistence-contracts";
import type { NormalizedFilm, NormalizedVenue } from "./contracts";

export interface SupabaseLikeClient {
  from(table: string): {
    select(columns?: string): any;
    insert(values: unknown): any;
    update(values: unknown): any;
    upsert(values: unknown, options?: unknown): any;
  };
  rpc(functionName: string, args?: Record<string, unknown>): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

/**
 * Supabase persistence adapter.
 *
 * Source adapters remain database-agnostic. Atomic screening persistence is
 * delegated to the server-side ingest_screening() PostgreSQL function.
 */
export class SupabaseIngestionPersistence implements IngestionPersistencePort {
  constructor(private readonly client: SupabaseLikeClient) {}

  async resolveFilm(film: NormalizedFilm) {
    const canonicalKey = film.provenance.sourceExternalId
      ? `${film.provenance.sourceKey}:${film.provenance.sourceExternalId}`
      : `title:${film.title.trim().toLowerCase()}|year:${film.year ?? ""}`;

    return {
      action: "review" as const,
      confidence: "weak" as const,
      canonicalKey,
    };
  }

  async resolveVenue(venue: NormalizedVenue) {
    return {
      action: "review" as const,
      confidence: "weak" as const,
      canonicalKey: `${venue.name.trim().toLowerCase()}|${venue.city?.trim().toLowerCase() ?? ""}`,
    };
  }

  async persistScreening(
    input: ScreeningPersistenceInput,
  ): Promise<{ eventId: string; screeningId: string }> {
    const { data, error } = await this.client.rpc("ingest_screening", {
      p_source_key: input.screening.provenance.sourceKey,
      p_screening: input.screening,
    });

    if (error) {
      throw new Error(`Supabase ingestion failed: ${error.message}`);
    }

    if (!data || typeof data !== "object") {
      throw new Error("Supabase ingestion returned an invalid result.");
    }

    const result = data as Record<string, unknown>;
    const eventId = result.eventId;
    const screeningId = result.screeningId;

    if (typeof eventId !== "string" || typeof screeningId !== "string") {
      throw new Error("Supabase ingestion returned missing eventId/screeningId.");
    }

    return { eventId, screeningId };
  }
}
