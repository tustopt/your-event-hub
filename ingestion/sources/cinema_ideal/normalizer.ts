import type { NormalizedScreening, NormalizedScreeningFilm, SourceProvenance } from "../../core/contracts";
import type { CinemaIdealProgrammeItem } from "./types";

export const CINEMA_IDEAL_SOURCE_KEY = "cinema_ideal";

function provenance(item: CinemaIdealProgrammeItem): SourceProvenance {
  return {
    sourceKey: CINEMA_IDEAL_SOURCE_KEY,
    sourceExternalId: item.sourceExternalId,
    sourceUrl: item.sourceUrl,
  };
}

export function normalizeProgrammeItem(item: CinemaIdealProgrammeItem): NormalizedScreening {
  const provenanceData = provenance(item);
  const film: NormalizedScreeningFilm = {
    position: 1,
    film: {
      title: item.title.trim(),
      originalTitle: item.originalTitle?.trim() || undefined,
      year: item.year,
      durationMinutes: item.durationMinutes,
      synopsis: item.synopsis?.trim() || undefined,
      people: item.director
        ? item.director.split(/\s*(?:;|,|\s+e\s+)\s*/i).filter(Boolean).map((name) => ({
            name: name.trim(),
            role: "director" as const,
            provenance: provenanceData,
          }))
        : undefined,
      countries: item.country?.split(/\s*[,/]\s*/).map((value) => value.trim()).filter(Boolean),
      provenance: provenanceData,
    },
  };

  return {
    eventType: "screening",
    title: item.title.trim(),
    startAt: `${item.date}T${item.time}`,
    venue: {
      name: item.venue?.trim() || "Cinema Ideal",
      type: "cinema",
      address: "Rua do Loreto, 15-17",
      city: "Lisboa",
      postalCode: "1200-241",
      countryCode: "PT",
      website: "https://www.cinemaidealemcasa.pt/",
      provenance: provenanceData,
    },
    films: [film],
    provenance: provenanceData,
  };
}
