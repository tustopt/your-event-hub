import type { SourceFetcherOptions } from "../../core/source-fetchers";
import type { TviProgrammeItem } from "./types";

export const TVI_SOURCE_KEY = "tvi";
export const TVI_PROGRAMMES_URL = "https://tvi.iol.pt/emissao/dia/tvi";

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function isTviDocumentaryText(text: string): boolean | undefined {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/documentario|documental|serie documental|series documentais/.test(normalized)) return true;
  if (/novela|reality|entretenimento|telejornal|jornal|desporto|futebol|televendas/.test(normalized)) return false;
  return undefined;
}

function absoluteUrl(value: string, baseUrl: string): string {
  try { return new URL(value, baseUrl).toString(); } catch { return value; }
}

export function parseTviScheduleHtml(
  html: string,
  date: string,
  channel = "TVI",
  baseUrl = TVI_PROGRAMMES_URL,
): TviProgrammeItem[] {
  const blocks = html.match(/<div[^>]+class=["\'][^"\']*guiatv-linha[^"\']*["\'][^>]*>[\\s\\S]*?(?=<div[^>]+class=["\'][^"\']*guiatv-linha|<\\/body>|$)/gi) || [];
  const items: TviProgrammeItem[] = [];

  for (const block of blocks) {
    const timeMatch = block.match(/<div[^>]+class=["'][^"']*hora[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!timeMatch || !titleMatch) continue;

    const time = timeMatch[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
    const title = titleMatch[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
    const hhmm = time.match(/\b(\d{1,2}):(\d{2})\b/);
    if (!hhmm || !title) continue;

    const descriptionMatch = block.match(/<div[^>]+class=["'][^"']*texto[^"']*texto2[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const description = descriptionMatch?.[1]
      .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();

    const hrefMatch = block.match(/<a[^>]+href=["']([^"']+)["']/i);
    const sourceUrl = hrefMatch ? absoluteUrl(hrefMatch[1], baseUrl) : baseUrl;
    const signal = isTviDocumentaryText([title, description || ""].join(" "));
    if (signal !== true) continue;

    const startAt = date + "T" + String(Number(hhmm[1])).padStart(2, "0") + ":" + hhmm[2] + ":00+01:00";
    items.push({
      sourceExternalId: "tvi-" + date + "-" + hhmm[1] + hhmm[2] + "-" + slug(title) + "-" + slug(channel),
      sourceUrl,
      broadcasterKey: "tvi",
      channel,
      title,
      ...(description ? { description } : {}),
      genre: "Documentários",
      startAt,
    });
  }

  return items;
}

export async function fetchTviProgramme(options: SourceFetcherOptions = {}): Promise<readonly TviProgrammeItem[]> {
  const fetchImpl = options.fetchImpl || fetch;
  const baseUrl = options.url && options.url !== "https://tvi.iol.pt/"
    ? options.url.replace(/\/$/, "")
    : TVI_PROGRAMMES_URL;
  const now = options.now ? options.now() : new Date();
  const all: TviProgrammeItem[] = [];

  for (let offset = 0; offset <= 1; offset += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const dateValue = date.toISOString().slice(0, 10);
    const url = baseUrl.includes("?") ? baseUrl + "&data=" + dateValue : baseUrl + "?data=" + dateValue;
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error("TVI schedule fetch failed: " + response.status + " (" + url + ")");
    all.push(...parseTviScheduleHtml(await response.text(), dateValue, "TVI", url));
  }

  return all;
}
