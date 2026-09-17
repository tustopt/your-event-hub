export * from "./core/contracts";
export * from "./core/entity-resolution";
export * from "./core/persistence-contracts";
export * from "./core/source-registry";
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
  ingestCinematecaFixture,
  type CinematecaFixture,
  type FixtureRunResult,
} from "./runners/fixture-runner";
