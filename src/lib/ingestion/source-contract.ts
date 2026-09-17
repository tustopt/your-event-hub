// Structural contract of the root `ingestion/` library as consumed by the app.
// Only shapes live here - every adapter, parser and normalizer stays in
// ingestion/ (source of truth).

/** Normalized screening payload passed to public.ingest_screening(). */
export type ScreeningLike = {
  provenance?: { sourceKey?: string; sourceExternalId?: string } & Record<string, unknown>;
} & Record<string, unknown>;

export type SourceStatus =
  | "candidate"
  | "validated"
  | "registered"
  | "production"
  | "paused"
  | "retired";

export type SourceDefinitionLike = {
  key: string;
  name: string;
  status: SourceStatus;
  adapterKey?: string;
};

export type ParsedSourceItemLike = { sourceKey: string; sourceType: string };

export type SourceFetcherLike = {
  sourceKey: string;
  sourceType: string;
  fetch: () => Promise<readonly unknown[]>;
  toParsedItem: (item: unknown) => ParsedSourceItemLike;
};

export type AdapterLike = {
  key: string;
  sourceType: string;
  parse: (
    input: ParsedSourceItemLike,
    sourceItem?: unknown,
  ) => { screenings: ScreeningLike[]; warnings: string[] };
};

export type IngestionLibrary = {
  getSourceDefinition: (key: string) => SourceDefinitionLike | undefined;
  createProductionAdapterRegistry: () => ReadonlyMap<string, AdapterLike>;
  getSourceFetcher: (key: string, options?: Record<string, unknown>) => SourceFetcherLike;
  runSourcePipeline: unknown;
};

/** Statuses whose sources may be executed by the ingestion endpoint. */
export const RUNNABLE_STATUSES: readonly SourceStatus[] = ["registered", "production"];
