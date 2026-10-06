import type { SourceType } from "./contracts.js";

export type SourceCategory =
  "cinema" | "festival" | "cinematheque" | "television" | "streaming" | "cultural" | "manual";

export type SourceStatus =
  "candidate" | "validated" | "registered" | "production" | "paused" | "retired";

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
    status: "production",
    adapterKey: "doclisboa",
    canonicalUrl: "https://doclisboa.org/filmes/",
    fetchIntervalMinutes: 360,
    description:
      "Doclisboa 2026 film catalogue and screening sessions.",
  },
  {
    key: "cinema_ideal",
    name: "Cinema Ideal",
    category: "cinema",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://www.cinemaidealemcasa.pt/",
    fetchIntervalMinutes: 360,
    description: "Candidate cinema source for programme and screening ingestion.",
  },
  {
    key: "cinema_medeia_nimas",
    name: "Cinema Medeia Nimas",
    category: "cinema",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://medeiafilmes.pt/",
    fetchIntervalMinutes: 360,
    description: "Candidate cinema source for programme and screening ingestion.",
  },
  {
    key: "curtas_vila_do_conde",
    name: "Curtas Vila do Conde",
    category: "festival",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://festival.curtas.pt/",
    fetchIntervalMinutes: 720,
    description: "Candidate film festival source for programme and screening ingestion.",
  },
  {
    key: "indielisboa",
    name: "IndieLisboa",
    category: "festival",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://indielisboa.com/",
    fetchIntervalMinutes: 720,
    description: "Candidate independent film festival source for programme and screening ingestion.",
  },
  {
    key: "leffest",
    name: "LEFFEST",
    category: "festival",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://leffest.com/",
    fetchIntervalMinutes: 720,
    description: "Candidate Lisbon film festival source for programme and screening ingestion.",
  },
  {
    key: "rtp",
    name: "RTP",
    category: "television",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "production",
    adapterKey: "rtp",
    canonicalUrl: "https://www.rtp.pt/",
    fetchIntervalMinutes: 360,
    description: "Television source restricted to documentaries and documentary series.",
  },
  {
    key: "sic",
    name: "SIC",
    category: "television",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "production",
    adapterKey: "sic",
    canonicalUrl: "https://sic.pt/",
    fetchIntervalMinutes: 360,
    description: "Television source restricted to documentaries and documentary series.",
  },
  {
    key: "tvi",
    name: "TVI",
    category: "television",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "production",
    adapterKey: "tvi",
    canonicalUrl: "https://tvi.iol.pt/",
    fetchIntervalMinutes: 360,
    description: "Television source restricted to documentaries and documentary series.",
  },
  {
    key: "artv",
    name: "ARTV",
    category: "television",
    sourceType: "website",
    countryCode: "PT",
    languageCode: "pt",
    status: "candidate",
    canonicalUrl: "https://www.artv.pt/",
    fetchIntervalMinutes: 720,
    description: "Candidate television source restricted to documentary content.",
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
