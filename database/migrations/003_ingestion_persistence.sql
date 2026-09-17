BEGIN;

-- The existing DocuEvents database already contains the core tables.
-- This migration adds only ingestion support.

CREATE TABLE IF NOT EXISTS public.film_countries (
    film_id UUID NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
    country_name TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position > 0),
    PRIMARY KEY (film_id, country_name),
    UNIQUE (film_id, position)
);

CREATE INDEX IF NOT EXISTS idx_film_countries_country
    ON public.film_countries(country_name);

ALTER TABLE public.film_countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS film_countries_read_authenticated ON public.film_countries;
CREATE POLICY film_countries_read_authenticated
    ON public.film_countries FOR SELECT TO authenticated USING (true);

-- Entity-resolution constraints for columns that actually exist in the
-- current database. tv_programs has no source_external_id in this schema.
CREATE UNIQUE INDEX IF NOT EXISTS uq_films_imdb_id
    ON public.films(imdb_id)
    WHERE imdb_id IS NOT NULL AND btrim(imdb_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_films_tmdb_id
    ON public.films(tmdb_id)
    WHERE tmdb_id IS NOT NULL AND btrim(tmdb_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_films_source_external_id
    ON public.films(source_id, source_external_id)
    WHERE source_id IS NOT NULL AND source_external_id IS NOT NULL
      AND btrim(source_external_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_source_external_id
    ON public.events(source_id, source_external_id)
    WHERE source_id IS NOT NULL AND source_external_id IS NOT NULL
      AND btrim(source_external_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_venues_source_external_id
    ON public.venues(source_id, source_external_id)
    WHERE source_id IS NOT NULL AND source_external_id IS NOT NULL
      AND btrim(source_external_id) <> '';

INSERT INTO public.sources
    (name, url, type, country_code, language_code, active,
     fetch_interval_minutes, parser_key, configuration)
SELECT
    'Cinemateca Portuguesa',
    'https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098',
    'website', 'PT', 'pt-PT', true, 1440, 'cinemateca_pt',
    jsonb_build_object('timezone', 'Europe/Lisbon')
WHERE NOT EXISTS (
    SELECT 1 FROM public.sources WHERE parser_key = 'cinemateca_pt'
);

CREATE OR REPLACE FUNCTION public.ingest_screening(
    p_source_key TEXT,
    p_screening JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_source_id UUID;
    v_event_id UUID;
    v_screening_id UUID;
    v_venue_id UUID;
    v_film_id UUID;
    v_person_id UUID;
    v_film JSONB;
    v_person JSONB;
    v_country TEXT;
    v_source_external_id TEXT;
    v_start_at TIMESTAMPTZ;
    v_end_at TIMESTAMPTZ;
    v_title TEXT;
    v_year INTEGER;
    v_director TEXT;
    v_canonical_key TEXT;
    v_position INTEGER;
BEGIN
    IF NULLIF(BTRIM(p_source_key), '') IS NULL THEN
        RAISE EXCEPTION 'source key is required';
    END IF;

    SELECT id INTO v_source_id
    FROM public.sources
    WHERE parser_key = p_source_key AND active = true
    LIMIT 1;

    IF v_source_id IS NULL THEN
        RAISE EXCEPTION 'active source not registered: %', p_source_key;
    END IF;

    v_source_external_id := NULLIF(BTRIM(p_screening->'provenance'->>'sourceExternalId'), '');
    IF v_source_external_id IS NULL THEN
        RAISE EXCEPTION 'screening sourceExternalId is required';
    END IF;

    v_start_at := (p_screening->>'startAt')::timestamp AT TIME ZONE 'Europe/Lisbon';
    v_end_at := CASE
        WHEN NULLIF(p_screening->>'endAt', '') IS NULL THEN NULL
        ELSE (p_screening->>'endAt')::timestamp AT TIME ZONE 'Europe/Lisbon'
    END;

    IF NULLIF(BTRIM(p_screening->'venue'->>'name'), '') IS NULL THEN
        RAISE EXCEPTION 'venue is required for screening: %', p_screening->>'title';
    END IF;

    SELECT id INTO v_venue_id
    FROM public.venues
    WHERE lower(btrim(name)) = lower(btrim(p_screening->'venue'->>'name'))
      AND lower(coalesce(city, '')) = lower(coalesce(p_screening->'venue'->>'city', ''))
    ORDER BY created_at
    LIMIT 1;

    IF v_venue_id IS NULL THEN
        INSERT INTO public.venues
            (name, type, address, city, postal_code, country_code,
             latitude, longitude, website, source_id, source_external_id)
        VALUES
            (BTRIM(p_screening->'venue'->>'name'),
             COALESCE(NULLIF(BTRIM(p_screening->'venue'->>'type'), ''), 'cinema'),
             NULLIF(BTRIM(p_screening->'venue'->>'address'), ''),
             NULLIF(BTRIM(p_screening->'venue'->>'city'), ''),
             NULLIF(BTRIM(p_screening->'venue'->>'postalCode'), ''),
             COALESCE(NULLIF(BTRIM(p_screening->'venue'->>'countryCode'), ''), 'PT'),
             NULLIF(p_screening->'venue'->>'latitude', '')::NUMERIC,
             NULLIF(p_screening->'venue'->>'longitude', '')::NUMERIC,
             NULLIF(BTRIM(p_screening->'venue'->>'website'), ''),
             v_source_id,
             NULLIF(BTRIM(p_screening->'venue'->'provenance'->>'sourceExternalId'), ''))
        RETURNING id INTO v_venue_id;
    END IF;

    FOR v_film IN
        SELECT value FROM jsonb_array_elements(COALESCE(p_screening->'films', '[]'::jsonb))
    LOOP
        v_film_id := NULL;
        v_title := BTRIM(v_film->'film'->>'title');
        v_year := NULLIF(v_film->'film'->>'year', '')::INTEGER;
        v_director := NULLIF(BTRIM(v_film->'film'->'people'->0->>'name'), '');
        v_canonical_key := NULL;

        IF NULLIF(BTRIM(v_film->'film'->>'imdbId'), '') IS NOT NULL THEN
            SELECT id INTO v_film_id FROM public.films
            WHERE imdb_id = BTRIM(v_film->'film'->>'imdbId') LIMIT 1;
        END IF;

        IF v_film_id IS NULL AND NULLIF(BTRIM(v_film->'film'->>'tmdbId'), '') IS NOT NULL THEN
            SELECT id INTO v_film_id FROM public.films
            WHERE tmdb_id = BTRIM(v_film->'film'->>'tmdbId') LIMIT 1;
        END IF;

        -- Only use title/year/director as a probable deterministic match.
        -- Title/year alone is deliberately not used for automatic merging.
        IF v_film_id IS NULL AND v_title <> '' AND v_year IS NOT NULL AND v_director IS NOT NULL THEN
            v_canonical_key := 'title:' || lower(regexp_replace(v_title, '[^a-zA-Z0-9]+', ' ', 'g'))
                || '|year:' || v_year
                || '|director:' || lower(regexp_replace(v_director, '[^a-zA-Z0-9]+', ' ', 'g'));
            SELECT id INTO v_film_id FROM public.films
            WHERE canonical_key = v_canonical_key LIMIT 1;
        END IF;

        IF v_film_id IS NULL THEN
            INSERT INTO public.films
                (title, original_title, year, duration_minutes, synopsis,
                 imdb_id, tmdb_id, canonical_key, source_id, source_external_id)
            VALUES
                (v_title,
                 NULLIF(BTRIM(v_film->'film'->>'originalTitle'), ''),
                 v_year,
                 NULLIF(v_film->'film'->>'durationMinutes', '')::INTEGER,
                 NULLIF(BTRIM(v_film->'film'->>'synopsis'), ''),
                 NULLIF(BTRIM(v_film->'film'->>'imdbId'), ''),
                 NULLIF(BTRIM(v_film->'film'->>'tmdbId'), ''),
                 v_canonical_key,
                 v_source_id,
                 NULL)
            RETURNING id INTO v_film_id;
        ELSE
            UPDATE public.films SET
                title = COALESCE(NULLIF(v_title, ''), title),
                original_title = COALESCE(NULLIF(BTRIM(v_film->'film'->>'originalTitle'), ''), original_title),
                year = COALESCE(v_year, year),
                duration_minutes = COALESCE(NULLIF(v_film->'film'->>'durationMinutes', '')::INTEGER, duration_minutes),
                synopsis = COALESCE(NULLIF(BTRIM(v_film->'film'->>'synopsis'), ''), synopsis),
                imdb_id = COALESCE(NULLIF(BTRIM(v_film->'film'->>'imdbId'), ''), imdb_id),
                tmdb_id = COALESCE(NULLIF(BTRIM(v_film->'film'->>'tmdbId'), ''), tmdb_id),
                canonical_key = COALESCE(v_canonical_key, canonical_key),
                updated_at = now()
            WHERE id = v_film_id;
        END IF;

        DELETE FROM public.film_countries WHERE film_id = v_film_id;
        v_position := 0;
        FOR v_country IN
            SELECT jsonb_array_elements_text(COALESCE(v_film->'film'->'countries', '[]'::jsonb))
        LOOP
            IF NULLIF(BTRIM(v_country), '') IS NOT NULL THEN
                v_position := v_position + 1;
                INSERT INTO public.film_countries(film_id, country_name, position)
                VALUES(v_film_id, BTRIM(v_country), v_position)
                ON CONFLICT(film_id, country_name) DO UPDATE SET position = EXCLUDED.position;
            END IF;
        END LOOP;

        FOR v_person IN
            SELECT value FROM jsonb_array_elements(COALESCE(v_film->'film'->'people', '[]'::jsonb))
        LOOP
            IF NULLIF(BTRIM(v_person->>'name'), '') IS NULL THEN CONTINUE; END IF;

            SELECT id INTO v_person_id FROM public.people
            WHERE lower(btrim(name)) = lower(btrim(v_person->>'name'))
            ORDER BY id LIMIT 1;

            IF v_person_id IS NULL THEN
                INSERT INTO public.people(name)
                VALUES(BTRIM(v_person->>'name'))
                RETURNING id INTO v_person_id;
            END IF;

            INSERT INTO public.film_people(film_id, person_id, role)
            VALUES(v_film_id, v_person_id, COALESCE(v_person->>'role', 'other'))
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    SELECT id INTO v_event_id FROM public.events
    WHERE source_id = v_source_id AND source_external_id = v_source_external_id
    LIMIT 1;

    IF v_event_id IS NULL THEN
        INSERT INTO public.events
            (type, title, start_at, end_at, venue_id, source_id,
             source_external_id, source_url, status)
        VALUES
            ('screening', BTRIM(p_screening->>'title'), v_start_at, v_end_at,
             v_venue_id, v_source_id, v_source_external_id,
             NULLIF(BTRIM(p_screening->'provenance'->>'sourceUrl'), ''), 'scheduled')
        RETURNING id INTO v_event_id;
    ELSE
        UPDATE public.events SET
            title = BTRIM(p_screening->>'title'),
            start_at = v_start_at,
            end_at = v_end_at,
            venue_id = v_venue_id,
            source_url = NULLIF(BTRIM(p_screening->'provenance'->>'sourceUrl'), ''),
            status = 'scheduled',
            updated_at = now()
        WHERE id = v_event_id;
    END IF;

    SELECT id INTO v_screening_id FROM public.screenings
    WHERE event_id = v_event_id LIMIT 1;

    IF v_screening_id IS NULL THEN
        INSERT INTO public.screenings
            (event_id, venue_id, start_at, end_at, ticket_url, price,
             currency, language, subtitle_language, format)
        VALUES
            (v_event_id, v_venue_id, v_start_at, v_end_at,
             NULLIF(BTRIM(p_screening->>'ticketUrl'), ''),
             NULLIF(p_screening->>'price', '')::NUMERIC,
             COALESCE(NULLIF(BTRIM(p_screening->>'currency'), ''), 'EUR'),
             NULLIF(BTRIM(p_screening->>'language'), ''),
             NULLIF(BTRIM(p_screening->>'subtitleLanguage'), ''),
             NULLIF(BTRIM(p_screening->>'format'), ''))
        RETURNING id INTO v_screening_id;
    ELSE
        UPDATE public.screenings SET
            venue_id = v_venue_id,
            start_at = v_start_at,
            end_at = v_end_at,
            ticket_url = NULLIF(BTRIM(p_screening->>'ticketUrl'), ''),
            price = NULLIF(p_screening->>'price', '')::NUMERIC,
            currency = COALESCE(NULLIF(BTRIM(p_screening->>'currency'), ''), 'EUR'),
            language = NULLIF(BTRIM(p_screening->>'language'), ''),
            subtitle_language = NULLIF(BTRIM(p_screening->>'subtitleLanguage'), ''),
            format = NULLIF(BTRIM(p_screening->>'format'), ''),
            updated_at = now()
        WHERE id = v_screening_id;
    END IF;

    DELETE FROM public.screening_films WHERE screening_id = v_screening_id;
    v_position := 0;

    -- Resolve the same film identity used during the film upsert. Do not
    -- fall back to title/year alone: duplicate titles are possible.
    FOR v_film IN
        SELECT value FROM jsonb_array_elements(COALESCE(p_screening->'films', '[]'::jsonb))
    LOOP
        v_position := v_position + 1;
        v_title := BTRIM(v_film->'film'->>'title');
        v_year := NULLIF(v_film->'film'->>'year', '')::INTEGER;
        v_director := NULLIF(BTRIM(v_film->'film'->'people'->0->>'name'), '');
        v_film_id := NULL;

        IF NULLIF(BTRIM(v_film->'film'->>'imdbId'), '') IS NOT NULL THEN
            SELECT id INTO v_film_id FROM public.films
            WHERE imdb_id = BTRIM(v_film->'film'->>'imdbId') LIMIT 1;
        END IF;

        IF v_film_id IS NULL AND NULLIF(BTRIM(v_film->'film'->>'tmdbId'), '') IS NOT NULL THEN
            SELECT id INTO v_film_id FROM public.films
            WHERE tmdb_id = BTRIM(v_film->'film'->>'tmdbId') LIMIT 1;
        END IF;

        IF v_film_id IS NULL AND v_title <> '' AND v_year IS NOT NULL AND v_director IS NOT NULL THEN
            v_canonical_key := 'title:' || lower(regexp_replace(v_title, '[^a-zA-Z0-9]+', ' ', 'g'))
                || '|year:' || v_year
                || '|director:' || lower(regexp_replace(v_director, '[^a-zA-Z0-9]+', ' ', 'g'));
            SELECT id INTO v_film_id FROM public.films
            WHERE canonical_key = v_canonical_key LIMIT 1;
        END IF;

        IF v_film_id IS NULL THEN
            RAISE EXCEPTION 'film could not be resolved: %', v_title;
        END IF;

        INSERT INTO public.screening_films(screening_id, film_id, position)
        VALUES(v_screening_id, v_film_id, v_position);
    END LOOP;

    RETURN jsonb_build_object('eventId', v_event_id, 'screeningId', v_screening_id);
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_screening(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ingest_screening(TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_screening(TEXT, JSONB) TO service_role;

COMMIT;
