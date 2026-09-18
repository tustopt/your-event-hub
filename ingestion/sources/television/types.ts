import type { SourceProvenance } from "../../core/contracts";

export const TELEVISION_DOCUMENTARY_GENRES = new Set([
  "documentário",
  "documentários",
  "documentary",
  "documentaries",
  "série documental",
  "séries documentais",
  "documental",
]);

export interface TelevisionProgrammeItem {
  sourceExternalId: string;
  sourceUrl: string;
  broadcasterKey: string;
  channel: string;
  title: string;
  description?: string;
  genre?: string;
  startAt: string;
  endAt?: string;
  durationMinutes?: number;
  episodeTitle?: string;
  season?: number;
  episode?: number;
  seriesTitle?: string;
  year?: number;
  provenance?: SourceProvenance;
}

export function isDocumentaryProgramme(item: Pick<TelevisionProgrammeItem, "genre">): boolean {
  if (!item.genre) return false;
  const normalized = item.genre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return normalized === "documentario" ||
    normalized === "documentarios" ||
    normalized === "documentary" ||
    normalized === "documentaries" ||
    normalized === "serie documental" ||
    normalized === "series documentais" ||
    normalized === "documental";
}
