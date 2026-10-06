export interface DoclisboaFilmItem {
  title: string;
  originalTitle?: string;
  durationMinutes?: number;
  director?: string;
  country?: string;
  year?: number;
  synopsis?: string;
  imageUrl?: string;
  format?: string;
}

export interface DoclisboaProgrammeItem {
  sourceExternalId: string;
  sourceUrl: string;
  editionYear: number;
  date: string;
  time: string;
  title: string;
  films: readonly DoclisboaFilmItem[];
  section?: string;
  venue: string;
  venueType?: "cinema" | "cultural_center" | "festival_venue" | "theatre" | "other";
  ticketUrl?: string;
  language?: string;
  subtitleLanguage?: string;
  format?: string;
  durationMinutes?: number;
  director?: string;
  country?: string;
  year?: number;
  synopsis?: string;
}
