import type {
  NormalizedFestival,
  NormalizedFestivalEdition,
  NormalizedScreening,
  NormalizedVenue,
} from "../../core/contracts";
import type { DoclisboaFilmItem, DoclisboaProgrammeItem } from "./types";

export const DOCLISBOA_FESTIVAL_KEY = "doclisboa";

export function normalizeFestival(): NormalizedFestival {
  return {
    key: DOCLISBOA_FESTIVAL_KEY,
    name: "Doclisboa",
    slug: "doclisboa",
    website: "https://doclisboa.org/",
    countryCode: "PT",
    provenance: {
      sourceKey: DOCLISBOA_FESTIVAL_KEY,
      sourceUrl: "https://doclisboa.org/",
    },
  };
}

export function normalizeFestivalEdition(
  editionYear: number,
  sourceUrl = "https://doclisboa.org/",
): NormalizedFestivalEdition {
  return {
    festivalKey: DOCLISBOA_FESTIVAL_KEY,
    year: editionYear,
    website: sourceUrl,
    provenance: {
      sourceKey: DOCLISBOA_FESTIVAL_KEY,
      sourceUrl,
      sourceExternalId: `${DOCLISBOA_FESTIVAL_KEY}-${editionYear}`,
    },
  };
}

function normalizeFilm(item: DoclisboaFilmItem, sourceExternalId: string, sourceUrl: string) {
  return {
    title: item.title,
    originalTitle: item.originalTitle,
    year: item.year,
    durationMinutes: item.durationMinutes,
    synopsis: item.synopsis,
    people: item.director ? [{ name: item.director, role: "director" as const }] : undefined,
    countries: item.country ? item.country.split(/\s*[,/]\s*/).filter(Boolean) : undefined,
    provenance: {
      sourceKey: DOCLISBOA_FESTIVAL_KEY,
      sourceExternalId,
      sourceUrl,
    },
  };
}

export function normalizeProgrammeItem(item: DoclisboaProgrammeItem): NormalizedScreening {
  const venue: NormalizedVenue = {
    name: item.venue,
    type: item.venueType ?? "festival_venue",
    city: "Lisboa",
    countryCode: "PT",
    provenance: {
      sourceKey: DOCLISBOA_FESTIVAL_KEY,
      sourceExternalId: item.sourceExternalId,
      sourceUrl: item.sourceUrl,
    },
  };

  const films = item.films.length
    ? item.films
    : [{
        title: item.title,
        originalTitle: undefined,
        durationMinutes: item.durationMinutes,
        director: item.director,
        country: item.country,
        year: item.year,
        synopsis: item.synopsis,
      }];

  return {
    eventType: "screening",
    title: item.title,
    startAt: `${item.date}T${item.time}:00+01:00`,
    endAt: item.durationMinutes
      ? new Date(Date.parse(`${item.date}T${item.time}:00+01:00`) + item.durationMinutes * 60_000).toISOString()
      : undefined,
    venue,
    language: item.language,
    subtitleLanguage: item.subtitleLanguage,
    format: item.format,
    ticketUrl: item.ticketUrl,
    films: films.map((film, index) => ({
      position: index + 1,
      film: normalizeFilm(film, item.sourceExternalId, item.sourceUrl),
    })),
    cycle: item.section,
    festivalKey: DOCLISBOA_FESTIVAL_KEY,
    festivalEditionYear: item.editionYear,
    provenance: {
      sourceKey: DOCLISBOA_FESTIVAL_KEY,
      sourceExternalId: item.sourceExternalId,
      sourceUrl: item.sourceUrl,
    },
  };
}
