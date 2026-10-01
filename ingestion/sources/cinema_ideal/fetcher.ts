import type { CinemaIdealProgrammeItem } from "./types";

export const DEFAULT_SOURCE_KEY = "cinema_ideal";
export const DEFAULT_SOURCE_URL = "https://www.cinemaidealemcasa.pt/";

export interface FetchCinemaIdealOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const WEEKDAYS: Record<string, number> = {
  segunda: 1,
  "segunda-feira": 1,
  terça: 2,
  "terça-feira": 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sábado: 6,
  sabado: 6,
  "sábado-feira": 6,
  "sabado-feira": 6,
  domingo: 0,
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

function parseTimeToken(value: string): string | undefined {
  const match = value.match(/^(\d{1,2})[:h.]?(\d{2})$/i);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function nextDateForWeekday(now: Date, weekday: number): string {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  const current = date.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 0;
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekdayDates(now: Date, weekdays: number[]): string[] {
  return [...new Set(weekdays.map((weekday) => nextDateForWeekday(now, weekday)))].sort();
}

function parseWeekday(value: string): number | undefined {
  const normalized = value.toLocaleLowerCase("pt-PT").replace(/[.,]/g, "").trim();
  return WEEKDAYS[normalized];
}

function extractScheduleDates(
  schedule: string,
  now: Date,
): Array<{ date: string; time: string }> {
  const items: Array<{ date: string; time: string }> = [];

  for (const segment of schedule.split("|").map((value) => value.trim()).filter(Boolean)) {
    const normalized = segment.replace(/\s+/g, " ");
    const allDays = /todos\s+os\s+dias/i.test(normalized);

    if (allDays) {
      const firstTime = normalized.match(/\d{1,2}[:h.]\d{2}/i);
      if (firstTime) {
        const time = parseTimeToken(firstTime[0]);
        if (time) {
          for (const date of weekdayDates(now, [1, 2, 3, 4, 5, 6, 0])) {
            items.push({ date, time });
          }
        }
      }
      continue;
    }

    const tokens = normalized.split(/\s+/);
    const times = tokens
      .map(parseTimeToken)
      .filter((value): value is string => Boolean(value));
    const weekdays = tokens
      .map((token) => parseWeekday(token))
      .filter((value): value is number => value !== undefined);

    if (!times.length || !weekdays.length) continue;

    const dates = weekdayDates(now, weekdays);
    for (const time of times) {
      for (const date of dates) items.push({ date, time });
    }
  }

  return items;
}

function isScheduleLine(value: string): boolean {
  return /\d{1,2}[:h.]\d{2}/i.test(value) &&
    /(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|todos\s+os\s+dias)/i.test(value);
}

function isInfoLine(value: string): boolean {
  return /^(?:\+\s*info|comprar)$/i.test(value) || /^\+\s*info\s+comprar$/i.test(value);
}

function extractCinemaBlocks(lines: string[]): string[][] {
  const start = lines.findIndex((line) => /^no cinema$/i.test(line));
  if (start < 0) return [];

  const blocks: string[][] = [];
  let block: string[] = [];
  let inProgramme = false;

  for (const line of lines.slice(start + 1)) {
    if (/^(?:em casa|videoclube)$/i.test(line)) break;
    if (/^próximas\s+estreias$/i.test(line)) {
      inProgramme = true;
      continue;
    }
    if (!inProgramme) continue;

    // The live page has + INFO and COMPRAR as separate elements.
    // Treat COMPRAR as the block boundary so a film is emitted once.
    if (isInfoLine(line)) {
      continue;
    }
    if (/^comprar$/i.test(line) || /\+\s*info\s+comprar/i.test(line)) {
      if (block.length) blocks.push(block);
      block = [];
      continue;
    }

    block.push(line);
  }

  if (block.length) blocks.push(block);
  return blocks;
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
  const now = options.now?.() ?? new Date();
  const lines = htmlToLines(html);
  const items: CinemaIdealProgrammeItem[] = [];
  const seen = new Set<string>();

  for (const block of extractCinemaBlocks(lines)) {
    const scheduleIndex = block.findIndex(isScheduleLine);
    if (scheduleIndex < 0) continue;

    const title = block.slice(0, scheduleIndex)[0]?.trim();
    if (!title) continue;

    const schedule = block.slice(scheduleIndex).join(" ");
    for (const { date, time } of extractScheduleDates(schedule, now)) {
      const externalId = `${date}-${time.replace(":", "")}-${slug(title)}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      items.push({
        sourceExternalId: externalId,
        sourceUrl,
        date,
        time,
        title,
      });
    }
  }

  return items;
}
