import { fetchDoclisboaProgramme } from "../sources/doclisboa/fetcher";

async function main(): Promise<void> {
  const items = await fetchDoclisboaProgramme();
  const ids = items.map((item) => item.sourceExternalId);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

  const invalid = items.flatMap((item, index) => {
    const errors: string[] = [];
    if (!/^2026-10-\d{2}$/.test(item.date)) errors.push("invalid-date");
    if (!/^\d{2}:\d{2}$/.test(item.time)) errors.push("invalid-time");
    if (!item.title.trim()) errors.push("missing-title");
    if (!item.venue.trim()) errors.push("missing-venue");
    if (!item.sourceUrl.startsWith("https://doclisboa.org/filmes/")) errors.push("invalid-source-url");
    if (!item.durationMinutes || item.durationMinutes <= 0) errors.push("invalid-duration");
    if (!item.year || item.year < 1900 || item.year > 2100) errors.push("invalid-year");
    if (!item.country?.trim()) errors.push("missing-country");
    if (!item.director?.trim()) errors.push("missing-director");
    if (!item.films.length || !item.films[0].imageUrl?.trim()) errors.push("missing-image");
    return errors.length ? [{ index, title: item.title, errors }] : [];
  });

  const uniqueFilms = new Map<string, { title: string; director?: string; country?: string; year?: number; durationMinutes?: number; imageUrl?: string }>();
  for (const item of items) {
    const film = item.films[0];
    if (!uniqueFilms.has(item.sourceUrl)) uniqueFilms.set(item.sourceUrl, film);
  }

  const venueCounts = new Map<string, number>();
  for (const item of items) venueCounts.set(item.venue, (venueCounts.get(item.venue) ?? 0) + 1);

  const dateCounts = new Map<string, number>();
  for (const item of items) dateCounts.set(item.date, (dateCounts.get(item.date) ?? 0) + 1);

  console.log(JSON.stringify({
    qualityCheck: true,
    source: "doclisboa",
    screenings: items.length,
    uniqueFilmPages: uniqueFilms.size,
    duplicateExternalIds: duplicateIds.length,
    invalidRecords: invalid.length,
    missingImages: items.filter((item) => !item.films[0]?.imageUrl?.trim()).length,
    venues: Object.fromEntries([...venueCounts.entries()].sort()),
    dates: Object.fromEntries([...dateCounts.entries()].sort()),
    samples: items.slice(0, 5).map((item) => ({
      title: item.title,
      director: item.director,
      country: item.country,
      year: item.year,
      durationMinutes: item.durationMinutes,
      date: item.date,
      time: item.time,
      venue: item.venue,
      section: item.section,
      imageUrl: item.films[0]?.imageUrl,
      sourceUrl: item.sourceUrl,
      sourceExternalId: item.sourceExternalId,
    })),
    invalid: invalid.slice(0, 20),
  }, null, 2));

  if (duplicateIds.length || invalid.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
