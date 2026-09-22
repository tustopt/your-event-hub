async function main(): Promise<void> {
  const now = new Date();
  const days = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + index);
    return date;
  });

  const results = [];
  for (const date of days) {
    const programmes = await import("../sources/rtp/fetcher").then(({ fetchRtpProgramme }) =>
      fetchRtpProgramme({ now: () => date, limit: 10 }),
    );
    results.push({
      date: date.toISOString().slice(0, 10),
      documentaryCount: programmes.length,
      documentaries: programmes.map((item) => ({
        channel: item.channel,
        title: item.title,
        startAt: item.startAt,
        sourceUrl: item.sourceUrl,
        imageUrl: item.imageUrl,
      })),
    });
  }

  console.log(JSON.stringify({ results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
