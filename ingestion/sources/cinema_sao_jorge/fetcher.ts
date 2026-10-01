import type { CinemaSaoJorgeProgrammeItem } from "./types";

export const DEFAULT_SOURCE_KEY = "cinema_sao_jorge";
export const DEFAULT_SOURCE_URL = "https://cinemasaojorge.pt/programacao/0/";

export interface FetchCinemaSaoJorgeOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, ""));
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const DATE_TIME_RE = /(?:segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo),?\s+(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de\s+(\d{4}))?\s+(?:às\s+)?(\d{1,2}):(\d{2})/i;
const FALLBACK_DATE_TIME_RE = /(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de\s+(\d{4}))?.{0,120}?(\d{1,2}):(\d{2})/i;

function parseDateTime(text: string, fallbackYear: number): { date: string; time: string } | undefined {
  const match = text.match(DATE_TIME_RE) ?? text.match(FALLBACK_DATE_TIME_RE);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = MONTHS[slug(match[2])];
  const year = Number(match[3] ?? fallbackYear);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (!month || !day || !year || hour > 23 || minute > 59) return undefined;
  return { date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function parseDuration(text: string): number | undefined {
  const match = text.match(/(\d{2,3})['’]?\s*(?:minutos?|min\.?)/i);
  return match ? Number(match[1]) : undefined;
}

/** Extracts sessions by parsing each heading's own programme block. */
export async function fetchCinemaSaoJorgeProgramme(
  options: FetchCinemaSaoJorgeOptions = {},
): Promise<readonly CinemaSaoJorgeProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sourceUrl = options.url ?? DEFAULT_SOURCE_URL;
  const response = await fetchImpl(sourceUrl);
  if (!response.ok) throw new Error(`Cinema São Jorge fetch failed: ${response.status}`);

  const html = await response.text();
  const fallbackYear = options.now?.().getFullYear() ?? new Date().getFullYear();
  const items: CinemaSaoJorgeProgrammeItem[] = [];
  const seen = new Set<string>();
  const headingRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  const headings = [...html.matchAll(headingRe)];

  for (let index = 0; index < headings.length; index += 1) {
    const title = decodeHtml(headings[index][1]);
    if (!title || /^(queer lisboa 2026|motelx 2026)$/i.test(title)) continue;

    const blockStart = headings[index].index! + headings[index][0].length;
    const nextHeadingStart = headings[index + 1]?.index ?? html.length;
    const context = stripTags(html.slice(blockStart, nextHeadingStart));
    const dateTime = parseDateTime(context, fallbackYear);
    if (!dateTime) continue;

    const durationMinutes = parseDuration(context);
    const externalId = `${dateTime.date}-${dateTime.time.replace(":", "")}-${slug(title)}`;
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    items.push({
      sourceExternalId: externalId,
      sourceUrl,
      date: dateTime.date,
      time: dateTime.time,
      title,
      festival: context.match(/(?:FESTA DO CINEMA FRANCÊS|QUEER LISBOA|MOTELX)\s+\d{4}/i)?.[0],
      durationMinutes,
    });
  }

  return items;
}
