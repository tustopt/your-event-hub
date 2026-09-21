BEGIN;

-- Generic television programme promotional image.
-- The field is broadcaster-neutral and can be populated by RTP, SIC, TVI,
-- CNN Portugal or any future television source.
ALTER TABLE public.tv_programs
    ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE OR REPLACE FUNCTION public.ingest_tv_program(
    p_source_key TEXT,
    p_program JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_source_id UUID;
    v_id UUID;
    v_external_id TEXT;
    v_title TEXT;
    v_channel TEXT;
    v_start_at TIMESTAMPTZ;
    v_end_at TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_source_id
      FROM public.sources
     WHERE parser_key = p_source_key
       AND active = true
     LIMIT 1;

    IF v_source_id IS NULL THEN
        RAISE EXCEPTION 'Source is not active for ingestion: %', p_source_key;
    END IF;

    v_external_id := NULLIF(p_program->>'sourceExternalId', '');
    v_title := NULLIF(p_program->>'title', '');
    v_channel := NULLIF(p_program->>'channel', '');
    v_start_at := (p_program->>'startAt')::TIMESTAMPTZ;
    v_end_at := CASE
        WHEN NULLIF(p_program->>'endAt', '') IS NULL THEN NULL
        ELSE (p_program->>'endAt')::TIMESTAMPTZ
    END;

    IF v_external_id IS NULL THEN RAISE EXCEPTION 'TV programme sourceExternalId is required'; END IF;
    IF v_title IS NULL THEN RAISE EXCEPTION 'TV programme title is required'; END IF;
    IF v_channel IS NULL THEN RAISE EXCEPTION 'TV programme channel is required'; END IF;
    IF v_start_at IS NULL THEN RAISE EXCEPTION 'TV programme startAt is required'; END IF;

    INSERT INTO public.tv_programs (
        film_id, channel_id, title, description, start_at, end_at,
        source_id, source_url, source_external_id, series_title, episode_title,
        season, episode, year, genre, image_url
    )
    VALUES (
        NULL, NULL, v_title,
        NULLIF(p_program->>'description', ''),
        v_start_at, v_end_at, v_source_id,
        NULLIF(p_program->>'sourceUrl', ''),
        v_external_id,
        NULLIF(p_program->>'seriesTitle', ''),
        NULLIF(p_program->>'episodeTitle', ''),
        NULLIF(p_program->>'season', '')::INTEGER,
        NULLIF(p_program->>'episode', '')::INTEGER,
        NULLIF(p_program->>'year', '')::INTEGER,
        NULLIF(p_program->>'genre', ''),
        NULLIF(p_program->>'imageUrl', '')
    )
    ON CONFLICT (source_id, source_external_id)
    DO UPDATE SET
        film_id = excluded.film_id,
        title = excluded.title,
        description = excluded.description,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        source_url = excluded.source_url,
        series_title = excluded.series_title,
        episode_title = excluded.episode_title,
        season = excluded.season,
        episode = excluded.episode,
        year = excluded.year,
        genre = excluded.genre,
        image_url = excluded.image_url,
        updated_at = now();

    SELECT id INTO v_id
      FROM public.tv_programs
     WHERE source_id = v_source_id
       AND source_external_id = v_external_id;

    RETURN jsonb_build_object(
        'id', v_id,
        'sourceKey', p_source_key,
        'sourceExternalId', v_external_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_tv_program(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ingest_tv_program(TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_tv_program(TEXT, JSONB) TO service_role;

COMMIT;
