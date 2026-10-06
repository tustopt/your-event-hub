import { extractSourceImageUrl } from "../../core/image-resolver";
import type { DoclisboaFilmItem, DoclisboaProgrammeItem } from "./types";

export const DOCLISBOA_SOURCE_KEY = "doclisboa";
export const DOCLISBOA_FILMS_URL = "https://doclisboa.org/filmes/";
export const DOCLISBOA_EDITION_YEAR = 2026;

export interface FetchDoclisboaOptions {
  url?: string;
  fetchImpl?: typeof fetch;
}

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

const SECTION_NAMES = [
  "Competição Internacional",
  "Competição Portuguesa",
  "Riscos",
  "Heart Beat",
  "Da Terra à Lua",
  "Verdes Anos",
  "Na Companhia de William Greaves",
  "Sessão de Abertura",
  "Sessão de Encerramento",
];

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#8217;|&rsquo;/gi, "’")
    .replace(/&#8216;|&lsquo;/gi, "‘")
    .replace(/&#8211;|&ndash;/gi, "–")
    .replace(/&#8212;|&mdash;/gi, "—")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function textContent(value: string): string {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(?:p|div|li|ul|ol|section|article|main|header|footer|h[1-6]|button)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function absoluteUrl(value: string, baseUrl: string): string {
  return new URL(decodeHtml(value), baseUrl).toString();
}

function extractFilmLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const hrefRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(hrefRe)) {
    const href = match[1];
    try {
      const url = new URL(href, baseUrl);
      if (
        url.hostname === "doclisboa.org" &&
        /^\/filmes\/[^/]+\/?$/i.test(url.pathname) &&
        !/^\/filmes\/movie\.link\/?$/i.test(url.pathname)
      ) {
        links.add(url.toString().replace(/\/$/, "/"));
      }
    } catch {
      // Ignore malformed links.
    }
  }

  return [...links];
}

function parseFilmPage(html: string, sourceUrl: string): {
  film: DoclisboaFilmItem;
  section?: string;
  sessions: Array<{ date: string; time: string; venue: string; durationMinutes?: number }>;
} | undefined {
  const body = textContent(html);
  const lines = body.split("\n").map((line) => line.trim()).filter(Boolean);

  // The live Doclisboa template has used different heading levels for film
  // titles. Locate the metadata first, then derive the title from the heading
  // immediately preceding the film metadata.
  const metadataIndex = lines.findIndex((line) =>
    /^(?:19|20)\d{2}\s+.+?\s+\d{1,4}[’']$/.test(line),
  );
  if (metadataIndex < 0) return undefined;

  const metadataHtmlIndex = html.search(/<p\b[^>]*>\s*\d{4}\s+[^<]+\s+\d{1,4}[’']\s*<\/p>/i);
  const headingSource = metadataHtmlIndex >= 0 ? html.slice(0, metadataHtmlIndex) : html;
  const headingTexts = [...headingSource.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
    .map((match) => textContent(match[1]).replace(/\n/g, " ").trim())
    .filter(Boolean);

  const title = headingTexts.length
    ? headingTexts[headingTexts.length - 1]
    : lines[metadataIndex - 2];
  if (!title) return undefined;

  const titleIndex = lines.findIndex((line, index) => index < metadataIndex && line === title);

  const metadata = lines[metadataIndex].match(/^(\d{4})\s+(.+?)\s+(\d{1,4})[’']$/);
  if (!metadata) return undefined;

  const directorLines = lines.slice(titleIndex + 1, metadataIndex)
    .filter((line) => !/^Image:/i.test(line));
  const director = directorLines.join(", ") || undefined;
  const section = SECTION_NAMES.find((name) =>
    lines.slice(Math.max(0, titleIndex - 5), titleIndex).includes(name),
  );

  const sessionsIndex = lines.findIndex((line, index) => index > metadataIndex && /^Sess(?:ões|oes)$/i.test(line));
  const sessionLines = sessionsIndex >= 0 ? lines.slice(sessionsIndex + 1) : [];

  const sessions: Array<{ date: string; time: string; venue: string; durationMinutes?: number }> = [];
  const sessionRe =
    /^(?:\S+\s+)?(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s*\/\s*(\d{1,2}):(\d{2})\s*\/\s*(\d{1,4})[’']$/i;

  for (let i = 0; i < sessionLines.length; i += 1) {
    const match = sessionLines[i].match(sessionRe);
    if (!match) continue;

    const month = MONTHS[match[2].toLowerCase()];
    if (!month) continue;

    const venue = sessionLines[i + 1];
    if (!venue || /^Bilhete$/i.test(venue) || /^Image:/i.test(venue)) continue;

    sessions.push({
      date: `${DOCLISBOA_EDITION_YEAR}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`,
      time: `${String(Number(match[3])).padStart(2, "0")}:${match[4]}`,
      venue,
      durationMinutes: Number(match[5]),
    });
  }

  return {
    film: {
      title,
      director,
      year: Number(metadata[1]),
      country: metadata[2].trim(),
      durationMinutes: Number(metadata[3]),
      imageUrl: extractSourceImageUrl(html, sourceUrl),
    },
    section,
    sessions,
  };
}

async function fetchText(
  fetchImpl: typeof fetch,
  url: string,
): Promise<string> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Doclisboa request failed: HTTP ${response.status} (${url})`);
  }
  return response.text();
}

export async function fetchDoclisboaProgramme(
  options: FetchDoclisboaOptions = {},
): Promise<readonly DoclisboaProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const catalogueUrl = options.url ?? DOCLISBOA_FILMS_URL;
  const catalogueHtml = await fetchText(fetchImpl, catalogueUrl);
  const filmUrls = extractFilmLinks(catalogueHtml, catalogueUrl);

  if (!filmUrls.length) {
    throw new Error(`Doclisboa catalogue returned no film links (${catalogueUrl})`);
  }

  const items: DoclisboaProgrammeItem[] = [];
  const seen = new Set<string>();

  // Keep the request rate modest: the catalogue is small enough to process in
  // batches while avoiding a burst against the festival website.
  for (let offset = 0; offset < filmUrls.length; offset += 8) {
    const batch = filmUrls.slice(offset, offset + 8);
    const pages = await Promise.all(
      batch.map(async (url) => ({ url, html: await fetchText(fetchImpl, url) })),
    );

    for (const page of pages) {
      const parsed = parseFilmPage(page.html, page.url);
      if (!parsed) continue;

      for (const session of parsed.sessions) {
        const externalId = `${session.date}-${session.time.replace(":", "")}-${slug(session.venue)}-${slug(parsed.film.title)}`;
        if (seen.has(externalId)) continue;
        seen.add(externalId);

        items.push({
          sourceExternalId: externalId,
          sourceUrl: page.url,
          editionYear: DOCLISBOA_EDITION_YEAR,
          date: session.date,
          time: session.time,
          title: parsed.film.title,
          films: [parsed.film],
          section: parsed.section,
          venue: session.venue,
          venueType: /cinema/i.test(session.venue) ? "cinema" : "festival_venue",
          durationMinutes: session.durationMinutes ?? parsed.film.durationMinutes,
          director: parsed.film.director,
          country: parsed.film.country,
          year: parsed.film.year,
        });
      }
    }
  }

  if (!items.length) {
    const firstUrl = filmUrls[0];
    let diagnostic = "";
    try {
      const firstHtml = await fetchText(fetchImpl, firstUrl);
      const diagnosticText = textContent(firstHtml).slice(0, 800).replace(/\s+/g, " ").trim();
      diagnostic = ` First page ${firstUrl} returned ${firstHtml.length} HTML chars; text starts: ${JSON.stringify(diagnosticText)}`;
    } catch (error) {
      diagnostic = ` First page fetch failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    throw new Error(
      `Doclisboa catalogue returned ${filmUrls.length} film links but no parseable screenings.${diagnostic}`,
    );
  }

  return items;
}
