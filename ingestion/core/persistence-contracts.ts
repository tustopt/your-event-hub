import type { NormalizedFilm, NormalizedScreening, NormalizedVenue } from "./contracts";

export interface FilmResolutionResult {
  action: "insert" | "update" | "review";
  filmId?: string;
  confidence: "strong" | "probable" | "weak";
  canonicalKey: string;
}

export interface VenueResolutionResult {
  action: "insert" | "update" | "review";
  venueId?: string;
  confidence: "strong" | "probable" | "weak";
}

export interface ScreeningPersistenceInput {
  screening: NormalizedScreening;
  resolvedFilms: FilmResolutionResult[];
  resolvedVenue?: VenueResolutionResult;
}

export interface IngestionPersistencePort {
  resolveFilm(film: NormalizedFilm): Promise<FilmResolutionResult>;
  resolveVenue(venue: NormalizedVenue): Promise<VenueResolutionResult>;
  persistScreening(input: ScreeningPersistenceInput): Promise<{ eventId: string; screeningId: string }>;
}
