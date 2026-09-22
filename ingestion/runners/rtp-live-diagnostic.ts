import {
  extractRtpProgrammeClassificationUrlFromHtml,
  fetchRtpEpgProgrammeItems,
  isRtpDocumentaryPage,
} from "../sources/rtp/fetcher";

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
    const url = "https://www.rtp.pt/EPG/json/rtp-channels-page/list-grid/tv/" + service + "/" + date;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DocuEvents/1.0; +https://www.rtp.pt/)" },
      });
      const payload = response.ok ? await response.json() as { result?: Record<string, unknown[]> } : undefined;
      directFeedChecks.push({
        service,
        url,
        status: response.status,
        groups: payload?.result ? Object.keys(payload.result).length : 0,
        entries: payload?.result ? Object.values(payload.result).flat().length : 0,
      });
    } catch (error) {
      directFeedChecks.push({ service, url, error: String(error) });
    }
  }

  const targets = items.filter((item) =>
    /repovoadores|mesa portuguesa|teia|guerra a[eé]rea|chamada de emergência|rtp sempre/i.test(item.title),
  );

  const checks = [];
  for (const item of targets) {
    const response = await fetch(item.sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DocuEvents/1.0; +https://www.rtp.pt/)" },
    });
    const html = response.ok ? await response.text() : "";
    const editorialUrl = response.ok
      ? extractRtpProgrammeClassificationUrlFromHtml(html, item.sourceUrl)
      : undefined;
    const classificationResponse = editorialUrl
      ? await fetch(editorialUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; DocuEvents/1.0; +https://www.rtp.pt/)" },
        })
      : undefined;
    const classificationHtml = classificationResponse?.ok ? await classificationResponse.text() : "";

    checks.push({
      title: item.title,
      channel: item.channel,
      startAt: item.startAt,
      sourceUrl: item.sourceUrl,
      programmeStatus: response.status,
      editorialUrl,
      editorialStatus: classificationResponse?.status,
      playIsDocumentary: isRtpDocumentaryPage(html),
      editorialIsDocumentary: isRtpDocumentaryPage(classificationHtml),
    });
  }

  console.log(JSON.stringify({
    now: now.toISOString(),
    epgCount: items.length,
    directFeedChecks,
    targets: checks,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
