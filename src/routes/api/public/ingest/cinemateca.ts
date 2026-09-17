// Backwards-compatible alias for the Cinemateca source.
// This is a thin wrapper over the generic multi-source ingestion handler; all
// parsing, normalizing and source resolution stays in the root ingestion/
// library and the generic runner.
import { createFileRoute } from "@tanstack/react-router";

import { handleSourceIngest, type Deps } from "./source.$sourceKey";

export const CINEMATECA_SOURCE_KEY = "cinemateca_pt";

export function handleCinematecaIngest(request: Request, deps?: Deps): Promise<Response> {
  return handleSourceIngest(request, CINEMATECA_SOURCE_KEY, deps);
}

export const Route = createFileRoute("/api/public/ingest/cinemateca")({
  server: {
    handlers: {
      POST: ({ request }) => handleCinematecaIngest(request),
    },
  },
});
