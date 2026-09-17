// Loads the authoritative DocuEvents ingestion library (root `ingestion/`)
// through import.meta.glob, so the library keeps its own tsconfig and no
// adapter, parser or normalizer logic is duplicated inside src/.
import type { IngestionLibrary } from "./source-contract";

export class IngestionLibraryUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionLibraryUnavailableError";
  }
}

const REQUIRED = [
  "getSourceDefinition",
  "createProductionAdapterRegistry",
  "getSourceFetcher",
  "runSourcePipeline",
] as const;

function asLibrary(mod: Record<string, unknown>): IngestionLibrary | null {
  for (const name of REQUIRED) {
    if (typeof mod[name] !== "function") return null;
  }
  return mod as unknown as IngestionLibrary;
}

export async function loadIngestionLibrary(): Promise<IngestionLibrary> {
  const loaders = import.meta.glob("../../../ingestion/index.ts") as Record<
    string,
    () => Promise<unknown>
  >;
  for (const load of Object.values(loaders)) {
    try {
      const library = asLibrary((await load()) as Record<string, unknown>);
      if (library) return library;
    } catch {
      // fall through to the error below
    }
  }
  throw new IngestionLibraryUnavailableError(
    `DocuEvents ingestion library not loadable from ingestion/index.ts (expected exports: ${REQUIRED.join(", ")}).`,
  );
}
