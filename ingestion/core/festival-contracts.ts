import type { SourceProvenance } from "./contracts";

export interface NormalizedFestival {
  key: string;
  name: string;
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

export interface FestivalAdapterResult {
  festivals: NormalizedFestival[];
  editions: NormalizedFestivalEdition[];
}
