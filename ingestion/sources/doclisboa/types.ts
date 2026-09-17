export interface DoclisboaProgrammeItem {
  sourceExternalId: string;
  sourceUrl: string;
  editionYear: number;
  date: string;
  time: string;
  title: string;
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
