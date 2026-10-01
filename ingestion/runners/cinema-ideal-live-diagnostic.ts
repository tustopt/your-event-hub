import { fetchCinemaIdealProgramme } from "../sources/cinema_ideal/fetcher";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function dateRange(values: string[]): { min?: string; max?: string } {
  const dates = unique(values.filter(Boolean)).sort();
  return { min: dates[0], max: dates.at(-1) };
}

async function main(): Promise<void> {
  const checkedAt = new Date();

  try {
    const items = await fetchCinemaIdealProgramme();
    const summary = {
      checkedAt: checkedAt.toISOString(),
      ok: items.length > 0,
      source: "cinema_ideal",
      screenings: items.length,
      uniqueTitles: unique(items.map((item) => item.title)).length,
      missingDate: items.filter((item) => !item.date).length,
      missingTime: items.filter((item) => !item.time).length,
      missingTitle: items.filter((item) => !item.title).length,
      duplicateIds: items.length - unique(items.map((item) => item.sourceExternalId)).length,
      dateRange: dateRange(items.map((item) => item.date)),
      sample: items.slice(0, 10),
    };

    console.log(JSON.stringify(summary, null, 2));
    if (items.length === 0) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          checkedAt: checkedAt.toISOString(),
          ok: false,
          source: "cinema_ideal",
          error: String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}

main();
