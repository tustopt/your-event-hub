import type { CinemaIdealProgrammeItem } from "./types";

export const DEFAULT_SOURCE_KEY = "cinema_ideal";
export const DEFAULT_SOURCE_URL = "https://www.cinemaidealemcasa.pt/";

export interface FetchCinemaIdealOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, marco: 3, março: 3,
  abr: 4, abril: 4, mai: 5, maio: 5, jun: 6, junho: 6, jul: 7, julho: 7,
  ago: 8, agosto: 8, set: 9, setembro: 9, out: 10, outubro: 10,
  nov: 11, novembro: 11, dez: 12, dezembro: 12,
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#8211;|&#x2013;/gi, "–")
    .replace(/&#8212;|&#x2014;/gi, "—")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToLines(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>(?=.)/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|article|section|header|footer|a|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n+/)
    .map((line) => decodeHtml(line))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseDateLine(text: string, fallbackYear: number): string | undefined {
  const numeric = text.match(/^(?:[a-zçáéíóúãõ-]+[.,]?\s+)?(\d{1,2})[\s\/-](\d{1,2})(?:[\s\/-](\d{4}))?$/i);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = Number(numeric[3] ?? fallbackYear);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const named = text.match(
    /^(?:(?:seg(?:unda)?|ter(?:ça)?|qua(?:rta)?|qui(?:nta)?|sex(?:ta)?|sáb(?:ado)?|sab(?:ado)?|dom(?:ingo)?)(?:-feira)?[.,]?\s+)?(\d{1,2})\s+(?:de\s+)?([a-zçãõáéíóú]+)(?:\s+(\d{4}))?$/i,
  );
  if (!named) return undefined;

  const day = Number(named[1]);
  const month = MONTHS[slug(named[2])];
  const year = Number(named[3] ?? fallbackYear);
  if (!month || !day || !year) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTime(text: string): string | undefined {
  const match = text.match(/(?:^|\b)(\d{1,2})[:h](\d{2})(?:\s*h)?\b/i);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function cleanTitle(value: string): string {
  return value
    .replace(/^[-–—|:]+\s*/, "")
    .replace(/\s+\|\s+(?:sala\s+\d+|cinema\s+ideal)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseProgrammeLine(text: string): { time: string; title?: string } | undefined {
  const time = parseTime(text);
  if (!time) return undefined;
  const match = text.match(/(?:^|\s)(\d{1,2})[:h](\d{2})(?:\s*h)?\s*(?:[-–—|:]\s*)?(.+)?$/i);
  const title = cleanTitle(match?.[3] ?? "");
  return { time, title: title || undefined };
}

function isNoise(text: string): boolean {
  return /^(programa|programação|cartaz|bilheteira|comprar bilhete|ver mais|sessões|sessaoes|hoje|amanhã|amanha)$/i.test(text);
}

export async function fetchCinemaIdealProgramme(
  options: FetchCinemaIdealOptions = {},
): Promise<readonly CinemaIdealProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sourceUrl = options.url ?? DEFAULT_SOURCE_URL;
  const response = await fetchImpl(sourceUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; your-event-hub/1.0)" },
  });
  if (!response.ok) throw new Error(`Cinema Ideal fetch failed: ${response.status}`);

  const html = await response.text();
  const fallbackYear = options.now?.().getFullYear() ?? new Date().getFullYear();
  const lines = htmlToLines(html);
  const items: CinemaIdealProgrammeItem[] = [];
  const seen = new Set<string>();
  let currentDate: string | undefined;
  let pendingTitle: string | undefined;

  for (const line of lines) {
    const date = parseDateLine(line, fallbackYear);
    if (date) {
      currentDate = date;
      pendingTitle = undefined;
      continue;
    }
    if (!currentDate || isNoise(line)) continue;

    const programme = parseProgrammeLine(line);
    if (programme) {
      const title = programme.title ?? pendingTitle;
      if (!title) continue;
      const externalId = `${currentDate}-${programme.time.replace(":", "")}-${slug(title)}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      items.push({
        sourceExternalId: externalId,
        sourceUrl,
        date: currentDate,
        time: programme.time,
        title,
      });
      pendingTitle = undefined;
      continue;
    }

    if (!/^(?:sala|sessão|sessao|bilhete|€|\d+ lugares)/i.test(line)) {
      pendingTitle = cleanTitle(line);
    }
  }

  return items;
}
