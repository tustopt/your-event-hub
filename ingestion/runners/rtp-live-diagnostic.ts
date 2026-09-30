import { fetchRtpEpgProgrammeItems, isRtpDocumentaryPage } from "../sources/rtp/fetcher";

async function main(): Promise<void> {
  const now = new Date();
  const items = await fetchRtpEpgProgrammeItems({
    now: () => now,
    daysBack: 0,
    daysAhead: 1,
  });

  const directFeedChecks = [];
  for (let service = 4; service <= 8; service += 1) {
    const date = now.toISOString().slice(0, 10);
    const url =
      "https://www.rtp.pt/EPG/json/rtp-channels-page/list-grid/tv/" + service + "/" + date;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DocuEvents/1.0; +https://www.rtp.pt/)" },
      signal: AbortSignal.timeout(15000),
    });
    const payload = response.ok
      ? ((await response.json()) as { result?: Record<string, unknown[]> })
      : undefined;
    const matchingEntries = payload?.result
      ? Object.values(payload.result)
          .flat()
          .filter((entry: unknown) =>
            /chamada de emergência/i.test(String((entry as { name?: unknown })?.name || "")),
          )
      : [];
    directFeedChecks.push({
      service,
      status: response.status,
      entries: payload?.result ? Object.values(payload.result).flat().length : 0,
      matchingEntries,
    });
  }

  const editorialUrl = "https://www.rtp.pt/programa/tv/p49117";
  const editorialResponse = await fetch(editorialUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DocuEvents/1.0; +https://www.rtp.pt/)" },
    signal: AbortSignal.timeout(15000),
  });
  const editorialHtml = editorialResponse.ok ? await editorialResponse.text() : "";
  const plainText = editorialHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedText = plainText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const genreIndex = normalizedText.indexOf("generos");
  const documentaryIndex = normalizedText.indexOf("documentarios");

  console.log(
    JSON.stringify(
      {
        now: now.toISOString(),
        epgCount: items.length,
        directFeedChecks,
        knownEditorial: {
          url: editorialUrl,
          status: editorialResponse.status,
          isDocumentary: isRtpDocumentaryPage(editorialHtml),
          htmlLength: editorialHtml.length,
          genreContext: genreIndex >= 0 ? plainText.slice(genreIndex, genreIndex + 500) : "",
          documentaryContext:
            documentaryIndex >= 0
              ? plainText.slice(Math.max(0, documentaryIndex - 250), documentaryIndex + 500)
              : "",
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
