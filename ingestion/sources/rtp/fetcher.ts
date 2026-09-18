import type { RtpProgrammeItem } from "./types";

export const RTP_SOURCE_KEY = "rtp";
export const RTP_PROGRAMMES_URL = "https://www.rtp.pt/rtpnoticias/programas";

export interface FetchRtpOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  limit?: number;
}

function decodeHtml(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, ""));
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const MONTHS: Record<string, number> = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 };

function parseDateTime(text: string, fallbackYear: number) {
  const m = text.match(/(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(\d{4})?\s*(\d{1,2}):(\d{2})/i);
  if (!m) return undefined;
  const year = Number(m[3] || fallbackYear), month = MONTHS[m[2].toLowerCase()], day = Number(m[1]), hour = Number(m[4]), minute = Number(m[5]);
  if (!month || hour > 23 || minute > 59) return undefined;
  return { date: year + "-" + String(month).padStart(2,"0") + "-" + String(day).padStart(2,"0"), time: String(hour).padStart(2,"0") + ":" + String(minute).padStart(2,"0") };
}

function lisbonOffset(date: string, time: string): string {
  const candidate = new Date(date + "T" + time + ":00Z");
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone:"Europe/Lisbon", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(candidate);
  const values = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  const local = Date.UTC(Number(values.year), Number(values.month)-1, Number(values.day), Number(values.hour), Number(values.minute));
  const offset = Math.round((local - candidate.getTime()) / 60000);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return sign + String(Math.floor(abs/60)).padStart(2,"0") + ":" + String(abs%60).padStart(2,"0");
}

function parseDuration(text: string): number | undefined {
  const hm = text.match(/(\d+)h\s*(\d+)?/i);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] || 0);
  const mm = text.match(/(\d+)min/i);
  return mm ? Number(mm[1]) : undefined;
}

function extractDocumentaryLinks(html: string): { href:string; title:string }[] {
  const result: { href:string; title:string }[] = [];
  const re = /<a\b[^>]*href=["']([^"']*\/programa\/tv\/p\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const title = stripTags(m[2]);
    const context = stripTags(html.slice(Math.max(0, (m.index || 0)-500), Math.min(html.length, (m.index || 0)+m[0].length+800)));
    if (!title || !/Document[aá]rios/i.test(context)) continue;
    const href = new URL(m[1], RTP_PROGRAMMES_URL).toString();
    if (!result.some(x => x.href === href)) result.push({ href, title });
  }
  return result;
}

export function parseRtpProgrammePage(html: string, sourceUrl: string, fallbackYear: number): RtpProgrammeItem[] {
  const text = stripTags(html);
  const genreMatch = text.match(/G[eé]neros\s+Document[aá]rios/i);
  if (!genreMatch) return [];

  const heading = html.match(/<h1\\b[^>]*>([\s\\S]*?)<\/h1>/i);
  const title = heading ? stripTags(heading[1]) : undefined;
  if (!title) return [];

  const duration = parseDuration(text);
  const sectionStart = text.search(/Pr[oó]ximas emiss[oõ]es deste programa/i);
  const sectionEnd = text.search(/Rever [uú]ltimos epis[oó]dios/i);
  const scheduleText = sectionStart >= 0
    ? text.slice(sectionStart, sectionEnd > sectionStart ? sectionEnd : undefined)
    : text;

  const monthNames: Record<string, number> = {
    Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6,
    Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12,
  };
  const emissionRe = /(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s+(\d{4})?\s+(\d{1,2}:\d{2})\s+((?:RTP(?:\s+[A-Za-zÀ-ÿ0-9]+){0,3}))/g;
  const items: RtpProgrammeItem[] = [];
  const seen = new Set<string>();

  for (const match of scheduleText.matchAll(emissionRe)) {
    const day = Number(match[1]);
    const month = monthNames[match[2]];
    const year = Number(match[3] || fallbackYear);
    const time = match[4];
    const channel = match[5].trim();
    if (!month) continue;

    const date = year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    const externalId = slug(sourceUrl) + "-" + date + "-" + time.replace(":", "") + "-" + slug(channel);
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    items.push({
      sourceExternalId: externalId,
      sourceUrl,
      broadcasterKey: "rtp",
      channel,
      title,
      genre: "Documentários",
      startAt: date + "T" + time + ":00" + lisbonOffset(date, time),
      ...(duration !== undefined ? { durationMinutes: duration } : {}),
    });
  }

  return items;
}

export async function fetchRtpProgramme(options: FetchRtpOptions = {}): Promise<readonly RtpProgrammeItem[]> {
  const fetchImpl = options.fetchImpl || fetch;
  const sourceUrl = options.url || RTP_PROGRAMMES_URL;
  const response = await fetchImpl(sourceUrl);
  if (!response.ok) throw new Error("RTP fetch failed: " + response.status);
  const links = extractDocumentaryLinks(await response.text());
  const selected = options.limit ? links.slice(0, options.limit) : links;
  const year = options.now ? options.now().getFullYear() : new Date().getFullYear();
  const items: RtpProgrammeItem[] = [];
  for (const link of selected) {
    const page = await fetchImpl(link.href);
    if (!page.ok) continue;
    items.push(...parseRtpProgrammePage(await page.text(), link.href, year));
  }
  return items;
}
