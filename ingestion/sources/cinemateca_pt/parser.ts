import type { AdapterResult, ParsedSourceItem, SourceAdapter } from "../../core/contracts";
import { normalizeProgrammeItem } from "./normalizer";
import type { CinematecaProgrammeItem } from "./types";

export function parseProgrammeItems(
  input: ParsedSourceItem,
  items: readonly CinematecaProgrammeItem[],
): AdapterResult {
  const warnings: string[] = [];
  const screenings = items.map((item) => normalizeProgrammeItem(item, input.sourceKey));

  for (const [index, screening] of screenings.entries()) {
    if (screening.films.length === 0) {
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

export const cinematecaAdapter: SourceAdapter<CinematecaProgrammeItem> = {
  key: "cinemateca_pt",
  sourceType: "website",
  parse(input, sourceItem) {
    return parseProgrammeItems(input, sourceItem ? [sourceItem] : []);
  },
};
