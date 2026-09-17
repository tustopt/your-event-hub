import type { SourceType } from "./contracts.js";

export type SourceCategory =
  | "cinema"
  | "festival"
  | "cinematheque"
  | "television"
  | "streaming"
  | "cultural"
  | "manual";

export type SourceStatus = "candidate" | "validated" | "registered" | "production" | "paused" | "retired";

export interface SourceDefinition {
  key: string;
  name: string;
  category: SourceCategory;
  sourceType: SourceType;
  countryCode: string;
  languageCode: string;
  status: SourceStatus;
  adapterKey?: string;
  canonicalUrl: string;
  fetchIntervalMinutes?: number;
  description?: string;
}

/**
 * Canonical application registry for external DocuEvents sources.
 *
 * A source can be registered before an adapter exists. Runners must only
 * execute sources with status="production" and a declared adapterKey.
 */
export const sourceRegistry: readonly SourceDefinition[] = [
  {
    key: "cinemateca_pt",
    name: "Cinemateca Portuguesa",
    category: "cinematheque",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "production",
    adapterKey: "cinemateca_pt",
    canonicalUrl: "https://www.cinemateca.pt/Programacao%20.aspx",
    fetchIntervalMinutes: 360,
    description: "Cinemateca Portuguesa programme and screening source.",
  },
  {
    key: "cinema_sao_jorge",
    name: "Cinema São Jorge",
    category: "cinema",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "production",
    adapterKey: "cinema_sao_jorge",
    canonicalUrl: "https://cinemasaojorge.pt/programacao/0/",
    fetchIntervalMinutes: 360,
    description: "Cinema São Jorge programme and screening source.",
  },
  {
    key: "cinema_fernando_lopes",
    name: "Cinema Fernando Lopes",
    category: "cinema",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "production",
    adapterKey: "cinema_fernando_lopes",
    canonicalUrl: "https://cinemafernandolopes.pt/programacao",
    fetchIntervalMinutes: 360,
    description: "Cinema Fernando Lopes programme and screening source.",
  },
  {
    key: "doclisboa",
    name: "Doclisboa",
    category: "festival",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://doclisboa.org/",
    fetchIntervalMinutes: 360,
    description: "Candidate festival source. Edition-aware ingestion for Doclisboa programme, screenings and festival venues.",
  },
  {
    key: "culturgest",
    name: "Culturgest",
    category: "cultural",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://www.culturgest.pt/",
    fetchIntervalMinutes: 360,
    description: "Candidate cultural programme source.",
  },
  {
    key: "fundacao_gulbenkian",
    name: "Fundação Calouste Gulbenkian",
    category: "cultural",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://gulbenkian.pt/",
    fetchIntervalMinutes: 360,
    description: "Candidate cultural programme source.",
  },
];

export function getSourceDefinition(key: string): SourceDefinition | undefined {
  return sourceRegistry.find((source) => source.key === key);
}

export function getProductionSources(): SourceDefinition[] {
  return sourceRegistry.filter(
    (source) => source.status === "production" && source.adapterKey !== undefined,
  );
}
