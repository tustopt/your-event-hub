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
    countries: item.country
      ? item.country
          .split(/\s*[,/]\s*/)
          .map((country) => country.replace(/^•\s*/, "").trim())
          .filter(Boolean)
      : undefined,
    provenance: {
      sourceKey: DOCLISBOA_FESTIVAL_KEY,
      sourceExternalId,
      sourceUrl,
    },
  };
}

function formatEndDateTimeWithOffset(
  date: string,
  time: string,
  durationMinutes: number,
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const end = new Date(Date.UTC(year, month - 1, day, hours, minutes + durationMinutes));

  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}T${String(end.getUTCHours()).padStart(2, "0")}:${String(end.getUTCMinutes()).padStart(2, "0")}:00+01:00`;
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
      ? formatEndDateTimeWithOffset(item.date, item.time, item.durationMinutes)
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
