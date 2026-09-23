export * from "./core/contracts";
export * from "./core/entity-resolution";
export * from "./core/persistence-contracts";
export * from "./core/source-registry";
export * from "./core/source-fetchers";
export * from "./core/source-pipeline";
export * from "./core/adapter-registry";
export * from "./core/ingestion-runner";
export * from "./core/production-adapters";
export * from "./sources/cinemateca_pt/types";
export { normalizeProgrammeItem } from "./sources/cinemateca_pt/normalizer";
export { parseProgrammeItems } from "./sources/cinemateca_pt/parser";
export {
  fetchCinematecaProgramme,
  DEFAULT_SOURCE_KEY,
  DEFAULT_SOURCE_URL,
  type FetchCinematecaOptions,
} from "./sources/cinemateca_pt/fetcher";
export * from "./sources/cinema_sao_jorge/types";
export { normalizeProgrammeItem as normalizeCinemaSaoJorgeProgrammeItem } from "./sources/cinema_sao_jorge/normalizer";
export { parseProgrammeItems as parseCinemaSaoJorgeProgrammeItems } from "./sources/cinema_sao_jorge/parser";
export {
  fetchCinemaSaoJorgeProgramme,
  DEFAULT_SOURCE_KEY as CINEMA_SAO_JORGE_SOURCE_KEY,
  DEFAULT_SOURCE_URL as CINEMA_SAO_JORGE_SOURCE_URL,
  type FetchCinemaSaoJorgeOptions,
} from "./sources/cinema_sao_jorge/fetcher";
export * from "./sources/cinema_fernando_lopes/types";
export {
  normalizeProgrammeItem as normalizeCinemaFernandoLopesProgrammeItem,
  CINEMA_FERNANDO_LOPES_SOURCE_KEY,
} from "./sources/cinema_fernando_lopes/normalizer";
export {
  parseProgrammeItems as parseCinemaFernandoLopesProgrammeItems,
  cinemaFernandoLopesAdapter,
} from "./sources/cinema_fernando_lopes/parser";
export {
  fetchCinemaFernandoLopesProgramme,
  DEFAULT_SOURCE_KEY as CINEMA_FERNANDO_LOPES_DEFAULT_SOURCE_KEY,
  DEFAULT_SOURCE_URL as CINEMA_FERNANDO_LOPES_SOURCE_URL,
  type FetchCinemaFernandoLopesOptions,
} from "./sources/cinema_fernando_lopes/fetcher";
export * from "./sources/doclisboa/types";
export {
  DOCLISBOA_FESTIVAL_KEY,
  normalizeFestival as normalizeDoclisboaFestival,
  normalizeFestivalEdition as normalizeDoclisboaFestivalEdition,
  normalizeProgrammeItem as normalizeDoclisboaProgrammeItem,
} from "./sources/doclisboa/normalizer";
export {
  parseProgrammeItems as parseDoclisboaProgrammeItems,
  doclisboaAdapter,
} from "./sources/doclisboa/parser";
export {
  fetchDoclisboaProgramme,
  DOCLISBOA_SOURCE_KEY,
  DOCLISBOA_PROGRAMME_URL,
  type FetchDoclisboaOptions,
} from "./sources/doclisboa/fetcher";
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
export { fetchSicProgramme, SIC_SOURCE_KEY, SIC_CHANNELS_URL, SIC_EPG_URL, type FetchSicOptions } from "./sources/sic/fetcher";

export * from "./sources/tvi/types";
export { parseTviScheduleHtml, tviAdapter } from "./sources/tvi/parser";
export { fetchTviProgramme, TVI_SOURCE_KEY, TVI_PROGRAMMES_URL, type FetchTviOptions } from "./sources/tvi/fetcher";
