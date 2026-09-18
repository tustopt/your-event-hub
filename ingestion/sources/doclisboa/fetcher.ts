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
const SESSION_RE = /^(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s*\/\s*(\d{1,2}):(\d{2})\s*\/\s*(\d{1,4})[’']?$/i;
const MONTHS: Record<string, number> = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 };

function decodeHtml(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'").replace(/&#8211;|&#x2013;/gi, "–").replace(/&#8212;|&#x2014;/gi, "—")
    .replace(/&#x2019;/gi, "’").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function htmlToLines(html: string): string[] {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h[1-2][^>]*>/gi, "\n")
    .replace(/<h3[^>]*>/gi, "\n@@TITLE@@\n")
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
  const sectionMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const section = sectionMatch ? decodeHtml(sectionMatch[1]) : undefined;
  const items: DoclisboaProgrammeItem[] = [];
  let currentTitle: string | undefined;
  let currentDirector: string | undefined;
  let currentYear: number | undefined;
  let currentCountry: string | undefined;
  let currentDuration: number | undefined;
  const pending: Array<{ date:string; time:string; venue:string; duration:number }> = [];

  const emit = (session: {date:string; time:string; venue:string; duration:number}, title:string, director?:string, year?:number, country?:string, duration?:number) => {
    items.push({
      sourceExternalId: `${session.date}-${session.time.replace(":", "")}-${slug(session.venue)}-${slug(title)}`,
      sourceUrl, editionYear: DOCLISBOA_EDITION_YEAR, date: session.date, time: session.time, title, section,
      venue: session.venue, venueType: /cinemateca|cinema/i.test(session.venue) ? "cinema" : "cultural_center",
      durationMinutes: session.duration || duration, director, country, year,
    });
  };

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === "@@TITLE@@") {
      const title = lines[i + 1];
      if (!title) continue;
      currentTitle = title;
      currentDirector = undefined;
      currentYear = undefined;
      currentCountry = undefined;
      currentDuration = undefined;
      for (let j = i + 2; j < Math.min(lines.length, i + 6); j += 1) {
        const candidate = lines[j];
        const meta = candidate.match(/^(\d{4})\s+(.+?)\s+(\d{1,4})[’']$/);
        if (meta) { currentYear = Number(meta[1]); currentCountry = meta[2]; currentDuration = Number(meta[3]); continue; }
        if (!currentDirector && candidate && !/^(Bilhete|Image|Estreia|Prémio)/i.test(candidate)) currentDirector = candidate;
      }
      while (pending.length) emit(pending.shift()!, currentTitle, currentDirector, currentYear, currentCountry, currentDuration);
      i += 1;
      continue;
    }

    const session = lines[i].match(SESSION_RE);
    if (!session) continue;
    const month = MONTHS[session[2].toLowerCase()];
    if (!month) continue;
    const date = `${DOCLISBOA_EDITION_YEAR}-${String(month).padStart(2, "0")}-${String(Number(session[1])).padStart(2, "0")}`;
    const time = `${String(Number(session[3])).padStart(2, "0")}:${session[4]}`;
    let venue: string | undefined;
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
      if (VENUE_RE.test(lines[j])) { venue = lines[j]; break; }
    }
    if (!venue) continue;
    const entry = { date, time, venue, duration: Number(session[5]) };
    if (currentTitle) emit(entry, currentTitle, currentDirector, currentYear, currentCountry, currentDuration);
    else pending.push(entry);
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
  const results = await Promise.all(sectionUrls.map((sectionUrl) => fetchText(fetchImpl, sectionUrl).then((html) => parseSectionPage(html, sectionUrl))));
  const seen = new Set<string>();
  return results.flat().filter((item) => {
    if (seen.has(item.sourceExternalId)) return false;
    seen.add(item.sourceExternalId);
    return true;
  });
}
