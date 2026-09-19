import type { CinematecaProgrammeItem } from "./types.js";

const DEFAULT_SOURCE_URL =
  "https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098";
const DEFAULT_SOURCE_KEY = "cinemateca_pt";

export interface FetchCinematecaOptions {
  url?: string;
  sourceKey?: string;
  fetchImpl?: typeof fetch;
}

function text(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function repairUtf8Mojibake(value: string): string {
  // Some legacy HTML responses can arrive with UTF-8 bytes decoded once as
  // Latin-1/Windows-1252. Windows-1252 has printable characters such as
  // “ (0x93), so using charCodeAt() directly would produce the wrong byte.
  if (!/[ÃÂ]/.test(value)) return value;

  const windows1252Bytes: Record<string, number> = {
    "€": 0x80,
    "‚": 0x82,
    "ƒ": 0x83,
    "„": 0x84,
    "…": 0x85,
    "†": 0x86,
    "‡": 0x87,
    "ˆ": 0x88,
    "‰": 0x89,
    "Š": 0x8a,
    "‹": 0x8b,
    "Œ": 0x8c,
    "Ž": 0x8e,
    "‘": 0x91,
    "’": 0x92,
    "“": 0x93,
    "”": 0x94,
    "•": 0x95,
    "–": 0x96,
    "—": 0x97,
    "˜": 0x98,
    "™": 0x99,
    "š": 0x9a,
    "›": 0x9b,
    "œ": 0x9c,
    "ž": 0x9e,
    "Ÿ": 0x9f,
  };

  const bytes = new Uint8Array(
    [...value].map((character) =>
      windows1252Bytes[character] ?? character.charCodeAt(0),
    ),
  );

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

function decodeHtml(value: string): string {
  const decoded = value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#8211;|&ndash;/gi, "–")
    .replace(/&#8217;|&rsquo;/gi, "’")
    .replace(/&#8216;|&lsquo;/gi, "‘")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');

  return repairUtf8Mojibake(decoded);
}

function parseDateTime(value: string): { date: string; time: string } | undefined {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2})h(\d{2})/);
  if (!match) return undefined;
  const [, day, month, year, hour, minute] = match;
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour.padStart(2, "0")}:${minute}`,
  };
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type ParsedFilmFields = Pick<
  CinematecaProgrammeItem,
  "title" | "director" | "country" | "year" | "durationMinutes"
> & { originalTitle?: string };

function parseFilmFields(lines: string[]): ParsedFilmFields | undefined {
  const deIndex = lines.findIndex((line) => /^de\s+/i.test(line));
  if (deIndex < 0) return undefined;

  const titleLines = lines.slice(0, deIndex);
  const directorLine = text(lines[deIndex].replace(/^de\s+/i, ""));
  const metadataIndex = lines.findIndex((line, index) =>
    index > deIndex && /,\s*\d{4}\s*[–-]\s*\d+\s*min\b/i.test(line),
  );
  if (metadataIndex < 0) return undefined;

  const metadata = text(lines[metadataIndex]);
  const metadataMatch = metadata.match(/^(.*?),\s*(\d{4})\s*[–-]\s*(\d+)\s*min\b/i);
  if (!metadataMatch) return undefined;

  const [, country, year, durationMinutes] = metadataMatch;
  const title = text(titleLines[0]);
  const originalTitle = titleLines.length > 1 ? text(titleLines[1]) : undefined;

  if (!title || !directorLine || !country) return undefined;

  return {
    title,
    ...(originalTitle ? { originalTitle } : {}),
    director: directorLine,
    country: text(country),
    year: Number(year),
    durationMinutes: Number(durationMinutes),
  };
}

function parseProgrammeBlock(block: string, sourceUrl: string): CinematecaProgrammeItem | undefined {
  const lines = block
    .split("\n")
    .map((line) => text(line))
    .filter(Boolean);

  const dateIndex = lines.findIndex((line) =>
    /^\d{2}\/\d{2}\/\d{4},\s*\d{1,2}h\d{2}\s*\|\s*Sala\b/i.test(line),
  );
  if (dateIndex < 0) return undefined;

  const header = lines[dateIndex];
  const headerMatch = header.match(
    /^(\d{2}\/\d{2}\/\d{4},\s*\d{1,2}h\d{2})\s*\|\s*(Sala[^|]+)$/i,
  );
  if (!headerMatch) return undefined;

  const dateTime = parseDateTime(headerMatch[1]);
  if (!dateTime) return undefined;

  const cycleIndex = lines.findIndex(
    (line, index) => index > dateIndex && /^Ciclo\s+/i.test(line),
  );
  const cycle = cycleIndex >= 0 ? text(lines[cycleIndex].replace(/^Ciclo\s+/i, "")) : undefined;

  const contentStart = cycleIndex >= 0 ? cycleIndex + 1 : dateIndex + 1;
  const content = lines.slice(contentStart);
  const film = parseFilmFields(content);
  if (!film) return undefined;

  if (cycle && slug(film.title) === slug(cycle)) return undefined;

  return {
    sourceExternalId: `${dateTime.date}-${dateTime.time.replace(":", "")}-${slug(film.title)}`,
    sourceUrl,
    ...dateTime,
    venue: text(headerMatch[2]),
    cycle,
    ...film,
    eventType: "screening",
  };
}

export async function fetchCinematecaProgramme(
  options: FetchCinematecaOptions = {},
): Promise<CinematecaProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = options.url ?? DEFAULT_SOURCE_URL;
  const response = await fetchImpl(url, {
    headers: { Accept: "text/html,application/xhtml+xml" },
  });

  if (!response.ok) {
    throw new Error(`Cinemateca request failed: HTTP ${response.status}`);
  }

  const html = await response.text();
  const sourceText = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|tr|td|h[1-6]|a)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );

  const blocks = sourceText.split(/(?=\d{2}\/\d{2}\/\d{4},\s*\d{1,2}h\d{2}\s*\|\s*Sala\b)/i);
  const items = blocks
    .map((block) => parseProgrammeBlock(block, url))
    .filter((item): item is CinematecaProgrammeItem => Boolean(item));

  const unique = new Map<string, CinematecaProgrammeItem>();
  for (const item of items) {
    unique.set(item.sourceExternalId ?? `${item.date}-${item.time}-${item.title}`, item);
  }

  return [...unique.values()];
}

export { DEFAULT_SOURCE_KEY, DEFAULT_SOURCE_URL };
