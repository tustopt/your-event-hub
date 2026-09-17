import type { AdapterResult, ParsedSourceItem, SourceAdapter } from "../../core/contracts";
import {
  normalizeFestival,
  normalizeFestivalEdition,
  normalizeProgrammeItem,
} from "./normalizer";
import type { DoclisboaProgrammeItem } from "./types";

export function parseProgrammeItems(
  input: ParsedSourceItem,
  items: readonly DoclisboaProgrammeItem[],
): AdapterResult {
  const warnings: string[] = [];
  const festivals = items.length ? [normalizeFestival()] : [];
  const editionYears = [...new Set(items.map((item) => item.editionYear))];
  const festivalEditions = editionYears.map((year) =>
    normalizeFestivalEdition(year, input.sourceUrl ?? "https://doclisboa.org/"),
  );
  const screenings = items.map(normalizeProgrammeItem);

  for (const [index, item] of items.entries()) {
    if (!item.venue) warnings.push(`Item ${index + 1} has no venue.`);
    if (!item.title) warnings.push(`Item ${index + 1} has no film title.`);
    if (!item.editionYear) warnings.push(`Item ${index + 1} has no festival edition year.`);
  }

  return {
    events: screenings.map((screening) => ({
      eventType: "screening",
      title: screening.title,
      startAt: screening.startAt,
      venue: screening.venue,
      festivalKey: screening.festivalKey,
      festivalEditionYear: screening.festivalEditionYear,
      film: screening.films[0]?.film,
      provenance: screening.provenance,
    })),
    screenings,
    festivals,
    festivalEditions,
    warnings,
  };
}

export const doclisboaAdapter: SourceAdapter<DoclisboaProgrammeItem> = {
  key: "doclisboa",
  sourceType: "website",
  parse(input, sourceItem) {
    return parseProgrammeItems(input, sourceItem ? [sourceItem] : []);
  },
};
