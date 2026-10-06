import { fetchCinematecaProgramme } from "../sources/cinemateca_pt/fetcher";
import { fetchCinemaSaoJorgeProgramme } from "../sources/cinema_sao_jorge/fetcher";
import { fetchCinemaFernandoLopesProgramme } from "../sources/cinema_fernando_lopes/fetcher";
import { fetchDoclisboaProgramme } from "../sources/doclisboa/fetcher";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function dateRange(values: string[]): { min?: string; max?: string } {
  const dates = unique(values.filter(Boolean)).sort();
  return { min: dates[0], max: dates.at(-1) };
}

async function main(): Promise<void> {
  const checkedAt = new Date();

  const results = await Promise.allSettled([
    fetchCinematecaProgramme(),
    fetchCinemaSaoJorgeProgramme(),
    fetchCinemaFernandoLopesProgramme(),
    fetchDoclisboaProgramme(),
  ]);

  const [cinematecaResult, saoJorgeResult, fernandoLopesResult, doclisboaResult] = results;

  const summary = {
    checkedAt: checkedAt.toISOString(),
    ok: results.every((result) => result.status === "fulfilled"),
    sources: {
      cinemateca_pt:
        cinematecaResult.status === "fulfilled"
          ? (() => {
              const items = cinematecaResult.value;
              return {
                ok: true,
                screenings: items.length,
                uniqueTitles: unique(items.map((item) => item.title)).length,
                missingDirector: items.filter((item) => !item.director).length,
                missingVenue: items.filter((item) => !item.venue).length,
                duplicateIds: items.length - unique(items.map((item) => item.sourceExternalId ?? "")).length,
                dateRange: dateRange(items.map((item) => item.date)),
              };
            })()
          : { ok: false, error: String(cinematecaResult.reason) },

      cinema_sao_jorge:
        saoJorgeResult.status === "fulfilled"
          ? (() => {
              const items = saoJorgeResult.value;
              return {
                ok: true,
                screenings: items.length,
                uniqueTitles: unique(items.map((item) => item.title)).length,
                withFestival: items.filter((item) => Boolean(item.festival)).length,
                missingDate: items.filter((item) => !item.date).length,
                missingTime: items.filter((item) => !item.time).length,
                duplicateIds: items.length - unique(items.map((item) => item.sourceExternalId ?? "")).length,
                dateRange: dateRange(items.map((item) => item.date)),
                festivals: unique(
                  items
                    .map((item) => item.festival)
                    .filter((value): value is string => Boolean(value)),
                ),
              };
            })()
          : { ok: false, error: String(saoJorgeResult.reason) },

      cinema_fernando_lopes:
        fernandoLopesResult.status === "fulfilled"
          ? (() => {
              const items = fernandoLopesResult.value;
              return {
                ok: true,
                screenings: items.length,
                uniqueTitles: unique(items.map((item) => item.title)).length,
                withFestival: items.filter((item) => Boolean(item.festival)).length,
                missingDate: items.filter((item) => !item.date).length,
                missingTime: items.filter((item) => !item.time).length,
                duplicateIds: items.length - unique(items.map((item) => item.sourceExternalId ?? "")).length,
                dateRange: dateRange(items.map((item) => item.date)),
                festivals: unique(
                  items
                    .map((item) => item.festival)
                    .filter((value): value is string => Boolean(value)),
                ),
              };
            })()
          : { ok: false, error: String(fernandoLopesResult.reason) },

      doclisboa:
        doclisboaResult.status === "fulfilled"
          ? (() => {
              const items = doclisboaResult.value;
              const films = items.flatMap((item) => item.films);
              return {
                ok: true,
                screenings: items.length,
                uniqueScreeningTitles: unique(items.map((item) => item.title)).length,
                filmRecords: films.length,
                uniqueFilmTitles: unique(films.map((film) => film.title)).length,
                missingVenue: items.filter((item) => !item.venue).length,
                missingDate: items.filter((item) => !item.date).length,
                missingFilm: items.filter((item) => item.films.length === 0).length,
                duplicateIds: items.length - unique(items.map((item) => item.sourceExternalId ?? "")).length,
                dateRange: dateRange(items.map((item) => item.date)),
                venues: unique(items.map((item) => item.venue)),
              };
            })()
          : { ok: false, error: String(doclisboaResult.reason) },
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
