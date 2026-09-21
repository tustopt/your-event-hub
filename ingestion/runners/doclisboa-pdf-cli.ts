import { fetchDoclisboaProgramme, DOCLISBOA_PROGRAMME_URL } from "../sources/doclisboa/fetcher.js";

async function main(): Promise<void> {
  console.log("Doclisboa PDF ingestion test");
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

  const venues = [...new Set(items.map((item) => item.venue))];
  const dates = items.map((item) => item.date).sort();

  console.log(`Date range: ${dates[0]} -> ${dates[dates.length - 1]}`);
  console.log(`Venues: ${venues.length}`);
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
