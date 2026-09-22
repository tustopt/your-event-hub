import {
  extractRtpProgrammeClassificationUrlFromHtml,
  fetchRtpEpgProgrammeItems,
  isRtpDocumentaryPage,
} from "../sources/rtp/fetcher";

async function main(): Promise<void> {
  const items = await fetchRtpEpgProgrammeItems({ now: () => new Date() });
  const targets = items.filter((item) => /repovoadores|mesa portuguesa|teia|guerra a[eé]rea|mao/i.test(item.title));

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
      sourceUrl: item.sourceUrl,
      programmeStatus: response.status,
      editorialUrl,
      editorialStatus: classificationResponse?.status,
      playIsDocumentary: isRtpDocumentaryPage(html),
      editorialIsDocumentary: isRtpDocumentaryPage(classificationHtml),
      hasTodosDocumentarios: /todos[^<]{0,30}documentarios/i.test(html),
      hasEsteConteudo: /este conte[^<]{0,80}documentarios/i.test(html),
    });
  }

  console.log(JSON.stringify({
    epgCount: items.length,
    targets: checks,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
