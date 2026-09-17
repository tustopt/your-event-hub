// Loads the authoritative Cinemateca parser from the DocuEvents GitHub package.
//
// INTEGRATION ASSUMPTION
// ----------------------
// The parser is NOT duplicated here. It is expected to be installed as a
// dependency built from tustopt/docuevents (e.g.
// `bun add github:tustopt/docuevents#<tag>`), exposing:
//   export async function fetchCinematecaScreenings(opts?: { limit?: number }): Promise<unknown[]>
//   export function normalizeCinematecaScreening(raw: unknown): NormalizedScreening
// from one of the module ids below. Until that dependency is installed and the
// repo exports those two functions, this loader throws and the endpoint answers
// 501 with the exact integration step required.
import type { CinematecaSource } from "./contract";

const CANDIDATE_MODULE_IDS = [
  "@docuevents/ingestion",
  "docuevents/ingestion/sources/cinemateca_pt",
  "docuevents",
];

export class SourceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceUnavailableError";
  }
}

function asSource(mod: Record<string, unknown>): CinematecaSource | null {
  const fetchFn = mod["fetchCinematecaScreenings"];
  const normalizeFn = mod["normalizeCinematecaScreening"];
  if (typeof fetchFn === "function" && typeof normalizeFn === "function") {
    return {
      fetchCinematecaScreenings: fetchFn as CinematecaSource["fetchCinematecaScreenings"],
      normalizeCinematecaScreening:
        normalizeFn as CinematecaSource["normalizeCinematecaScreening"],
    };
  }
  return null;
}

export async function loadCinematecaSource(): Promise<CinematecaSource> {
  for (const id of CANDIDATE_MODULE_IDS) {
    try {
      const mod = (await import(/* @vite-ignore */ id)) as Record<string, unknown>;
      const source = asSource(mod) ?? asSource((mod["default"] ?? {}) as Record<string, unknown>);
      if (source) return source;
    } catch {
      // module not installed - try the next candidate
    }
  }
  throw new SourceUnavailableError(
    "Cinemateca parser not available. Install the DocuEvents ingestion package " +
      `(one of: ${CANDIDATE_MODULE_IDS.join(", ")}) built from tustopt/docuevents and ` +
      "export fetchCinematecaScreenings() and normalizeCinematecaScreening() from it. " +
      "The parser is intentionally not copied into this project.",
  );
}
