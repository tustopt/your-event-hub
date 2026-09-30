import { fetchSicProgramme, SIC_CHANNELS_URL, SIC_EPG_URL } from "../sources/sic/fetcher";
import { fetchTviProgramme, TVI_PROGRAMMES_URL } from "../sources/tvi/fetcher";
import { getLisbonDate } from "../sources/television/time";

async function inspect(url: string): Promise<{
  status: number;
  contentType: string | null;
  bytes: number;
  jsonShape?: string;
  arrayLength?: number;
  objectKeys?: string[];
  htmlGuiatvLines?: number;
  htmlH2?: number;
  documentaryMentions?: number;
  preview: string;
}> {
  const response = await fetch(url);
  const text = await response.text();
  const result: Awaited<ReturnType<typeof inspect>> = {
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes: text.length,
    preview: text.slice(0, 500).replace(/\s+/g, " "),
  };

  try {
    const value: unknown = JSON.parse(text);
    if (Array.isArray(value)) {
      result.jsonShape = "array";
      result.arrayLength = value.length;
      const first = value[0];
      if (first && typeof first === "object") {
        result.objectKeys = Object.keys(first as Record<string, unknown>).slice(0, 30);
      }
    } else if (value && typeof value === "object") {
      result.jsonShape = "object";
      result.objectKeys = Object.keys(value as Record<string, unknown>).slice(0, 30);
    } else {
      result.jsonShape = typeof value;
    }
  } catch {
    result.htmlGuiatvLines = (text.match(/guiatv-linha/gi) || []).length;
    result.htmlH2 = (text.match(/<h2\b/gi) || []).length;
    result.documentaryMentions = (
      text.match(/document[aá]rio|documental|s[eé]rie documental|s[eé]ries documentais/gi) || []
    ).length;
  }

  return result;
}

async function main(): Promise<void> {
  const now = new Date();
  const today = getLisbonDate(now, 0);
  const tomorrow = getLisbonDate(now, 1);

  const [sicChannels, tviToday, sic, tvi] = await Promise.all([
    inspect(SIC_CHANNELS_URL),
    inspect(TVI_PROGRAMMES_URL + "?data=" + today),
    fetchSicProgramme({ now: () => now }),
    fetchTviProgramme({ now: () => now }),
  ]);

  console.log(
    JSON.stringify(
      {
        checkedAt: now.toISOString(),
        lisbonDates: { today, tomorrow },
        sic: {
          channelsEndpoint: sicChannels,
          fetchedDocumentaries: sic.length,
          channels: [...new Set(sic.map((item) => item.channel))],
          sample: sic.slice(0, 5).map((item) => ({
            title: item.title,
            channel: item.channel,
            startAt: item.startAt,
          })),
        },
        tvi: {
          todayEndpoint: tviToday,
          fetchedDocumentaries: tvi.length,
          channels: [...new Set(tvi.map((item) => item.channel))],
          sample: tvi.slice(0, 5).map((item) => ({
            title: item.title,
            channel: item.channel,
            startAt: item.startAt,
          })),
        },
        epgEndpoint: SIC_EPG_URL,
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
