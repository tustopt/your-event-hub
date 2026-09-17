import type { DoclisboaProgrammeItem } from "./types";

export const DOCLISBOA_SOURCE_KEY = "doclisboa";
export const DOCLISBOA_PROGRAMME_URL = "https://doclisboa.org/filmes/";

export interface FetchDoclisboaOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  maxFilmPages?: number;
}

const VENUE_RE = /(Culturgest|Cinema São Jorge|Cinemateca Portuguesa|Cinema Ideal)(?:\s*-\s*[^\n]+)?/i;

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#8211;|&#x2013;/gi, "–")
    .replace(/&#8212;|&#x2014;/gi, "—")
    .replace(/&#x2019;/gi, "’")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToLines(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|article|section|header|footer|a|button)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n+/)
    .map(decodeHtml)
    .filter(Boolean);
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function extractFilmUrls(indexHtml: string, indexUrl: string): string[] {
  const urls = new Set<string>();
  const re = /href\s*=\s*["']([^"']*\/filmes\/[^"'#?]+\/?)["']/gi;
  for (const match of indexHtml.matchAll(re)) {
    const href = match[1];
    try {
      const url = new URL(href, indexUrl).toString().replace(/\/$/, "") + "/";
      if (/\/filmes\/(?!$)/i.test(new URL(url).pathname)) urls.add(url);
    } catch {
      // Ignore malformed links.
    }
  }
  return [...urls];
}

function parseFilmPage(html: string, sourceUrl: string): DoclisboaProgrammeItem[] {
  const lines = htmlToLines(html);
  if (!lines.length) return [];

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? decodeHtml(titleMatch[1]) : lines[0];
  if (!title || /^(filmes|doclisboa)$/i.test(title)) return [];

  const titleIndex = Math.max(0, lines.findIndex((line) => line === title));
  const metadataIndex = lines.findIndex((line, index) => index > titleIndex && /^\d{4}\s+.+\s+\d{1,4}[’']$/.test(line));
  const metadata = metadataIndex >= 0 ? lines[metadataIndex] : "";
  const metadataMatch = metadata.match(/^(\d{4})\s+(.+?)\s+(\d{1,4})[’']$/);
  const year = metadataMatch ? Number(metadataMatch[1]) : undefined;
  const country = metadataMatch ? metadataMatch[2] : undefined;
  const durationMinutes = metadataMatch ? Number(metadataMatch[3]) : undefined;

  let director: string | undefined;
  for (let i = titleIndex + 1; i < Math.min(lines.length, titleIndex + 5); i += 1) {
    const candidate = lines[i];
    if (candidate !== title && !/^\d{4}\s+/.test(candidate) && !/^(image|sessões|bilhete)$/i.test(candidate)) {
      director = candidate;
      break;
    }
  }

  let defaultSection: string | undefined;
  const breadcrumb = lines.find((line) => /\bDoclisboa\b\s*\|/i.test(line) && line.includes(title));
  if (breadcrumb) {
    const parts = breadcrumb.split("|").map((part) => part.trim()).filter(Boolean);
    defaultSection = parts.length >= 3 ? parts[parts.length - 2] : undefined;
  }

  const items: DoclisboaProgrammeItem[] = [];
  let currentSection = defaultSection;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const sectionCandidate = line.replace(/\s+/g, " ").trim();
    if (
      sectionCandidate &&
      /^(Competição Internacional|Competição Portuguesa|Riscos|Da Terra à Lua|Heart Beat|Verdes Anos|Doc Alliance|Sessão de Abertura|Sessão de Encerramento|Retrospectiva .+)$/i.test(sectionCandidate)
    ) {
      currentSection = sectionCandidate;
      continue;
    }

    const session = line.match(/^(\d{1,2})\.(\d{1,2})\s*\/\s*(\d{1,2}):(\d{2})(?:\s*\/\s*(\d{1,4})[’'])?$/);
    if (!session) continue;

    const day = Number(session[1]);
    const month = Number(session[2]);
    const hour = Number(session[3]);
    const minute = Number(session[4]);
    const sessionDuration = session[5] ? Number(session[5]) : durationMinutes;
    const date = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    let venue: string | undefined;
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j += 1) {
      if (/^(Bilhete|Add to Calendar|Image)$/i.test(lines[j])) continue;
      if (VENUE_RE.test(lines[j])) {
        venue = lines[j];
        break;
      }
    }
    if (!venue) continue;

    items.push({
      sourceExternalId: `${date}-${time.replace(":", "")}-${slug(venue)}-${slug(title)}`,
      sourceUrl,
      editionYear: 2026,
      date,
      time,
      title,
      section: currentSection,
      venue,
      venueType: /cinemateca|cinema/i.test(venue) ? "cinema" : "cultural_center",
      durationMinutes: sessionDuration,
      director,
      country,
      year,
    });
  }

  return items;
}

async function fetchText(fetchImpl: typeof fetch, url: string): Promise<string> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Doclisboa fetch failed: ${response.status} (${url})`);
  return response.text();
}

/**
 * Discovers the current 2026 film pages from Doclisboa's public /filmes/
 * index and reads each film page's published screening schedule.
 *
 * This matches the site's current information architecture: the index lists
 * films, while each film page publishes its sessions.
 */
export async function fetchDoclisboaProgramme(
  options: FetchDoclisboaOptions = {},
): Promise<readonly DoclisboaProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sourceUrl = options.url ?? DOCLISBOA_PROGRAMME_URL;
  const indexHtml = await fetchText(fetchImpl, sourceUrl);
  const filmUrls = extractFilmUrls(indexHtml, sourceUrl).slice(0, options.maxFilmPages ?? 300);

  const results = await Promise.all(filmUrls.map(async (filmUrl) => {
    try {
      return parseFilmPage(await fetchText(fetchImpl, filmUrl), filmUrl);
    } catch {
      return [];
    }
  }));

  const seen = new Set<string>();
  return results.flat().filter((item) => {
    if (seen.has(item.sourceExternalId)) return false;
    seen.add(item.sourceExternalId);
    return true;
  });
}
