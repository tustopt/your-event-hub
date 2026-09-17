import type { CinemaFernandoLopesProgrammeItem } from "./types";

export const DEFAULT_SOURCE_KEY = "cinema_fernando_lopes";
export const DEFAULT_SOURCE_URL = "https://cinemafernandolopes.pt/programacao";

export interface FetchCinemaFernandoLopesOptions {
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
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToLines(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|article|section|header|footer|a)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n+/)
    .map((line) => decodeHtml(line))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseDateLine(text: string, fallbackYear: number): string | undefined {
  const match = text.match(
    /^(?:seg(?:unda)?|ter(?:ça)?|qua(?:rta)?|qui(?:nta)?|sex(?:ta)?|sáb(?:ado)?|sab(?:ado)?|dom(?:ingo)?)(?:-feira)?[.,]?\s+(\d{1,2})\s+(?:de\s+)?([a-zç]+)(?:\s+(\d{4}))?/i,
  );
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = MONTHS[slug(match[2])];
  const year = Number(match[3] ?? fallbackYear);
  if (!month || !day || !year) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseProgrammeLine(text: string): { time: string; title: string; festival?: string } | undefined {
  const match = text.match(/^(\d{1,2})h(\d{2})\s*-\s*(.+)$/i);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;

  let title = match[3].trim();
  let festival: string | undefined;
  const suffix = title.match(/\s+-\s+(mostra essencial Roy Andersson|semana do cinema chinês em portugal 2026)\b/i);
  if (suffix) {
    festival = suffix[1];
    title = title.slice(0, suffix.index).trim();
  }
  title = title.replace(/\s+\|\s+sessão especial\b.*$/i, "").replace(/\s+-\s+sessão especial\b.*$/i, "").trim();
  if (!title) return undefined;
  return { time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, title, festival };
}

export async function fetchCinemaFernandoLopesProgramme(options: FetchCinemaFernandoLopesOptions = {}): Promise<readonly CinemaFernandoLopesProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sourceUrl = options.url ?? DEFAULT_SOURCE_URL;
  const response = await fetchImpl(sourceUrl);
  if (!response.ok) throw new Error(`Cinema Fernando Lopes fetch failed: ${response.status}`);

  const html = await response.text();
  const fallbackYear = options.now?.().getFullYear() ?? new Date().getFullYear();
  const lines = htmlToLines(html);
  const items: CinemaFernandoLopesProgrammeItem[] = [];
  const seen = new Set<string>();
  let currentDate: string | undefined;

  for (const line of lines) {
    const date = parseDateLine(line, fallbackYear);
    if (date) {
      currentDate = date;
      continue;
    }
    if (!currentDate || /^programação a anunciar brevemente$/i.test(line)) continue;
    const programme = parseProgrammeLine(line);
    if (!programme) continue;

    const externalId = `${currentDate}-${programme.time.replace(":", "")}-${slug(programme.title)}`;
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    items.push({ sourceExternalId: externalId, sourceUrl, date: currentDate, time: programme.time, title: programme.title, festival: programme.festival });
  }
  return items;
}
