# DocuEvents Architecture

## Goals

1. Personalized discovery rather than a generic event listing.
2. Multiple source types with traceable provenance.
3. Deterministic, explainable recommendations in the first version.
4. Clear separation between ingestion and application code.
5. Supabase PostgreSQL as the hosted data platform.
6. Design for future mobile and web clients without coupling ingestion to UI.

## Main domains

### Catalog

- films
- people
- genres
- themes
- venues

### Programming

- festivals
- festival editions
- events
- screenings
- television channels
- television programs

### Personalization

- profiles
- interests
- user interests and weights
- favorites
- saved events
- recommendations
- notifications

### Ingestion

- sources
- source items
- adapters/parsers
- normalization
- entity resolution
- provenance

## Data flow

```text
source
  → fetch
  → source_item
  → parser/adapter
  → normalized entities
  → entity resolution / deduplication
  → persistence
  → recommendation inputs
  → user experience
```

Raw source information must remain traceable. A normalized record should retain the source identity and external identifier whenever available.

## Recommendation approach

Version 1 should use explicit signals such as:

- followed interests
- genre/theme affinity
- followed films/directors/festivals
- distance from the user's configured location
- date/time relevance
- availability channel
- saved items
- prior interaction signals

Every recommendation should be able to explain its main contributing signals. A later learning-to-rank layer can be added without replacing the ingestion model.

## Location

The initial schema uses latitude/longitude numeric fields. PostGIS is not assumed to be installed. A spatial database migration can be introduced later when distance queries justify it.

## Ingestion boundary

Ingestion must not depend on React, routing or presentation components. Source adapters produce normalized domain data and provenance; persistence and application concerns consume those contracts.
