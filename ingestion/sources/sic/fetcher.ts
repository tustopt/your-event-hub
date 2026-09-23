import type { SourceFetcherOptions } from "../../core/source-fetchers";
import type { SicProgrammeItem } from "./types";
import { getLisbonDate, getLisbonOffset } from "../television/time";

export const SIC_SOURCE_KEY = "sic";
export const SIC_CHANNELS_URL = "https://opto.sic.pt/api/v1/content/channel";
export const SIC_EPG_URL = "https://opto.sic.pt/api/v1/content/epg";

interface SicApiChannel {
  id: string | number;
  name: string;
}

interface SicApiProgramme {
  id?: string | number;
  title?: string;
  description?: string;
  genre?: string;
  category?: string;
  type?: string;
  start_time?: number | string;
  end_time?: number | string;
  episode_number?: number | string | null;
  season_number?: number | string | null;
  url?: string;
  image?: string;
}

function documentarySignal(item: SicApiProgramme): boolean {
  const text = [
    item.title,
    item.description,
    item.genre,
    item.category,
    item.type,
  ].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /documentario|documental|serie documental|series documentais/.test(text);
}

function toIso(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return new Date(numeric < 100000000000 ? numeric * 1000 : numeric).toISOString();
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function episodeNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

export function parseSicEpg(
  payload: unknown,
  channel: string,
): SicProgrammeItem[] {
  if (!Array.isArray(payload)) return [];
  const result: SicProgrammeItem[] = [];

  for (const raw of payload) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as SicApiProgramme;
    if (!item.title) continue;
    if (!documentarySignal(item)) continue;

    const startAt = toIso(item.start_time);
    if (!startAt) continue;

    const endAt = toIso(item.end_time);
    const id = item.id !== undefined
      ? String(item.id)
      : slug(item.title) + "-" + startAt;

    result.push({
      sourceExternalId: "sic-" + channel.toLowerCase().replace(/\s+/g, "-") + "-" + id,
      sourceUrl: item.url || "https://opto.sic.pt/guia-tv",
      broadcasterKey: "sic",
      channel,
      title: item.title.trim(),
      ...(item.description?.trim() ? { description: item.description.trim() } : {}),
      genre: "Documentários",
      startAt,
      ...(endAt ? { endAt } : {}),
      ...(item.image ? { imageUrl: item.image } : {}),
      ...(episodeNumber(item.episode_number) !== undefined ? { episode: episodeNumber(item.episode_number) } : {}),
      ...(episodeNumber(item.season_number) !== undefined ? { season: episodeNumber(item.season_number) } : {}),
    });
  }

  return result;
}

async function fetchJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error("SIC EPG fetch failed: " + response.status + " (" + url + ")");
  return response.json();
}

export async function fetchSicProgramme(options: SourceFetcherOptions = {}): Promise<readonly SicProgrammeItem[]> {
  const fetchImpl = options.fetchImpl || fetch;
  const channelsPayload = await fetchJson(fetchImpl, SIC_CHANNELS_URL);
  if (!Array.isArray(channelsPayload)) return [];

  const channels = (channelsPayload as SicApiChannel[]).filter((channel) =>
    /^SIC(?:\s+Notícias)?$/i.test(channel.name.trim()),
  );
  const now = options.now ? options.now() : new Date();
  const all: SicProgrammeItem[] = [];

  for (let offset = 0; offset <= 1; offset += 1) {
    const dateValue = getLisbonDate(now, offset);
    const nextDateValue = getLisbonDate(now, offset + 1);
    const startDate = Math.floor(new Date(dateValue + "T00:00:00" + getLisbonOffset(dateValue, "00:00")).getTime() / 1000);
    const endDate = Math.floor(new Date(nextDateValue + "T00:00:00" + getLisbonOffset(nextDateValue, "00:00")).getTime() / 1000);

    for (const channel of channels) {
      const url = SIC_EPG_URL + "?startDate=" + startDate + "&endDate=" + endDate + "&channels=" + encodeURIComponent(String(channel.id));
      const payload = await fetchJson(fetchImpl, url);
      all.push(...parseSicEpg(payload, channel.name));
    }
  }

  return all;
}
