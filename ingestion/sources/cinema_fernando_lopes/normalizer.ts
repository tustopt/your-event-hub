import type {
  NormalizedScreening,
  NormalizedScreeningFilm,
  NormalizedVenue,
  SourceProvenance,
} from "../../core/contracts";
import type { CinemaFernandoLopesProgrammeItem } from "./types";

export const CINEMA_FERNANDO_LOPES_SOURCE_KEY = "cinema_fernando_lopes";

function provenance(item: CinemaFernandoLopesProgrammeItem): SourceProvenance {
  return {
    sourceKey: CINEMA_FERNANDO_LOPES_SOURCE_KEY,
    sourceExternalId: item.sourceExternalId,
    sourceUrl: item.sourceUrl,
  };
}

function normalizePeople(item: CinemaFernandoLopesProgrammeItem) {
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

function normalizeVenue(item: CinemaFernandoLopesProgrammeItem): NormalizedVenue {
  return {
    name: item.venue?.trim() || "Cinema Fernando Lopes",
    type: "cinema",
    address: "Campo Grande 376",
    city: "Lisboa",
    postalCode: "1749-024",
    countryCode: "PT",
    website: "https://cinemafernandolopes.pt/",
    provenance: provenance(item),
  };
}

export function normalizeProgrammeItem(
  item: CinemaFernandoLopesProgrammeItem,
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
