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
- `src/` — application code

## Project boundary

This repository is the source of truth for DocuEvents and is independent from `tustopt/docworld`.
