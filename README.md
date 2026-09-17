# DocuEvents

Personalized discovery platform for documentary cinema, screenings, festivals, television, streaming and related cultural events.

## Product principle

DocuEvents is not a generic event calendar. It combines user interests, location, dates, films, directors, themes, festivals and trusted sources to answer a practical question:

> What is relevant for me to see or discover now?

Recommendations should initially be deterministic and explainable. Popularity must not be treated as a substitute for personal relevance.

## Architecture

```text
External sources
      ↓
Fetch / ingestion
      ↓
Source adapters
      ↓
Normalization + entity resolution
      ↓
Supabase PostgreSQL
      ↓
Recommendation engine
      ↓
Mobile / web application
```

## Repository areas

- `docs/` — product and technical architecture
- `ingestion/` — source fetching, parsing, normalization and resolution
- `database/` — database migrations and schema decisions
- `src/` — application code (to be introduced with the application foundation)

## Library entrypoint

This repository is the source of truth for the DocuEvents ingestion pipeline. The package exposes `ingestion/index.ts` as its library entrypoint. Consumers should reuse the exported fetchers, parsers, normalizers and contracts instead of copying ingestion business logic.

The Cinemateca adapter is available through `fetchCinematecaProgramme()` and the parser/normalizer exports from `ingestion/index.ts`.

## Project boundary

This repository is independent from `tustopt/docworld`. Do not place DocuEvents code in that repository.

## Current status

Foundation phase. The repository is intentionally starting with architecture and ingestion contracts before application implementation.

## Lovable application

This repository is also the Lovable project for the DocuEvents application:

- `src/` — TanStack Start application (routes, UI, Lovable Cloud integration)
- `src/routes/api/public/ingest/cinemateca.ts` — server-side ingestion endpoint
  (POST, authenticated with `LOVABLE_CRON_SECRET`, supports `dryRun` and `limit`)
- `src/lib/ingestion/` — thin glue that reuses `ingestion/` without duplicating
  parser, normalizer or entity-resolution logic
- `.lovable/`, `supabase/`, `vite.config.ts` — Lovable project configuration

Commands:

- `bun run dev` / `bun run build` — application
- `bun run test` — application and ingestion tests
- `bun run typecheck:ingestion` — ingestion typecheck (`tsconfig.ingestion.json`)

Database migrations under `database/migrations/` document the schema already
applied to the connected Lovable Cloud database. They are not re-run from here.
