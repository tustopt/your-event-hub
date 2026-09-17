import type { NormalizedFestival, NormalizedFestivalEdition } from "./festival-contracts";

export interface FestivalResolutionResult {
  action: "insert" | "update" | "review";
  festivalId?: string;
  confidence: "strong" | "probable" | "weak";
}

export interface FestivalEditionResolutionResult {
  action: "insert" | "update" | "review";
  festivalEditionId?: string;
  confidence: "strong" | "probable" | "weak";
}

export interface FestivalPersistencePort {
  resolveFestival(festival: NormalizedFestival): Promise<FestivalResolutionResult>;
  persistFestival(festival: NormalizedFestival, resolution: FestivalResolutionResult): Promise<{ festivalId: string }>;
  resolveFestivalEdition(
    edition: NormalizedFestivalEdition,
    festivalId: string,
  ): Promise<FestivalEditionResolutionResult>;
  persistFestivalEdition(
    edition: NormalizedFestivalEdition,
    festivalId: string,
    resolution: FestivalEditionResolutionResult,
  ): Promise<{ festivalEditionId: string }>;
}
