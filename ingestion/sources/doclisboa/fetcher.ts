import type { DoclisboaProgrammeItem } from "./types";

export const DOCLISBOA_SOURCE_KEY = "doclisboa";
export const DOCLISBOA_PROGRAMME_URL = "https://doclisboa.org/2026/programa/";

export interface FetchDoclisboaOptions {
  url?: string;
  fetchImpl?: typeof fetch;
}

const MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1,
  fev: 2, fevereiro: 2,
  mar: 3, marco: 3, março: 3,
  abr: 4, abril: 4,
  mai: 5, maio: 5,
  jun: 6, junho: 6,
  jul: 7, julho: 7,
  ago: 8, agosto: 8,
  set: 9, setembro: 9,
  out: 10, outubro: 10,
  nov: 11, novembro: 11,
  dez: 12, dezembro: 12,
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#8211;|&#x2013;/gi, "–")
    .replace(/&#8212;|&#x2014;/gi, "—")
    .replace(/&#x27;/gi, "'")
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
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDateLine(text: string, editionYear: number): string | undefined {
  const match = text.match(/^(\d{1,2})(?:\s+de)?\s+([a-zç]+)(?:\s+(\d{4}))?$/i);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = MONTHS[slug(match[2])];
  const year = Number(match[3] ?? editionYear);
  if (!month || day < 1 || day > 31 || !year) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseSessionLine(text: string): { date: string; time: string; durationMinutes?: number } | undefined {
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\s*\/\s*(\d{1,2}):(\d{2})(?:\s*\/\s*(\d{1,3})[’']?)?$/);
  if (!match) return undefined;
  const month = Number(match[2]);
  const day = Number(match[1]);
  const hour = Number(match[3]);
  const minute = Number(match[4]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return undefined;
  return {
    date: `${month}/${day}`,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    durationMinutes: match[5] ? Number(match[5]) : undefined,
  };
}

function extractDirector(text: string): string | undefined {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || /^(bilhete|add to calendar|ver mais|sessão|image)$/i.test(cleaned)) return undefined;
  if (/^(de|by)\s+/i.test(cleaned)) return cleaned.replace(/^(de|by)\s+/i, "").trim();
  return undefined;
}

/**
 * Fetches the public Doclisboa 2026 programme page.
 *
 * The parser intentionally relies on semantic programme text (date/session,
 * venue, title and director) rather than CSS class names, because the site UI
 * has changed between editions. The source remains candidate until a real 2026
 * page fixture is captured and the parser is validated against it.
 */
export async function fetchDoclisboaProgramme(
  options: FetchDoclisboaOptions = {},
): Promise<readonly DoclisboaProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sourceUrl = options.url ?? DOCLISBOA_PROGRAMME_URL;
  const response = await fetchImpl(sourceUrl);
  if (!response.ok) throw new Error(`Doclisboa fetch failed: ${response.status}`);

  const html = await response.text();
  const lines = htmlToLines(html);
  const editionYear = 2026;
  const items: DoclisboaProgrammeItem[] = [];
  const seen = new Set<string>();
  let currentDate: string | undefined;
  let currentSection: string | undefined;
  let pendingSession: { date: string; time: string; durationMinutes?: number } | undefined;
  let pendingVenue: string | undefined;
  let pendingTicketUrl: string | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const date = parseDateLine(line, editionYear);
    if (date) {
      currentDate = date;
      pendingSession = undefined;
      continue;
    }

    const session = parseSessionLine(line);
    if (session) {
      const [month, day] = session.date.split("/").map(Number);
      currentDate = `${editionYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      pendingSession = { ...session, date: currentDate };
      continue;
    }

    if (!pendingSession) continue;
    if (/^(da terra à lua|heart beat|new visions|competição|competition|verdes anos|retrospectiva|retrospective|sessões especiais|special sessions)$/i.test(line)) {
      currentSection = line;
      continue;
    }
    if (/^(bilhete|add to calendar)$/i.test(line)) continue;

    if (!pendingVenue && /(culturgest|cinema são jorge|cinemateca portuguesa|cinema ideal)/i.test(line)) {
      pendingVenue = line;
      continue;
    }

    const next = lines[index + 1];
    if (next && /^(de|by)\s+/i.test(next)) {
      const title = line.trim();
      const director = extractDirector(next);
      if (!title || title.length > 240) continue;

      const externalId = `${pendingSession.date}-${pendingSession.time.replace(":", "")}-${slug(pendingVenue ?? "unknown")}-${slug(title)}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      items.push({
        sourceExternalId: externalId,
        sourceUrl,
        editionYear,
        date: pendingSession.date,
        time: pendingSession.time,
        title,
        section: currentSection,
        venue: pendingVenue ?? "Doclisboa",
        venueType: /cinemateca|cinema/i.test(pendingVenue ?? "") ? "cinema" : "cultural_center",
        ticketUrl: pendingTicketUrl,
        durationMinutes: pendingSession.durationMinutes,
        director,
      });
      pendingSession = undefined;
      pendingVenue = undefined;
      pendingTicketUrl = undefined;
    }
  }

  return items;
}
