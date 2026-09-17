import type {
  NormalizedScreening,
  NormalizedScreeningFilm,
  NormalizedVenue,
  SourceProvenance,
} from "../../core/contracts";
import type { CinemaSaoJorgeProgrammeItem } from "./types";

export const CINEMA_SAO_JORGE_SOURCE_KEY = "cinema_sao_jorge";

function provenance(item: CinemaSaoJorgeProgrammeItem): SourceProvenance {
  return {
    sourceKey: CINEMA_SAO_JORGE_SOURCE_KEY,
    sourceExternalId: item.sourceExternalId,
    sourceUrl: item.sourceUrl,
  };
}

function normalizePeople(item: CinemaSaoJorgeProgrammeItem) {
  return item.director
    ?.split(/\s*(?:;|,|\s+e\s+)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      role: "director" as const,
      provenance: provenance(item),
    }));
}

function normalizeVenue(item: CinemaSaoJorgeProgrammeItem): NormalizedVenue {
  return {
    name: item.venue?.trim() || "Cinema São Jorge",
    type: "cinema",
    address: "Avenida da Liberdade 175",
    city: "Lisboa",
    postalCode: "1250-141",
    countryCode: "PT",
    website: "https://cinemasaojorge.pt/",
    provenance: provenance(item),
  };
}

export function normalizeProgrammeItem(
  item: CinemaSaoJorgeProgrammeItem,
): NormalizedScreening {
  const film: NormalizedScreeningFilm = {
    position: 1,
    film: {
      title: item.title.trim(),
      year: item.year,
      durationMinutes: item.durationMinutes,
      synopsis: item.synopsis?.trim() || undefined,
      people: normalizePeople(item),
      countries: item.country
        ?.split(/\s*[,/]\s*/)
        .map((value) => value.trim())
        .filter(Boolean),
      provenance: provenance(item),
    },
  };

  return {
    eventType: "screening",
    title: item.title.trim(),
    startAt: `${item.date}T${item.time}`,
    venue: normalizeVenue(item),
    cycle: item.festival?.trim() || undefined,
    films: [film],
    provenance: provenance(item),
  };
}
