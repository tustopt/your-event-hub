import type { DoclisboaProgrammeItem } from "./types";

export const DOCLISBOA_SOURCE_KEY = "doclisboa";
export const DOCLISBOA_PROGRAMME_URL = "https://doclisboa.org/seccoes/";
export const DOCLISBOA_EDITION_YEAR = 2026;

export interface FetchDoclisboaOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  maxSectionPages?: number;
}

const VENUE_RE = /(Culturgest|Cinema São Jorge|Cinemateca Portuguesa|Cinema Ideal)(?:\s*-\s*[^\n]+)?/i;
const SESSION_RE = /^(\d{1,2})\.(\d{1,2})\s*\/\s*(\d{1,2}):(\d{2})(?:\s*\/\s*(\d{1,4})[’'])?$/;

function decodeHtml(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'").replace(/&#8211;|&#x2013;/gi, "–").replace(/&#8212;|&#x2014;/gi, "—")
    .replace(/&#x2019;/gi, "’").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function htmlToLines(html: string): string[] {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|article|section|header|footer|a|button)>/gi, "\n")
    .replace(/<[^>]+>/g, " ").split(/\r?\n+/).map(decodeHtml).filter(Boolean);
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractSectionUrls(indexHtml: string, indexUrl: string): string[] {
  const urls = new Set<string>();
  const re = /href\s*=\s*["']([^"']*\/seccoes\/[^"'#?]+\/?)["']/gi;
  for (const match of indexHtml.matchAll(re)) {
    try {
      const url = new URL(match[1], indexUrl).toString().replace(/\/$/, "") + "/";
      if (/\/seccoes\/(?!$)/i.test(new URL(url).pathname)) urls.add(url);
    } catch {}
  }
  return [...urls];
}

function parseSectionPage(html: string, sourceUrl: string): DoclisboaProgrammeItem[] {
  const lines = htmlToLines(html);
  if (!lines.length) return [];

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const section = titleMatch ? decodeHtml(titleMatch[1]) : undefined;
  const items: DoclisboaProgrammeItem[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const session = lines[i].match(SESSION_RE);
    if (!session) continue;

    const day = Number(session[1]);
    const month = Number(session[2]);
    const hour = Number(session[3]);
    const minute = Number(session[4]);
    const duration = session[5] ? Number(session[5]) : undefined;
    const date = `${DOCLISBOA_EDITION_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    let venue: string | undefined;
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j += 1) {
      if (VENUE_RE.test(lines[j])) {
        venue = lines[j];
        break;
      }
    }
    if (!venue) continue;

    let title: string | undefined;
    for (let j = i - 1; j >= Math.max(0, i - 8); j -= 1) {
      const candidate = lines[j];
      if (!SESSION_RE.test(candidate) && !VENUE_RE.test(candidate) && !/^(Bilhete|Add to Calendar|Image)$/i.test(candidate)) {
        title = candidate;
        break;
      }
    }
    if (!title) continue;

    items.push({
      sourceExternalId: `${date}-${time.replace(":", "")}-${slug(venue)}-${slug(title)}`,
      sourceUrl,
      editionYear: DOCLISBOA_EDITION_YEAR,
      date,
      time,
      title,
      section,
      venue,
      venueType: /cinemateca|cinema/i.test(venue) ? "cinema" : "cultural_center",
      durationMinutes: duration,
    });
  }

  return items;
}

async function fetchText(fetchImpl: typeof fetch, url: string): Promise<string> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Doclisboa fetch failed: ${response.status} (${url})`);
  return response.text();
}

export async function fetchDoclisboaProgramme(options: FetchDoclisboaOptions = {}): Promise<readonly DoclisboaProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sourceUrl = options.url ?? DOCLISBOA_PROGRAMME_URL;
  const indexHtml = await fetchText(fetchImpl, sourceUrl);
  const sectionUrls = extractSectionUrls(indexHtml, sourceUrl).slice(0, options.maxSectionPages ?? 100);

  const results = await Promise.all(
    sectionUrls.map(async (sectionUrl) => parseSectionPage(await fetchText(fetchImpl, sectionUrl), sectionUrl)),
  );

  const seen = new Set<string>();
  return results.flat().filter((item) => {
    if (seen.has(item.sourceExternalId)) return false;
    seen.add(item.sourceExternalId);
    return true;
  });
}
