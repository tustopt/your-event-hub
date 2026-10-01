import type { AdapterResult, ParsedSourceItem, SourceAdapter } from "../../core/contracts";
import { normalizeProgrammeItem } from "./normalizer";
import type { CinemaIdealProgrammeItem } from "./types";

export function parseProgrammeItems(
  input: ParsedSourceItem,
  items: readonly CinemaIdealProgrammeItem[],
): AdapterResult {
  const screenings = items.map(normalizeProgrammeItem);
  const warnings = screenings.flatMap((screening, index) =>
    screening.films.length ? [] : [`Item ${index + 1} has no film records.`],
  );

  return {
    screenings,
    events: screenings.map((screening) => ({
      eventType: "screening" as const,
      title: screening.title,
      startAt: screening.startAt,
      venue: screening.venue,
      provenance: screening.provenance,
    })),
    warnings,
  };
}

export const cinemaIdealAdapter: SourceAdapter<CinemaIdealProgrammeItem> = {
  key: "cinema_ideal",
  sourceType: "website",
  parse(input, sourceItem) {
    return parseProgrammeItems(input, sourceItem ? [sourceItem] : []);
  },
};
