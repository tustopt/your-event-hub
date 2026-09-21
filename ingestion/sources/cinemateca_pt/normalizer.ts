import type {
  NormalizedScreening,
  NormalizedScreeningFilm,
  NormalizedVenue,
  SourceProvenance,
} from "../../core/contracts";
import type { CinematecaProgrammeItem } from "./types";

const DEFAULT_SOURCE_KEY = "cinemateca_pt";

function provenance(item: CinematecaProgrammeItem, sourceKey: string): SourceProvenance {
  return {
    sourceKey,
    sourceExternalId: item.sourceExternalId,
    sourceUrl: item.sourceUrl,
  };
}

function filmProvenance(item: CinematecaProgrammeItem, sourceKey: string): SourceProvenance {
  // The programme item's external ID identifies the screening occurrence, not
  // the film. Reusing it on films would create a different canonical film for
  // every screening of the same title.
  return {
    sourceKey,
    sourceUrl: item.sourceUrl,
  };
}

function parseNumber(value?: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return value;
}

function normalizeVenue(item: CinematecaProgrammeItem, sourceKey: string): NormalizedVenue | undefined {
  if (!item.venue?.trim()) return undefined;

  return {
    name: item.venue.trim(),
    type: "cinema",
    city: "Lisboa",
    countryCode: "PT",
    provenance: provenance(item, sourceKey),
  };
}

function normalizeDirectors(item: CinematecaProgrammeItem, sourceKey: string) {
  return item.director
    ?.split(/\s*(?:;|,|\s+e\s+)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      role: "director" as const,
      provenance: filmProvenance(item, sourceKey),
    }));
}

function normalizeFilms(item: CinematecaProgrammeItem, sourceKey: string): NormalizedScreeningFilm[] {
  const title = item.title.trim();
  if (!title) return [];

  const provenanceData = filmProvenance(item, sourceKey);
  const people = normalizeDirectors(item, sourceKey);
  const countries = item.country
    ?.split(/\s*[,/]\s*/)
    .map((country) => country.trim())
    .filter(Boolean);

  return [
    {
      position: 1,
      film: {
        title,
        originalTitle: item.originalTitle?.trim() || undefined,
        year: parseNumber(item.year),
        durationMinutes: parseNumber(item.durationMinutes),
        people: people?.length ? people : undefined,
        countries: countries?.length ? countries : undefined,
        provenance: provenanceData,
      },
    },
  ];
}

/**
 * Convert a source-specific Cinemateca item into the shared screening contract.
 * The source's local date/time is preserved here; timezone conversion belongs to
 * the ingestion pipeline so all adapters use the same policy.
 */
export function normalizeProgrammeItem(
  item: CinematecaProgrammeItem,
  sourceKey = DEFAULT_SOURCE_KEY,
): NormalizedScreening {
  const startAt = `${item.date}T${item.time}`;

  return {
    eventType: "screening",
    title: item.title.trim(),
    startAt,
    venue: normalizeVenue(item, sourceKey),
    language: item.language?.trim() || undefined,
    subtitleLanguage: item.subtitles?.trim() || undefined,
    films: normalizeFilms(item, sourceKey),
    cycle: item.cycle?.trim() || undefined,
    provenance: provenance(item, sourceKey),
  };
}
