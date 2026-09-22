import type { RtpProgrammeItem } from "./types";

export const RTP_SOURCE_KEY = "rtp";

/** Backwards-compatible primary RTP programme URL for existing ingestion exports. */
export const RTP_PROGRAMMES_URL = "https://www.rtp.pt/rtp1/";

export const RTP_CHANNEL_PAGES = [
  { key: "rtp1", channel: "RTP1", url: "https://www.rtp.pt/rtp1/" },
  { key: "rtp2", channel: "RTP2", url: "https://www.rtp.pt/rtp2/" },
  { key: "rtp3", channel: "RTP3", url: "https://www.rtp.pt/rtp3/" },
  { key: "rtp_memoria", channel: "RTP Memória", url: "https://www.rtp.pt/", epgFeedUrl: "/EPG/json/rtp-channels-page/list-grid/tv/4/{date}" },
  { key: "rtp_africa", channel: "RTP África", url: "https://www.rtp.pt/", epgFeedUrl: "/EPG/json/rtp-channels-page/list-grid/tv/5/{date}" },
  { key: "rtp_mundo", channel: "RTP Mundo", url: "https://www.rtp.pt/", epgFeedUrl: "/EPG/json/rtp-channels-page/list-grid/tv/6/{date}" },
  { key: "rtp_acores", channel: "RTP Açores", url: "https://www.rtp.pt/", epgFeedUrl: "/EPG/json/rtp-channels-page/list-grid/tv/7/{date}" },
  { key: "rtp_madeira", channel: "RTP Madeira", url: "https://www.rtp.pt/", epgFeedUrl: "/EPG/json/rtp-channels-page/list-grid/tv/8/{date}" },
] as const;

export interface FetchRtpOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  limit?: number;
  daysBack?: number;
  daysAhead?: number;
  channelPages?: readonly { key: string; channel: string; url: string; epgFeedUrl?: string }[];
}

interface RtpEpgEntry {
  date?: string;
  id?: string;
  name?: string;
  series?: string;
  description?: string;
  url?: string;
  episode?: { number?: string; title?: string; sinopse?: string };
  image?: { width?: string; height?: string; src?: string }[];
}

interface RtpEpgPayload {
  _info?: { name?: string; epgUrl?: string; timeZone?: string };
  result?: Record<string, RtpEpgEntry[]>;
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stripTags(value: string): string {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/&#(x[0-9a-f]+|\d+);/gi, (_, value: string) => {
      const codePoint = value.toLowerCase().startsWith("x")
        ? Number.parseInt(value.slice(1), 16)
        : Number.parseInt(value, 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "&" + value + ";";
    }).replace(/&([a-z]+);/gi, (_, name: string) => ({ aacute: "á", acirc: "â", agrave: "à", atilde: "ã", auml: "ä", ccedil: "ç", eacute: "é", ecirc: "ê", egrave: "è", iacute: "í", oacute: "ó", ocirc: "ô", otilde: "õ", uacute: "ú", ucirc: "û", ntilde: "ñ" }[name.toLowerCase()] || "&" + name + ";")).replace(/\s+/g, " ").trim();
}

function lisbonOffset(date: string, time: string): string {
  const candidate = new Date(date + "T" + time + ":00Z");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(candidate);
  const values = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const local = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
  const offset = Math.round((local - candidate.getTime()) / 60000);
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  return sign + String(Math.floor(absolute / 60)).padStart(2, "0") + ":" + String(absolute % 60).padStart(2, "0");
}


function documentarySignalFromText(value?: string): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\bdocumentari(?:o|os|a|as)|documental(?:is)?\b/.test(normalized)) return true;
  return false;
}

function parseEpisodeNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export function extractRtpProgrammeImageUrl(html: string, baseUrl?: string): string | undefined {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]*>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      return baseUrl ? new URL(match[1].trim(), baseUrl).toString() : match[1].trim();
    } catch {
      return match[1].trim();
    }
  }
  return undefined;
}

export function isRtpDocumentaryDescription(description?: string): boolean {
  if (!description) return false;
  const text = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\bdocumentari(?:o|a|os|as)\b/.test(text)
    || /\bserie\s+documental\b/.test(text)
    || /\bseries\s+documentais\b/.test(text);
}

export function isRtpDocumentaryPage(html: string): boolean {
  const normalize = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const text = normalize(stripTags(html));
  if (
    /este conteudo faz parte de documentarios(?:\\s|$)/i.test(text)
    || /generos\\s+documentarios(?:\\s|$)/i.test(text)
    || /todos\\s+documentarios(?:\\s|$)/i.test(text)
  ) {
    return true;
  }

  const markers = [
    "generos",
    "este conteudo faz parte de",
    "todos documentarios",
  ];

  for (const marker of markers) {
    const index = text.indexOf(marker);
    if (index >= 0 && /documentarios/.test(text.slice(index, index + 500))) {
      return true;
    }
  }

  const decodeEscapes = (value: string): string =>
    value
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
      .replace(/\\x([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));

  const raw = normalize(decodeEscapes(html));
  return /(?:generos|genre|faz parte de|todos)[\\s\\S]{0,500}documentarios/i.test(raw)
    || /documentarios[\\s\\S]{0,500}(?:generos|genre|faz parte de|todos)/i.test(raw);
}

export interface RtpEditorialBroadcast {
  date: string;
  startAt: string;
  channel: string;
}

const RTP_MONTHS: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

export function parseRtpEditorialBroadcasts(html: string): RtpEditorialBroadcast[] {
  const text = stripTags(html).replace(/\s+/g, " ").trim();
  const normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const sectionStart = normalizedText.indexOf("proximas emissoes deste programa");
  if (sectionStart < 0) return [];
  const sectionEnd = normalizedText.indexOf("rever ultimos episodios", sectionStart);
  const section = text.slice(sectionStart, sectionEnd >= 0 ? sectionEnd : sectionStart + 3000);

  const pattern = /(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)\s+(\d{4})\s+(\d{1,2}:\d{2})\s+(RTP(?:\s+(?:1|2|3|Notícias|Mundo(?:\s+(?:América|Ásia))?|Memória|África|Açores|Madeira))?)/gi;
  const results: RtpEditorialBroadcast[] = [];

  for (const match of section.matchAll(pattern)) {
    const [, day, monthName, year, time, channel] = match;
    const month = RTP_MONTHS[monthName.toLowerCase()];
    if (month === undefined) continue;
    const date = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(Number(day)).padStart(2, "0");
    results.push({
      date,
      startAt: date + "T" + time + ":00",
      channel: channel.trim(),
    });
  }

  return results;
}

export function extractRtpProgrammeClassificationUrlFromHtml(html: string, baseUrl: string): string | undefined {
  const pattern = /<a[^>]+href=["']([^"']*\/programa\/tv\/p\d+[^"']*)["'][^>]*>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      return new URL(match[1], baseUrl).toString();
    } catch {
      continue;
    }
  }
  return undefined;
}

export function getRtpProgrammeClassificationUrl(sourceUrl: string): string | undefined {
  const playMatch = sourceUrl.match(/^https?:\/\/www\.rtp\.pt\/play\/(p\d+)(?:\/(e\d+))?(?:\/[^/?#]+)?(?:[?#].*)?$/i);
  if (playMatch) return "https://www.rtp.pt/programa/tv/" + playMatch[1];

  const programmeMatch = sourceUrl.match(/^https?:\/\/www\.rtp\.pt\/programa\/tv\/(p\d+)(?:\/e\d+)?(?:[?#].*)?$/i);
  if (programmeMatch) return "https://www.rtp.pt/programa/tv/" + programmeMatch[1];

  return undefined;
}

export function extractRtpEpgFeedUrl(html: string): string | undefined {
  const match = html.match(/epgFeedUrl\s*=\s*["']([^"']+)["']/i);
  if (!match) return undefined;
  return match[1].replace(/\{0\}/g, "{date}").replace(/%7B0%7D/gi, "{date}");
}

export function parseRtpEpg(payload: RtpEpgPayload, fallbackChannel: string): RtpProgrammeItem[] {
  const channel = payload._info?.name || fallbackChannel;
  const entries = Object.values(payload.result || {}).flat();
  const items: RtpProgrammeItem[] = [];

  for (const entry of entries) {
    if (!entry.date || !entry.name || !entry.url) continue;
    const dateMatch = entry.date.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?$/);
    if (!dateMatch) continue;

    const [, date, time] = dateMatch;
    const episode = parseEpisodeNumber(entry.episode?.number);
    const episodeTitle = entry.episode?.title?.trim() || undefined;
    const description = entry.description?.trim() || entry.episode?.sinopse?.trim() || undefined;
    const imageUrl = entry.image?.slice().sort((a, b) => Number(b.width || 0) - Number(a.width || 0))[0]?.src?.trim() || undefined;
    const sourceExternalId = entry.id
      ? entry.id + "-" + date + "-" + slug(channel)
      : slug(entry.name) + "-" + date + "-" + time.replace(":", "") + "-" + slug(channel);

    const sourceUrl = entry.url.includes("/play/") || entry.url.includes("/programa/tv/")
      ? entry.url
      : entry.url.replace(
          "/programa/tv/",
          "/play/",
        ) + "/" + slug(entry.name.trim());

    items.push({
      sourceExternalId, sourceUrl, broadcasterKey: "rtp", channel,
      title: entry.name.trim(), ...(description ? { description } : {}),
      ...(episodeTitle ? { episodeTitle } : {}),
      ...(entry.series?.trim() ? { seriesTitle: entry.series.trim() } : {}),
      ...(episode !== undefined ? { episode } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      genre: "Documentários",
      startAt: date + "T" + time + ":00" + lisbonOffset(date, time),
    });
  }
  return items;
}

async function fetchRtpEpgProgrammeItemsInternal(options: FetchRtpOptions = {}): Promise<RtpProgrammeItem[]> {
  const fetchImpl = options.fetchImpl || fetch;
  // Production ingestion passes the source canonical URL (https://www.rtp.pt/).
  // RTP EPG discovery is channel-specific, so the canonical root must not
  // override the RTP1/RTP2/RTP3 channel pages.
  const channelPages = options.channelPages
    || (options.url && options.url !== "https://www.rtp.pt/"
      ? [{ key: RTP_SOURCE_KEY, channel: "RTP", url: options.url }]
      : RTP_CHANNEL_PAGES);

  const all: RtpProgrammeItem[] = [];
  const seen = new Set<string>();

  for (const channel of channelPages) {
    let template: string | undefined;
    if (channel.epgFeedUrl) {
      template = channel.epgFeedUrl.replace(/\{0\}/g, "{date}").replace(/%7B0\%}/gi, "{date}");
    } else {
      const pageResponse = await fetchImpl(channel.url);
      if (!pageResponse.ok) throw new Error("RTP channel page fetch failed: " + pageResponse.status + " (" + channel.url + ")");
      template = extractRtpEpgFeedUrl(await pageResponse.text());
    }
    if (!template) throw new Error("RTP EPG feed URL not found (" + channel.url + ")");

    const baseDate = options.now ? options.now() : new Date();
    const daysBack = Math.max(0, options.daysBack ?? 0);
    const daysAhead = Math.max(0, options.daysAhead ?? 0);

    for (let dayOffset = -daysBack; dayOffset <= daysAhead; dayOffset++) {
      const date = new Date(baseDate);
      date.setUTCDate(date.getUTCDate() + dayOffset);
      const dateValue = date.toISOString().slice(0, 10);
      const epgUrl = new URL(template.replace("{date}", dateValue), channel.url).toString();
      const epgResponse = await fetchImpl(epgUrl);
      if (!epgResponse.ok) throw new Error("RTP EPG fetch failed: " + epgResponse.status + " (" + epgUrl + ")");

      const payload = (await epgResponse.json()) as RtpEpgPayload;
      for (const item of parseRtpEpg(payload, channel.channel)) {
        if (seen.has(item.sourceExternalId)) continue;
        seen.add(item.sourceExternalId);
        all.push(item);
      }
    }
  }

  return all;
}

export async function fetchRtpEpgProgrammeItems(options: FetchRtpOptions = {}): Promise<readonly RtpProgrammeItem[]> {
  return fetchRtpEpgProgrammeItemsInternal(options);
}

export async function fetchRtpProgramme(options: FetchRtpOptions = {}): Promise<readonly RtpProgrammeItem[]> {
  const all: RtpProgrammeItem[] = [];
  const fetchImpl = options.fetchImpl || fetch;
  const classificationCache = new Map<string, boolean>();

  for (const item of await fetchRtpEpgProgrammeItemsInternal(options)) {
    const epgSignal = documentarySignalFromText(item.description);
    if (epgSignal === false) continue;

    if (epgSignal === true) {
      all.push(item);
      if (options.limit && all.length >= options.limit) return all.slice(0, options.limit);
      continue;
    }

    const programmeResponse = await fetchImpl(item.sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DocuEvents/1.0; +https://www.rtp.pt/)",
      },
    });
    if (!programmeResponse.ok) continue;
    const programmeHtml = await programmeResponse.text();

    const classificationUrl =
      extractRtpProgrammeClassificationUrlFromHtml(programmeHtml, item.sourceUrl)
      || getRtpProgrammeClassificationUrl(item.sourceUrl);
    let isDocumentary = isRtpDocumentaryPage(programmeHtml)
      || isRtpDocumentaryDescription(item.description);

    if (!isDocumentary && classificationUrl) {
      const cached = classificationCache.get(classificationUrl);
      if (cached !== undefined) {
        isDocumentary = cached;
      } else {
        const classificationResponse = await fetchImpl(classificationUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; DocuEvents/1.0; +https://www.rtp.pt/)",
          },
        });
        if (!classificationResponse.ok) {
          classificationCache.set(classificationUrl, false);
          continue;
        }
        const classificationHtml = await classificationResponse.text();
        isDocumentary = isRtpDocumentaryPage(classificationHtml);
        classificationCache.set(classificationUrl, isDocumentary);
      }
    }

    if (!isDocumentary) continue;

    const imageUrl = extractRtpProgrammeImageUrl(programmeHtml, item.sourceUrl);
    all.push(imageUrl ? { ...item, imageUrl } : item);
    if (options.limit && all.length >= options.limit) return all.slice(0, options.limit);
  }

  return options.limit ? all.slice(0, options.limit) : all;
}
