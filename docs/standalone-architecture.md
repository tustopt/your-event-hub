# DocuEvents Standalone Architecture

## Objective

Run DocuEvents independently of Lovable while preserving the existing ingestion work and keeping the application, data and ingestion layers decoupled.

Lovable is not a runtime dependency of the target architecture.

## Target architecture

```text
                         External sources
                    (Cinemateca, festivals, TV,
                     cinemas, streaming, RSS/API)
                              |
                              v
                 +---------------------------+
                 | GitHub: tustopt/docuevents|
                 | ingestion + adapters      |
                 +-------------+-------------+
                               |
                         scheduled jobs
                         (GitHub Actions)
                               |
                               v
                    +----------------------+
                    | Supabase             |
                    | PostgreSQL           |
                    | Auth / RLS / Storage |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | DocuEvents Web App    |
                    | Next.js + TypeScript |
                    +----------+-----------+
                               |
                               v
                         Browser / mobile
```

## Responsibilities

### GitHub repository

` tustopt/docuevents ` is the source of truth for application and ingestion code.

It contains:

- source adapters and fetchers;
- normalization and entity resolution;
- persistence contracts;
- database migrations;
- recommendation logic;
- application code;
- automated tests;
- CI/CD definitions.

Ingestion code must remain independent of React and UI concerns.

### Supabase

The target hosted data platform is a user-controlled Supabase project.

It will provide:

- PostgreSQL;
- authentication;
- row-level security;
- storage where required;
- server-side database functions where appropriate;
- API access for the application.

The current Lovable Cloud database should be treated as an interim environment until the schema and data migration have been verified.

### Web application

The application foundation should use:

- Next.js;
- TypeScript;
- Tailwind CSS;
- Supabase client/server integration.

The application should consume domain services and database APIs rather than embedding source-specific ingestion logic in pages or components.

### Scheduled ingestion

GitHub Actions is the initial candidate for scheduled ingestion jobs.

A job should:

1. fetch a configured source;
2. parse and normalize it using the source adapter;
3. persist through the ingestion persistence boundary;
4. record success/failure and provenance;
5. expose useful logs for diagnosis.

If execution limits or source volume later justify it, ingestion can move to a dedicated worker without changing the adapter contracts.

## Security boundaries

- Supabase service-role credentials must only exist in server-side execution environments or GitHub Actions secrets.
- Browser code must never receive the service-role key.
- Public application access uses Supabase Auth and RLS.
- Scheduled ingestion uses a separate server-side credential or authenticated endpoint.
- Source credentials, API keys and webhook secrets are stored as environment secrets, never committed to Git.

## Application domains

The initial application should be divided into these domains:

1. Catalog — films, people, genres and themes.
2. Programming — screenings, festivals, editions, venues and TV programmes.
3. Availability — cinema, festival, TV and streaming availability.
4. Personalization — interests, follows, saved items and interactions.
5. Recommendations — deterministic and explainable recommendation scoring.
6. Notifications — availability and recommendation alerts.
7. Ingestion — source configuration, runs, provenance and diagnostics.

## First application milestone

Do not implement the complete product at once. The first vertical slice should be:

```text
Cinemateca
   -> fetch
   -> normalize
   -> persist
   -> film/screening database
   -> web list
   -> screening detail
```

Once this is stable, add authentication and personalization, followed by additional sources.

## Migration strategy from Lovable Cloud

No destructive migration should be performed initially.

### Step 1 — inventory

Document the existing Lovable Cloud schema, functions, constraints, indexes and relevant data.

### Step 2 — target schema

Produce a Supabase migration set that reproduces the required schema without blindly replaying the original `001_initial_schema.sql`, because the current environment already contains core tables.

### Step 3 — new Supabase project

Create the user-controlled Supabase project and apply the target migrations.

### Step 4 — data migration

Copy only required data and verify row counts, foreign keys, unique constraints and ingestion behaviour.

### Step 5 — application cutover

Point the standalone application and ingestion jobs at the new Supabase project.

### Step 6 — validation

Run the Cinemateca ingestion end-to-end and compare results before retiring the Lovable Cloud dependency.

## What is deliberately not part of the first migration

- native mobile applications;
- machine-learning recommendations;
- PostGIS unless distance queries require it;
- microservices;
- Kubernetes;
- a separate ingestion server;
- duplication of source parsers inside the web application.

The architecture should stay simple until real usage requires additional infrastructure.
