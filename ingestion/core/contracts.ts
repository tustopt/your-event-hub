export type SourceType = "website" | "rss" | "api" | "ical" | "csv" | "manual";

export type NormalizedEventType =
  | "screening"
  | "festival"
  | "debate"
  | "masterclass"
  | "exhibition"
  | "workshop"
  | "other";

export interface SourceProvenance {
  sourceKey: string;
  sourceExternalId?: string;
  sourceUrl?: string;
  sourceItemId?: string;
}

export interface NormalizedPerson {
  name: string;
  role: "director" | "producer" | "writer" | "cinematographer" | "other";
  provenance?: SourceProvenance;
}

export interface NormalizedFilm {
  title: string;
  originalTitle?: string;
  year?: number;
  durationMinutes?: number;
  synopsis?: string;
  imdbId?: string;
  tmdbId?: string;
  people?: NormalizedPerson[];
  countries?: string[];
  provenance: SourceProvenance;
}

export interface NormalizedVenue {
  name: string;
  type: "cinema" | "cultural_center" | "festival_venue" | "museum" | "theatre" | "other";
  address?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  provenance: SourceProvenance;
}

export interface NormalizedFestival {
  key: string;
  name: string;
  slug?: string;
  website?: string;
  countryCode?: string;
  provenance: SourceProvenance;
}

export interface NormalizedFestivalEdition {
  festivalKey: string;
  year: number;
  startDate?: string;
  endDate?: string;
  website?: string;
  provenance: SourceProvenance;
}

export interface NormalizedScreeningFilm {
  film: NormalizedFilm;
  position: number;
}

export interface NormalizedScreening {
  eventType: "screening";
  title: string;
  startAt: string;
  endAt?: string;
  venue?: NormalizedVenue;
  language?: string;
  subtitleLanguage?: string;
  format?: string;
  ticketUrl?: string;
  price?: number;
  currency?: string;
  films: NormalizedScreeningFilm[];
  cycle?: string;
  festivalKey?: string;
  festivalEditionYear?: number;
  provenance: SourceProvenance;
}

export interface NormalizedEvent {
  eventType: NormalizedEventType;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  venue?: NormalizedVenue;
  film?: NormalizedFilm;
  festivalKey?: string;
  festivalEditionYear?: number;
  provenance: SourceProvenance;
}

export interface ParsedSourceItem {
  sourceKey: string;
  sourceType: SourceType;
  sourceUrl?: string;
  externalId?: string;
  raw: string;
  parsedAt: string;
}

export interface AdapterResult {
  events: NormalizedEvent[];
  screenings: NormalizedScreening[];
  festivals?: NormalizedFestival[];
  festivalEditions?: NormalizedFestivalEdition[];
  warnings: string[];
}

/**
 * Adapter contract keeps the typed source item alongside its audit metadata.
 * Generic ingestion can still pass only ParsedSourceItem; source pipelines
 * pass the original typed item so adapters do not need to serialize/deserialize
 * source-specific data.
 */
export interface SourceAdapter<TInput = ParsedSourceItem> {
  readonly key: string;
  readonly sourceType: SourceType;
  parse(input: ParsedSourceItem, sourceItem?: TInput): AdapterResult;
}
