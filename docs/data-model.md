# DocuEvents Data Model

The application uses Supabase PostgreSQL.

## Core entities

```text
profiles
  └── user_interests ── interests

films ── film_people ── people
films ── film_genres ── genres
films ── film_themes ── themes

venues

festivals ── festival_editions
                   │
                 events ── screenings ── screening_films ── films
                   │                    └── venues
                   └── venues

sources ── source_items
   │
   ├── films
   ├── venues
   ├── events
   └── tv_programs

users ── favorites
users ── saved_events
users ── recommendations
users ── notifications
```

## Important modeling rules

### Films

A film is a canonical catalogue entity. Source-specific identifiers are retained for provenance and matching, but must not become the primary identity of the film.

`canonical_key` is a deterministic matching aid. It is not, by itself, proof that two records are the same film.

### Events and screenings

An event represents the programming occurrence. A screening contains screening-specific information such as venue, start/end, ticket URL, language, subtitles and format.

A screening can contain one or more films through `screening_films`. The `position` field preserves the order of films in compound sessions.

This avoids incorrectly forcing a multi-film programme into a single `film_id` relationship.

### Festivals

A festival is the long-lived entity. A festival edition represents a specific year/period. Events may be associated with a particular edition.

### Sources

A source identifies an external provider. `source_items` stores the raw/near-raw source item and processing state. This supports repeatable ingestion, diagnostics and reprocessing.

Source provenance is retained on films, venues, events and TV programmes through `source_id`, external identifiers and source URLs where applicable.

## Entity resolution

The system must distinguish:

1. source identity — the provider and external identifier;
2. canonical identity — the DocuEvents entity;
3. presentation data — what the user sees.

Deduplication should combine stable identifiers with normalized fields. Title similarity alone must not silently merge records.

## Personalization

User interests are explicit preferences with a configurable weight. Recommendations are stored as explainable outputs using `score` and structured `reason` data.

The initial recommendation engine should be deterministic and explainable. Behavioural learning can be added later without changing the canonical film/event model.

## Location

Venue coordinates and the user's profile coordinates are stored as latitude/longitude numeric values. PostGIS is intentionally not required for the initial implementation; it can be introduced later if spatial querying becomes necessary.

## Security

Row-level security is enabled on all application tables. User-owned records are restricted to the authenticated user. Catalogue and event data is readable by authenticated users, while ingestion source items remain internal.
