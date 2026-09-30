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
  preview: string;
  text?: string;
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
    // HTML details are extracted below in main.
  }
  return result;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("HTTP " + response.status + ": " + url);
  return response.text();
}

async function main(): Promise<void> {
  const now = new Date();
  const today = getLisbonDate(now, 0);
  const tomorrow = getLisbonDate(now, 1);

  const sicChannelsResponse = await fetch(SIC_CHANNELS_URL);
  const sicChannelsPayload: unknown = await sicChannelsResponse.json();
  const sicChannels = Array.isArray(sicChannelsPayload)
    ? sicChannelsPayload.map((item) =>
        item && typeof item === "object"
          ? {
              id: String((item as Record<string, unknown>).id ?? ""),
              name: String((item as Record<string, unknown>).name ?? ""),
            }
          : null,
      )
    : [];

  const tviHtml = await fetchText(TVI_PROGRAMMES_URL + "?data=" + today);
  const tviBlocks = tviHtml.match(
    /<div[^>]+class=["'][^"']*guiatv-linha[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]+class=["'][^"']*guiatv-linha|$)/gi,
  ) || [];
  const tviCandidates = tviBlocks.slice(0, 8).map((block) => ({
    time: block.match(/<div[^>]+class=["'][^"']*hora[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim(),
    h2: block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim(),
  }));

  const [sic, tvi] = await Promise.all([
    fetchSicProgramme({ now: () => now }),
    fetchTviProgramme({ now: () => now }),
  ]);

  console.log(JSON.stringify({
    checkedAt: now.toISOString(),
    lisbonDates: { today, tomorrow },
    sic: {
      channelsEndpoint: {
        status: sicChannelsResponse.status,
        count: sicChannels.length,
        channels: sicChannels,
      },
      fetchedDocumentaries: sic.length,
      channels: [...new Set(sic.map((item) => item.channel))],
      sample: sic.slice(0, 5),
    },
    tvi: {
      endpoint: {
        status: 200,
        bytes: tviHtml.length,
        guiAtvLines: (tviHtml.match(/guiatv-linha/gi) || []).length,
        h2Count: (tviHtml.match(/<h2\\b/gi) || []).length,
        documentaryMentions: (tviHtml.match(/document[aá]rio|documental|s[eé]rie documental|s[eé]ries documentais/gi) || []).length,
      },
      candidates: tviCandidates,
      fetchedDocumentaries: tvi.length,
      sample: tvi.slice(0, 5),
    },
    epgEndpoint: SIC_EPG_URL,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
