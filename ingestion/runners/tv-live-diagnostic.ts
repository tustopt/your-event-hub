import { fetchSicProgramme, SIC_CHANNELS_URL, SIC_EPG_URL } from "../sources/sic/fetcher";
import { fetchTviProgramme, TVI_PROGRAMMES_URL } from "../sources/tvi/fetcher";
import { getLisbonDate, getLisbonOffset } from "../sources/television/time";

async function inspectJson(url: string): Promise<Record<string, unknown> & { parsed?: unknown }> {
  const response = await fetch(url);
  const text = await response.text();
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { status: response.status, contentType: response.headers.get("content-type"), bytes: text.length, preview: text.slice(0, 500) };
  }
  const summary: Record<string, unknown> = {
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes: text.length,
  };
  summary.parsed = value;
  if (Array.isArray(value)) {
    summary.shape = "array";
    summary.length = value.length;
    const first = value[0];
    if (first && typeof first === "object") {
      summary.firstKeys = Object.keys(first as Record<string, unknown>);
      summary.first = first;
    }
  } else if (value && typeof value === "object") {
    summary.shape = "object";
    summary.keys = Object.keys(value as Record<string, unknown>);
    summary.value = value;
  } else {
    summary.shape = typeof value;
  }
  return summary;
}

async function main(): Promise<void> {
  const now = new Date();
  const today = getLisbonDate(now, 0);
  const tomorrow = getLisbonDate(now, 1);
  const channelsPayload = await inspectJson(SIC_CHANNELS_URL);
  const channels = Array.isArray((channelsPayload as any).parsed)
    ? (channelsPayload as any).parsed
    : [];
  const sicEpg: Record<string, unknown>[] = [];
  for (const channel of channels.slice(0, 3)) {
    const id = String(channel?.id ?? "");
    const start = Math.floor(new Date(today + "T00:00:00" + getLisbonOffset(today, "00:00")).getTime() / 1000);
    const end = Math.floor(new Date(tomorrow + "T00:00:00" + getLisbonOffset(tomorrow, "00:00")).getTime() / 1000);
    sicEpg.push({
      channel: { id, name: channel?.name },
      response: await inspectJson(SIC_EPG_URL + "?startDate=" + start + "&endDate=" + end + "&channels=" + encodeURIComponent(id)),
    });
  }

  const tviHtmlResponse = await fetch(TVI_PROGRAMMES_URL + "?data=" + today);
  const tviHtml = await tviHtmlResponse.text();
  const tviBlocks = tviHtml.match(/<div[^>]+class=["'][^"']*guiatv-linha[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]+class=["'][^"']*guiatv-linha|$)/gi) || [];
  const candidates = tviBlocks.map((block) => ({
    time: block.match(/<div[^>]+class=["'][^"']*hora[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim(),
    title: block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim(),
  }));

  const [sic, tvi] = await Promise.all([
    fetchSicProgramme({ now: () => now }),
    fetchTviProgramme({ now: () => now }),
  ]);

  console.log(JSON.stringify({
    checkedAt: now.toISOString(),
    lisbonDates: { today, tomorrow },
    sic: { channels: channelsPayload, epg: sicEpg, parsedDocumentaries: sic },
    tvi: {
      html: { status: tviHtmlResponse.status, bytes: tviHtml.length },
      candidates,
      parsedDocumentaries: tvi,
    },
  }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
