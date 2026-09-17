import type { ParsedSourceItem } from "../core/contracts";
import type { IngestionPersistencePort } from "../core/persistence-contracts";
import type { CinematecaProgrammeItem } from "../sources/cinemateca_pt/types";
import { parseProgrammeItems } from "../sources/cinemateca_pt/parser";

export interface CinematecaFixture {
  source: {
    sourceKey: string;
    sourceUrl?: string;
    capturedAt: string;
  };
  items: CinematecaProgrammeItem[];
}

export interface FixtureRunResult {
  processed: number;
  persisted: number;
  failed: number;
  warnings: string[];
  failures: Array<{
    sourceExternalId?: string;
    title: string;
    message: string;
  }>;
}

/**
 * Runs a validated Cinemateca fixture through the parser/normalizer boundary
 * and persists each screening. Persistence is injected so this runner stays
 * independent of Supabase and can be tested without a database.
 */
export async function ingestCinematecaFixture(
  fixture: CinematecaFixture,
  persistence: IngestionPersistencePort,
): Promise<FixtureRunResult> {
  const input: ParsedSourceItem = {
    sourceKey: fixture.source.sourceKey,
    sourceType: "website",
    sourceUrl: fixture.source.sourceUrl,
    raw: "fixture",
    parsedAt: fixture.source.capturedAt,
  };

  const parsed = parseProgrammeItems(input, fixture.items);
  const result: FixtureRunResult = {
    processed: parsed.screenings.length,
    persisted: 0,
    failed: 0,
    warnings: [...parsed.warnings],
    failures: [],
  };

  for (const screening of parsed.screenings) {
    try {
      if (!screening.provenance.sourceExternalId) {
        throw new Error("Screening is missing sourceExternalId.");
      }

      const resolvedFilms = await Promise.all(
        screening.films.map(({ film }) => persistence.resolveFilm(film)),
      );

      const resolvedVenue = screening.venue
        ? await persistence.resolveVenue(screening.venue)
        : undefined;

      await persistence.persistScreening({
        screening,
        resolvedFilms,
        resolvedVenue,
      });

      result.persisted += 1;
    } catch (error) {
      result.failed += 1;
      result.failures.push({
        sourceExternalId: screening.provenance.sourceExternalId,
        title: screening.title,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
