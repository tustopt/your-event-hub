import type { AdapterResult, ParsedSourceItem, SourceAdapter } from "../../core/contracts";
import { normalizeProgrammeItem } from "./normalizer";
import type { CinemaSaoJorgeProgrammeItem } from "./types";

export function parseProgrammeItems(
  input: ParsedSourceItem,
  items: readonly CinemaSaoJorgeProgrammeItem[],
): AdapterResult {
  const warnings: string[] = [];
  const screenings = items.map((item) => normalizeProgrammeItem(item));

  for (const [index, screening] of screenings.entries()) {
    if (!screening.films.length) {
      warnings.push(`Item ${index + 1} has no film records.`);
    }
  }

  return {
    screenings,
    events: screenings.map((screening) => ({
      eventType: "screening",
      title: screening.title,
      startAt: screening.startAt,
      venue: screening.venue,
      provenance: screening.provenance,
    })),
    warnings,
  };
}

export const cinemaSaoJorgeAdapter: SourceAdapter<CinemaSaoJorgeProgrammeItem> = {
  key: "cinema_sao_jorge",
  sourceType: "website",
  parse(input, sourceItem) {
    return parseProgrammeItems(input, sourceItem ? [sourceItem] : []);
  },
};
