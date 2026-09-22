import type { AdapterResult, ParsedSourceItem, SourceAdapter } from "../../core/contracts";
import { normalizeTelevisionProgramme } from "./normalizer";
import type { TelevisionProgrammeItem } from "./types";

export function parseTelevisionProgrammeItem(
  input: ParsedSourceItem,
  item: TelevisionProgrammeItem,
): AdapterResult {
  const normalized = normalizeTelevisionProgramme(item);
  if (!normalized) return { events: [], screenings: [], tvPrograms: [], warnings: [] };
  return { events: [], screenings: [], tvPrograms: [normalized], warnings: [] };
}

export function createTelevisionAdapter(sourceKey: string): SourceAdapter<TelevisionProgrammeItem> {
  return {
    key: sourceKey,
    sourceType: "website",
    parse(input, sourceItem) {
      return sourceItem
        ? parseTelevisionProgrammeItem(input, sourceItem)
        : {
            events: [],
            screenings: [],
            tvPrograms: [],
            warnings: ["Television adapter received no source item."],
          };
    },
  };
}
