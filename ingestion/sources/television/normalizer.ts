import type { NormalizedTVProgram } from "../../core/contracts";
import { isDocumentaryProgramme, type TelevisionProgrammeItem } from "./types";

export function normalizeTelevisionProgramme(
  item: TelevisionProgrammeItem,
): NormalizedTVProgram | undefined {
  if (!isDocumentaryProgramme(item)) return undefined;
  return {
    eventType: "television",
    sourceExternalId: item.sourceExternalId,
    sourceUrl: item.sourceUrl,
    title: item.title.trim(),
    ...(item.description ? { description: item.description.trim() } : {}),
    channel: item.channel.trim(),
    broadcasterKey: item.broadcasterKey,
    startAt: item.startAt,
    ...(item.endAt ? { endAt: item.endAt } : {}),
    ...(item.durationMinutes !== undefined ? { durationMinutes: item.durationMinutes } : {}),
    ...(item.episodeTitle ? { episodeTitle: item.episodeTitle.trim() } : {}),
    ...(item.season !== undefined ? { season: item.season } : {}),
    ...(item.episode !== undefined ? { episode: item.episode } : {}),
    ...(item.seriesTitle ? { seriesTitle: item.seriesTitle.trim() } : {}),
    ...(item.year !== undefined ? { year: item.year } : {}),
    ...(item.imageUrl ? { imageUrl: item.imageUrl.trim() } : {}),
    genre: "documentary",
    provenance: item.provenance ?? {
      sourceKey: item.broadcasterKey,
      sourceExternalId: item.sourceExternalId,
      sourceUrl: item.sourceUrl,
    },
  };
}
