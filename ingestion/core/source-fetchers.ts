import type { ParsedSourceItem } from "./contracts.js";
import type { SourceFetcher } from "./source-pipeline.js";
import { fetchCinematecaProgramme } from "../sources/cinemateca_pt/fetcher.js";
import { fetchCinemaSaoJorgeProgramme } from "../sources/cinema_sao_jorge/fetcher.js";
import { fetchCinemaFernandoLopesProgramme } from "../sources/cinema_fernando_lopes/fetcher.js";
import { fetchDoclisboaProgramme } from "../sources/doclisboa/fetcher.js";
import { fetchRtpProgramme } from "../sources/rtp/fetcher.js";
import { fetchTviProgramme } from "../sources/tvi/fetcher.js";

interface ProgrammeItemLike {
  sourceExternalId?: string;
  sourceUrl?: string;
}

export interface SourceFetcherOptions {
  fetchImpl?: typeof fetch;
  url?: string;
  now?: () => Date;
}

type ProgrammeFetch<T> = (options: SourceFetcherOptions) => Promise<readonly T[]>;

function websiteFetcher<T extends ProgrammeItemLike>(
  sourceKey: string,
  fetchProgramme: ProgrammeFetch<T>,
  options: SourceFetcherOptions,
): SourceFetcher<T> {
  return {
    sourceKey,
    sourceType: "website",
    fetch: () => fetchProgramme(options),
    toParsedItem: (item): ParsedSourceItem => ({
      sourceKey,
      sourceType: "website",
      ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
      ...(item.sourceExternalId ? { externalId: item.sourceExternalId } : {}),
      raw: JSON.stringify(item),
      parsedAt: new Date().toISOString(),
    }),
  };
}

type FetcherFactory = (options: SourceFetcherOptions) => SourceFetcher<any>;

/** Registry of implemented fetchers, keyed exactly like the source registry. */
export const sourceFetcherFactories: Readonly<Record<string, FetcherFactory>> = {
  cinemateca_pt: (options) =>
    websiteFetcher("cinemateca_pt", (o) => fetchCinematecaProgramme(o), options),
  cinema_sao_jorge: (options) =>
    websiteFetcher("cinema_sao_jorge", (o) => fetchCinemaSaoJorgeProgramme(o), options),
  cinema_fernando_lopes: (options) =>
    websiteFetcher("cinema_fernando_lopes", (o) => fetchCinemaFernandoLopesProgramme(o), options),
  doclisboa: (options) =>
    websiteFetcher("doclisboa", (o) => fetchDoclisboaProgramme(o), options),
  rtp: (options) =>
    websiteFetcher("rtp", (o) => fetchRtpProgramme(o), options),
  tvi: (options) =>
    websiteFetcher("tvi", (o) => fetchTviProgramme(o), options),
};

export function hasSourceFetcher(sourceKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(sourceFetcherFactories, sourceKey);
}

export function getSourceFetcher(
  sourceKey: string,
  options: SourceFetcherOptions = {},
): SourceFetcher<any> {
  const factory = sourceFetcherFactories[sourceKey];
  if (!factory) throw new Error(`No fetcher implemented for source: ${sourceKey}`);
  return factory(options);
}
