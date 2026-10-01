import { fetchCinematecaProgramme } from "../sources/cinemateca_pt/fetcher";
import { fetchCinemaSaoJorgeProgramme } from "../sources/cinema_sao_jorge/fetcher";
import { fetchCinemaFernandoLopesProgramme } from "../sources/cinema_fernando_lopes/fetcher";
import { fetchDoclisboaProgramme } from "../sources/doclisboa/fetcher";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

async function main(): Promise<void> {
  const checkedAt = new Date();
  const [cinemateca, saoJorge, fernandoLopes, doclisboa] = await Promise.all([
    fetchCinematecaProgramme(),
    fetchCinemaSaoJorgeProgramme(),
    fetchCinemaFernandoLopesProgramme(),
    fetchDoclisboaProgramme(),
  ]);

  const summary = {
    checkedAt: checkedAt.toISOString(),
    sources: {
      cinemateca_pt: {
        screenings: cinemateca.length,
        uniqueTitles: unique(cinemateca.map((item) => item.title)).length,
        missingDirector: cinemateca.filter((item) => !item.director).length,
        missingVenue: cinemateca.filter((item) => !item.venue).length,
        duplicateIds: cinemateca.length - unique(cinemateca.map((item) => item.sourceExternalId ?? "")).length,
      },
      cinema_sao_jorge: {
        screenings: saoJorge.length,
        uniqueTitles: unique(saoJorge.map((item) => item.title)).length,
        withFestival: saoJorge.filter((item) => Boolean(item.festival)).length,
        duplicateIds: saoJorge.length - unique(saoJorge.map((item) => item.sourceExternalId ?? "")).length,
      },
      cinema_fernando_lopes: {
        screenings: fernandoLopes.length,
        uniqueTitles: unique(fernandoLopes.map((item) => item.title)).length,
        withFestival: fernandoLopes.filter((item) => Boolean(item.festival)).length,
        duplicateIds: fernandoLopes.length - unique(fernandoLopes.map((item) => item.sourceExternalId ?? "")).length,
      },
      doclisboa: {
        screenings: doclisboa.length,
        uniqueTitles: unique(doclisboa.map((item) => item.title)).length,
        films: unique(doclisboa.flatMap((item) => item.films.map((film) => film.title))).length,
        missingVenue: doclisboa.filter((item) => !item.venue).length,
        missingDate: doclisboa.filter((item) => !item.date).length,
        duplicateIds: doclisboa.length - unique(doclisboa.map((item) => item.sourceExternalId ?? "")).length,
        dates: unique(doclisboa.map((item) => item.date)).sort(),
      },
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
