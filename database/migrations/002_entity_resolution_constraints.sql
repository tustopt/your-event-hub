BEGIN;

-- Entity-resolution constraints.
-- Canonical keys remain a matching aid; only authoritative external IDs and
-- source-scoped external IDs receive database uniqueness guarantees.

CREATE UNIQUE INDEX IF NOT EXISTS uq_films_imdb_id
    ON public.films(imdb_id)
    WHERE imdb_id IS NOT NULL AND btrim(imdb_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_films_tmdb_id
    ON public.films(tmdb_id)
    WHERE tmdb_id IS NOT NULL AND btrim(tmdb_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_films_source_external_id
    ON public.films(source_id, source_external_id)
    WHERE source_id IS NOT NULL
      AND source_external_id IS NOT NULL
      AND btrim(source_external_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_source_external_id
    ON public.events(source_id, source_external_id)
    WHERE source_id IS NOT NULL
      AND source_external_id IS NOT NULL
      AND btrim(source_external_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_tv_programs_source_external_id
    ON public.tv_programs(source_id, source_external_id)
    WHERE source_id IS NOT NULL
      AND source_external_id IS NOT NULL
      AND btrim(source_external_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_venues_source_external_id
    ON public.venues(source_id, source_external_id)
    WHERE source_id IS NOT NULL
      AND source_external_id IS NOT NULL
      AND btrim(source_external_id) <> '';

COMMIT;
