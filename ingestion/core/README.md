# Ingestion core

Shared contracts and pipeline primitives live here. This layer must remain independent from React, routing, Supabase client code and source-specific HTML selectors.

## Contract boundary

Source adapters transform provider-specific input into normalized records defined in `contracts.ts`.

```text
provider input
    ↓
source adapter
    ↓
AdapterResult
    ├── NormalizedEvent
    └── NormalizedScreening
          └── NormalizedScreeningFilm[]
```

## Rules

- Preserve provenance on every externally sourced entity.
- Keep adapter output deterministic.
- Do not silently merge entities based only on title similarity.
- Keep compound screenings as an ordered list of films.
- Do not persist from the parser directly; persistence belongs to a later pipeline stage.
