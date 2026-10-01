export interface CinemaIdealProgrammeItem {
  sourceExternalId: string;
  sourceUrl: string;
  date: string;
  time: string;
  title: string;
  originalTitle?: string;
  venue?: string;
  year?: number;
  durationMinutes?: number;
  director?: string;
  country?: string;
  synopsis?: string;
}
