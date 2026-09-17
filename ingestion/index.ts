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
