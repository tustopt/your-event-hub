import { fetchDoclisboaProgramme, DOCLISBOA_PROGRAMME_URL } from "../sources/doclisboa/fetcher.js";

function printCounts(title: string, values: Map<string, number>): void {
  console.log(title);
  for (const [key, count] of [...values.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log(`  ${count.toString().padStart(3)}  ${key}`);
  }
  console.log("");
}

async function main(): Promise<void> {
  console.log("Doclisboa PDF ingestion diagnostic");
  console.log(`Source: ${DOCLISBOA_PROGRAMME_URL}`);
  console.log("");

  const startedAt = Date.now();
  const items = await fetchDoclisboaProgramme();
  const elapsedMs = Date.now() - startedAt;

  console.log(`PDF download + parse: OK (${elapsedMs} ms)`);
  console.log(`Programme items: ${items.length}`);

  if (!items.length) {
    console.error("Result: FAIL - no programme items were extracted");
    process.exitCode = 1;
    return;
  }

  const dates = new Map<string, number>();
  const venues = new Map<string, number>();
  const sections = new Map<string, number>();
  const titles = new Map<string, number>();

  for (const item of items) {
    dates.set(item.date, (dates.get(item.date) ?? 0) + 1);
    venues.set(item.venue, (venues.get(item.venue) ?? 0) + 1);
    sections.set(item.section ?? "(sem secção)", (sections.get(item.section ?? "(sem secção)") ?? 0) + 1);
    titles.set(item.title, (titles.get(item.title) ?? 0) + 1);
  }

  const missingDirector = items.filter((item) => !item.director).length;
  const missingYear = items.filter((item) => !item.year).length;
  const missingDuration = items.filter((item) => !item.durationMinutes).length;
  const duplicateIds = items.length - new Set(items.map((item) => item.sourceExternalId)).size;
  const repeatedTitles = [...titles.values()].filter((count) => count > 1).length;

  const duplicateKeyCounts = new Map<string, number>();
  for (const item of items) {
    const key = `${item.date}|${item.time}|${item.venue}|${item.title}`;
    duplicateKeyCounts.set(key, (duplicateKeyCounts.get(key) ?? 0) + 1);
  }
  const exactDuplicates = [...duplicateKeyCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);

  const datesSorted = [...dates.keys()].sort();

  console.log(`Date range: ${datesSorted[0]} -> ${datesSorted[datesSorted.length - 1]}`);
  console.log(`Unique films/titles: ${titles.size}`);
  console.log(`Repeated titles (multiple sessions): ${repeatedTitles}`);
  console.log(`Duplicate source IDs: ${duplicateIds}`);
  console.log(`Exact duplicate session keys: ${exactDuplicates}`);
  console.log(`Missing director: ${missingDirector}`);
  console.log(`Missing year: ${missingYear}`);
  console.log(`Missing duration: ${missingDuration}`);
  console.log("");

  printCounts("Sessions by date:", dates);
  printCounts("Sessions by venue:", venues);
  printCounts("Sessions by section:", sections);

  console.log("Repeated titles:");
  const repeated = [...titles.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  if (!repeated.length) {
    console.log("  none");
  } else {
    for (const [title, count] of repeated) {
      console.log(`  ${count.toString().padStart(3)}  ${title}`);
    }
  }

  console.log("");
  console.log("First 10 extracted items:");
  for (const item of items.slice(0, 10)) {
    console.log(
      `- ${item.date} ${item.time} | ${item.venue} | ${item.title}` +
      (item.director ? ` | ${item.director}` : ""),
    );
  }

  console.log("");
  console.log("Result: PASS");
}

main().catch((error: unknown) => {
  console.error("Result: FAIL");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
