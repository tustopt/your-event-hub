import { fetchSicProgramme, SIC_CHANNELS_URL, SIC_EPG_URL } from "../sources/sic/fetcher";
import { fetchTviProgramme, TVI_PROGRAMMES_URL } from "../sources/tvi/fetcher";
import { getLisbonDate } from "../sources/television/time";

async function inspectResponse(url: string): Promise<{
  status: number;
  contentType: string | null;
  bytes: number;
  preview: string;
}> {
  const response = await fetch(url);
  const text = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes: text.length,
    preview: text.slice(0, 500).replace(/\s+/g, " "),
  };
}

async function main(): Promise<void> {
  const now = new Date();
  const today = getLisbonDate(now, 0);
  const tomorrow = getLisbonDate(now, 1);

  const [sicEndpoint, tviEndpoint, sic, tvi] = await Promise.all([
    inspectResponse(SIC_CHANNELS_URL),
    inspectResponse(TVI_PROGRAMMES_URL + "?data=" + today),
    fetchSicProgramme({ now: () => now }),
    fetchTviProgramme({ now: () => now }),
  ]);

  console.log(
    JSON.stringify(
      {
        checkedAt: now.toISOString(),
        lisbonDates: { today, tomorrow },
        sic: {
          endpoint: sicEndpoint,
          fetchedDocumentaries: sic.length,
          channels: [...new Set(sic.map((item) => item.channel))],
          sample: sic.slice(0, 5).map((item) => ({
            title: item.title,
            channel: item.channel,
            startAt: item.startAt,
          })),
        },
        tvi: {
          endpoint: tviEndpoint,
          fetchedDocumentaries: tvi.length,
          channels: [...new Set(tvi.map((item) => item.channel))],
          sample: tvi.slice(0, 5).map((item) => ({
            title: item.title,
            channel: item.channel,
            startAt: item.startAt,
          })),
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
