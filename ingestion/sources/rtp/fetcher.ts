import type { RtpProgrammeItem } from "./types";

export const RTP_SOURCE_KEY = "rtp";

/** Backwards-compatible primary RTP programme URL for existing ingestion exports. */
export const RTP_PROGRAMMES_URL = "https://www.rtp.pt/rtp1/";

export const RTP_CHANNEL_PAGES = [
  { key: "rtp1", channel: "RTP1", url: "https://www.rtp.pt/rtp1/" },
  { key: "rtp2", channel: "RTP2", url: "https://www.rtp.pt/rtp2/" },
  { key: "rtp3", channel: "RTP3", url: "https://www.rtp.pt/rtp3/" },
] as const;

export interface FetchRtpOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  limit?: number;
  channelPages?: readonly { key: string; channel: string; url: string }[];
}

interface RtpEpgEntry {
  date?: string;
  id?: string;
  name?: string;
  series?: string;
  description?: string;
  url?: string;
  episode?: { number?: string; title?: string; sinopse?: string };
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
    .replace(/&#39;/gi, "'").replace(/&([a-z]+);/gi, (_, name: string) => ({ aacute: "á", acirc: "â", agrave: "à", atilde: "ã", auml: "ä", ccedil: "ç", eacute: "é", ecirc: "ê", egrave: "è", iacute: "í", oacute: "ó", ocirc: "ô", otilde: "õ", uacute: "ú", ucirc: "û", ntilde: "ñ" }[name.toLowerCase()] || "&" + name + ";")).replace(/\s+/g, " ").trim();
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

export function isRtpDocumentaryPage(html: string): boolean {
  const text = stripTags(html).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /este conteudo faz parte de documentarios(?:\s|$)/i.test(text) || /generos\s+documentarios(?:\s|$)/i.test(text);
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
    const sourceExternalId = entry.id
      ? entry.id + "-" + date + "-" + slug(channel)
      : slug(entry.name) + "-" + date + "-" + time.replace(":", "") + "-" + slug(channel);

    const sourceUrl = entry.url.replace(
      "/programa/tv/",
      "/play/",
    ) + "/" + slug(entry.name.trim());

    items.push({
      sourceExternalId, sourceUrl, broadcasterKey: "rtp", channel,
      title: entry.name.trim(), ...(description ? { description } : {}),
      ...(episodeTitle ? { episodeTitle } : {}),
      ...(entry.series?.trim() ? { seriesTitle: entry.series.trim() } : {}),
      ...(episode !== undefined ? { episode } : {}),
      genre: "Documentários",
      startAt: date + "T" + time + ":00" + lisbonOffset(date, time),
    });
  }
  return items;
}

export async function fetchRtpProgramme(options: FetchRtpOptions = {}): Promise<readonly RtpProgrammeItem[]> {
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
    const pageResponse = await fetchImpl(channel.url);
    if (!pageResponse.ok) throw new Error("RTP channel page fetch failed: " + pageResponse.status + " (" + channel.url + ")");

    const template = extractRtpEpgFeedUrl(await pageResponse.text());
    if (!template) throw new Error("RTP EPG feed URL not found (" + channel.url + ")");

    const date = (options.now ? options.now() : new Date()).toISOString().slice(0, 10);
    const epgUrl = new URL(template.replace("{date}", date), channel.url).toString();
    const epgResponse = await fetchImpl(epgUrl);
    if (!epgResponse.ok) throw new Error("RTP EPG fetch failed: " + epgResponse.status + " (" + epgUrl + ")");

    const payload = (await epgResponse.json()) as RtpEpgPayload;
    for (const item of parseRtpEpg(payload, channel.channel)) {
      if (seen.has(item.sourceExternalId)) continue;
      const programmeResponse = await fetchImpl(item.sourceUrl);
      if (!programmeResponse.ok) continue;
      const programmeHtml = await programmeResponse.text();
      if (!isRtpDocumentaryPage(programmeHtml)) continue;

      const imageUrl = extractRtpProgrammeImageUrl(programmeHtml, item.sourceUrl);
      seen.add(item.sourceExternalId);
      all.push(imageUrl ? { ...item, imageUrl } : item);
      if (options.limit && all.length >= options.limit) return all.slice(0, options.limit);
    }
  }

  return options.limit ? all.slice(0, options.limit) : all;
}
