import { PDFParse } from "pdf-parse";
import type { DoclisboaFilmItem, DoclisboaProgrammeItem } from "./types";

export const DOCLISBOA_SOURCE_KEY = "doclisboa";
export const DOCLISBOA_PROGRAMME_URL = "https://doclisboa.org/doclisboa2026_programa.pdf";
export const DOCLISBOA_EDITION_YEAR = 2026;

export interface FetchDoclisboaOptions {
  url?: string;
  fetchImpl?: typeof fetch;
}

type Session = { date: string; time: string; venue: string; duration: number };

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

const SESSION_RE =
  /^(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s*\/\s*(\d{1,2})[.:](\d{2})\s*,\s*(.+)$/i;

const SESSION_CONTINUATION_RE =
  /^\d{1,2}\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s*\/\s*\d{1,2}[.:]\d{2}\s*,\s*$/i;

const METADATA_RE =
  /^(\d{4})\s+(.+?)\s+•\s+(\d{1,4})[’']\s+•\s+(.+)$/;

const SECTION_NAMES = [
  "Competição Internacional",
  "Competição Portuguesa",
  "Riscos",
  "Heart Beat",
  "Da Terra à Lua",
  "Verdes Anos",
  "Na Companhia de William Greaves",
  "Lino Brocka",
];

function normalizeText(value: string): string {
  return value
    .replace(/\u00ad/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function normalizeLines(text: string): string[] {
  const raw = text
    .replace(/\r/g, "")
    .split("\n")
    .map(normalizeText)
    .filter(Boolean);

  const lines: string[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const line = raw[i];

    if (SESSION_CONTINUATION_RE.test(line) && raw[i + 1]) {
      lines.push(normalizeText(line + raw[++i]));
      continue;
    }

    if (/\/\s*$/.test(line) && raw[i + 1] && !SESSION_RE.test(line)) {
      lines.push(normalizeText(line + " " + raw[++i]));
      continue;
    }

    lines.push(line);
  }

  return lines;
}

function parseSession(value: string): Session | undefined {
  const match = value.match(SESSION_RE);
  if (!match) return undefined;

  const month = MONTHS[match[2].toLowerCase()];
  if (!month) return undefined;

  return {
    date: `${DOCLISBOA_EDITION_YEAR}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`,
    time: `${String(Number(match[3])).padStart(2, "0")}:${match[4]}`,
    venue: match[5].trim(),
    duration: 0,
  };
}

function isSectionLine(line: string): boolean {
  return SECTION_NAMES.some((name) => line.startsWith(name + " ̸") || line === name);
}

function sectionFromLine(line: string): string | undefined {
  return SECTION_NAMES.find((name) => line.startsWith(name + " ̸") || line === name);
}

function isNoise(line: string): boolean {
  return /^(CP \/ PC|CI \/ IC|R \/ NV|A PROPÓSITO|PASSA COM|REALIZADOR|REALIZADORA|HOMENAGEM|OUTROS RISCOS|SOPHIE ROGER|JOHN TORRES|CINEMA ETERNO|EM TERRENO DESCONHECIDO|FANTASMAS E APARIÇÕES|POR DENTRO, POR FORA|A LÍNGUA DO LUGAR)/i.test(line);
}

function parseFilmFromMetadata(
  lines: string[],
  metadataIndex: number,
  metadata: RegExpMatchArray,
): DoclisboaFilmItem | undefined {
  let cursor = metadataIndex - 1;
  const directorParts: string[] = [];

  if (cursor < 0) return undefined;
  directorParts.unshift(lines[cursor--]);

  if (cursor >= 0 && /,$/.test(lines[cursor])) {
    directorParts.unshift(lines[cursor--]);
  }

  const candidates: string[] = [];
  while (cursor >= 0 && candidates.length < 4) {
    const line = lines[cursor];
    if (SESSION_RE.test(line) || METADATA_RE.test(line) || isSectionLine(line) || isNoise(line)) break;
    candidates.unshift(line);
    cursor -= 1;
  }

  if (!candidates.length) return undefined;

  let title: string;
  let originalTitle: string | undefined;

  if (candidates.length === 1) {
    title = candidates[0];
  } else if (candidates.length === 2) {
    title = candidates[0];
    originalTitle = candidates[1];
  } else if (candidates.length === 4) {
    title = candidates.slice(0, 2).join(" ");
    originalTitle = candidates.slice(2).join(" ");
  } else {
    title = candidates.slice(0, Math.ceil(candidates.length / 2)).join(" ");
    originalTitle = candidates.slice(Math.ceil(candidates.length / 2)).join(" ");
  }

  const country = metadata[2].split(" / ")[0].trim();

  return {
    title,
    originalTitle,
    director: directorParts.join(" "),
    year: Number(metadata[1]),
    country,
    durationMinutes: Number(metadata[3]),
    format: metadata[4].trim(),
  };
}

export function parseDoclisboaProgrammeText(text: string, sourceUrl: string): DoclisboaProgrammeItem[] {
  const lines = normalizeLines(text);
  const items: DoclisboaProgrammeItem[] = [];
  const pendingSessions: Session[] = [];
  let activeSessions: Session[] = [];
  let activeFilms: DoclisboaFilmItem[] = [];
  let currentSection: string | undefined;

  const flush = () => {
    if (!activeFilms.length || !activeSessions.length) return;

    for (const session of activeSessions) {
      for (const film of activeFilms) {
        const slug = (value: string) =>
          value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        items.push({
          sourceExternalId: `${session.date}-${session.time.replace(":", "")}-${slug(session.venue)}-${slug(film.title)}`,
          sourceUrl,
          editionYear: DOCLISBOA_EDITION_YEAR,
          date: session.date,
          time: session.time,
          title: film.title,
          films: [film],
          section: currentSection,
          venue: session.venue,
          venueType: /cinema/i.test(session.venue) ? "cinema" : "cultural_center",
          durationMinutes: film.durationMinutes,
          director: film.director,
          country: film.country,
          year: film.year,
        });
      }
    }

    activeSessions = [];
    activeFilms = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const section = sectionFromLine(line);

    if (section) {
      flush();
      currentSection = section;
      continue;
    }

    const session = parseSession(line);
    if (session) {
      flush();
      pendingSessions.push(session);
      continue;
    }

    const metadata = line.match(METADATA_RE);
    if (!metadata) continue;

    const film = parseFilmFromMetadata(lines, i, metadata);
    if (!film) continue;

    if (!activeFilms.length && pendingSessions.length) {
      activeSessions = pendingSessions.splice(0);
    }

    if (activeSessions.length) {
      activeFilms.push(film);
    }
  }

  flush();
  return items;
}

async function fetchPdf(fetchImpl: typeof fetch, url: string): Promise<Uint8Array> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Doclisboa PDF fetch failed: ${response.status} (${url})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function fetchDoclisboaProgramme(
  options: FetchDoclisboaOptions = {},
): Promise<readonly DoclisboaProgrammeItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sourceUrl = options.url ?? DOCLISBOA_PROGRAMME_URL;
  const pdf = await fetchPdf(fetchImpl, sourceUrl);
  const parser = new PDFParse({ data: pdf });

  try {
    const result = await parser.getText();
    return parseDoclisboaProgrammeText(result.text, sourceUrl);
  } finally {
    await parser.destroy();
  }
}
