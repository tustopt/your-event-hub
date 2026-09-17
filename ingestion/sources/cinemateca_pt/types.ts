export interface CinematecaRawItem {
  sourceUrl?: string;
  externalId?: string;
  html: string;
  fetchedAt: string;
}

export interface CinematecaProgrammeItem {
  sourceExternalId?: string;
  sourceUrl?: string;
  date: string;
  time: string;
  venue?: string;
  cycle?: string;
  title: string;
  originalTitle?: string;
  director?: string;
  country?: string;
  year?: number;
  durationMinutes?: number;
  language?: string;
  subtitles?: string;
  eventType: "screening";
}

export interface CinematecaParserOptions {
  sourceKey?: string;
  timezone?: string;
}
