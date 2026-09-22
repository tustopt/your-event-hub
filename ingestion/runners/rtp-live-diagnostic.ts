import {
  extractRtpProgrammeImageUrl,
  getRtpProgrammeClassificationUrl,
  isRtpDocumentaryPage,
  fetchRtpEpgProgrammeItems,
} from "../sources/rtp/fetcher";

async function main(): Promise<void> {
  const items = await fetchRtpEpgProgrammeItems({
    now: () => new Date(),
  });

  const channelCounts = new Map<string, number>();
  for (const item of items) {
    channelCounts.set(item.channel, (channelCounts.get(item.channel) ?? 0) + 1);
  }

  const sample = items;
  let documentaryCount = 0;
  let checked = 0;
  let classified = 0;
  let imageCount = 0;

  for (const item of sample) {
    const response = await fetch(item.sourceUrl);
    if (!response.ok) continue;
    const html = await response.text();
    checked++;

    let classificationHtml = html;
    if (!isRtpDocumentaryPage(classificationHtml)) {
      const classificationUrl = getRtpProgrammeClassificationUrl(item.sourceUrl);
      if (!classificationUrl) continue;
      const classificationResponse = await fetch(classificationUrl);
      if (!classificationResponse.ok) continue;
      classificationHtml = await classificationResponse.text();
    }

    classified++;
    if (isRtpDocumentaryPage(classificationHtml)) documentaryCount++;
    if (extractRtpProgrammeImageUrl(html, item.sourceUrl)) imageCount++;
  }

  console.log(JSON.stringify({
    epgItems: items.length,
    channels: Object.fromEntries(channelCounts),
    checkedProgrammePages: checked,
    classifiedPages: classified,
    documentaryPagesInSample: documentaryCount,
    imagesInSample: imageCount,
    sample: sample.map((item) => ({
      channel: item.channel,
      title: item.title,
      startAt: item.startAt,
      sourceUrl: item.sourceUrl,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
