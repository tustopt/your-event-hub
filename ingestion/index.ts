export {
  ingestCinematecaFixture,
  type CinematecaFixture,
  type FixtureRunResult,
} from "./runners/fixture-runner";

export * from "./sources/television/types";
export { normalizeTelevisionProgramme } from "./sources/television/normalizer";
export { createTelevisionAdapter } from "./sources/television/parser";
export * from "./sources/rtp/types";
export { rtpAdapter } from "./sources/rtp/parser";
export { fetchRtpProgramme, RTP_SOURCE_KEY, RTP_PROGRAMMES_URL, type FetchRtpOptions } from "./sources/rtp/fetcher";

export * from "./sources/sic/types";
export { sicAdapter } from "./sources/sic/parser";
export { fetchSicProgramme, SIC_SOURCE_KEY, SIC_CHANNELS_URL, SIC_EPG_URL } from "./sources/sic/fetcher";
export type { SourceFetcherOptions as FetchSicOptions } from "./core/source-fetchers";

export * from "./sources/tvi/types";
export { parseTviScheduleHtml } from "./sources/tvi/fetcher";
export { tviAdapter } from "./sources/tvi/parser";
export { fetchTviProgramme, TVI_SOURCE_KEY, TVI_PROGRAMMES_URL } from "./sources/tvi/fetcher";
export type { SourceFetcherOptions as FetchTviOptions } from "./core/source-fetchers";
export { getSourceDefinition, getProductionSources, sourceRegistry } from "./core/source-registry";
export { createProductionAdapterRegistry, productionAdapters } from "./core/production-adapters";
export { getSourceFetcher, hasSourceFetcher, sourceFetcherFactories } from "./core/source-fetchers";
export { runSourcePipeline } from "./core/source-pipeline";
export type { SourcePipelineOptions, SourcePipelineResult, SourceFetcher } from "./core/source-pipeline";
