import type { DoclisboaFilmItem, DoclisboaProgrammeItem } from "./types";

export const DOCLISBOA_SOURCE_KEY = "doclisboa";
export const DOCLISBOA_PROGRAMME_URL = "https://doclisboa.org/2026/programa/";
export const DOCLISBOA_EDITION_YEAR = 2026;

export interface FetchDoclisboaOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  maxSectionPages?: number;
}

const VENUE_RE = /(Culturgest|Cinema São Jorge|Cinemateca Portuguesa|Cinema Ideal)(?:\s*-\s*[^\n]+)?/i;
const SESSION_RE = /^(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s*\/\s*(\d{1,2}):(\d{2})\s*\/\s*(\d{1,4})[’']?$/i;
const MONTHS: Record<string, number> = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 };
const METADATA_RE = /^(\d{4})\s+(.+?)\s+(\d{1,4})[’']$/;

function decodeHtml(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'").replace(/&#8211;|&#x2013;/gi, "–").replace(/&#8212;|&#x2014;/gi, "—")
    .replace(/&#x2019;/gi, "’").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function htmlToLines(html: string): string[] {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<h[1-2][^>]*>/gi, "\n")
    .replace(/<h3[^>]*>/gi, "\n@@TITLE@@\n").replace(/<\/(?:p|div|li|h[1-6]|article|section|header|footer|a|button)>/gi, "\n")
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

type Session = { date: string; time: string; venue: string; duration: number };

function parseFilm(lines: string[], titleIndex: number): DoclisboaFilmItem | undefined {
  const title = lines[titleIndex + 1];
  if (!title) return undefined;

  let metadataIndex = -1;
  for (let j = titleIndex + 2; j < Math.min(lines.length, titleIndex + 12); j += 1) {
    if (METADATA_RE.test(lines[j])) {
      metadataIndex = j;
      break;
    }
  }
  if (metadataIndex < 0) return undefined;

  const meta = lines[metadataIndex].match(METADATA_RE)!;
  const candidateDirector = lines[metadataIndex - 1];
  const director =
    candidateDirector && !/^(Bilhete|Image|Estreia|Prémio)/i.test(candidateDirector)
      ? candidateDirector
      : undefined;

  const originalTitle =
    metadataIndex - 2 > titleIndex + 1 &&
    candidateDirector !== lines[metadataIndex - 2] &&
    !/^\d{4}\s/.test(lines[metadataIndex - 2])
      ? lines[metadataIndex - 2]
      : undefined;

  return {
    title,
    originalTitle,
    director,
    year: Number(meta[1]),
    country: meta[2],
    durationMinutes: Number(meta[3]),
  };
}

function parseSectionPage(html: string, sourceUrl: string): DoclisboaProgrammeItem[] {
  const lines = htmlToLines(html);
  const sectionMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const section = sectionMatch ? decodeHtml(sectionMatch[1]) : undefined;
  const items: DoclisboaProgrammeItem[] = [];
  const pendingSessions: Session[] = [];
  let activeSessions: Session[] = [];
  let activeFilms: DoclisboaFilmItem[] = [];

  const flush = () => {
    if (!activeFilms.length || !activeSessions.length) return;
    for (const session of activeSessions) {
      const firstFilm = activeFilms[0];
      const sourceExternalId = `${session.date}-${session.time.replace(":", "")}-${slug(session.venue)}-${slug(firstFilm.title)}`;
      items.push({
        sourceExternalId,
        sourceUrl,
        editionYear: DOCLISBOA_EDITION_YEAR,
        date: session.date,
        time: session.time,
        title: firstFilm.title,
        films: [...activeFilms],
        section,
        venue: session.venue,
        venueType: /cinemateca|cinema/i.test(session.venue) ? "cinema" : "cultural_center",
        durationMinutes: session.duration,
        director: firstFilm.director,
        country: firstFilm.country,
        year: firstFilm.year,
        synopsis: firstFilm.synopsis,
      });
    }
    activeSessions = [];
    activeFilms = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const session = lines[i].match(SESSION_RE);
    if (session) {
      flush();
      const month = MONTHS[session[2].toLowerCase()];
      if (!month) continue;
      let venue: string | undefined;
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j += 1) {
        if (VENUE_RE.test(lines[j])) {
          venue = lines[j];
          break;
        }
      }
      if (!venue) continue;
      pendingSessions.push({
        date: `${DOCLISBOA_EDITION_YEAR}-${String(month).padStart(2, "0")}-${String(Number(session[1])).padStart(2, "0")}`,
        time: `${String(Number(session[3])).padStart(2, "0")}:${session[4]}`,
        venue,
        duration: Number(session[5]),
      });
      continue;
    }

    if (lines[i] !== "@@TITLE@@") continue;
    const film = parseFilm(lines, i);
    if (!film) continue;

    if (!activeFilms.length && pendingSessions.length) {
      activeSessions = pendingSessions.splice(0);
    }
    if (activeSessions.length) activeFilms.push(film);
  }

  flush();
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
  const results = await Promise.all(sectionUrls.map(async (sectionUrl) => parseSectionPage(await fetchText(fetchImpl, sectionUrl), sectionUrl)));
  const seen = new Set<string>();
  return results.flat().filter((item) => {
    if (seen.has(item.sourceExternalId)) return false;
    seen.add(item.sourceExternalId);
    return true;
  });
}
