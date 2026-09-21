BEGIN;

-- Fix festival edition persistence for schemas where start_date/end_date
-- are required. The edition range is derived from all imported sessions
-- for the source and festival year, using Lisbon local dates.

CREATE OR REPLACE FUNCTION public.link_event_festival(
    p_source_key TEXT,
    p_source_external_id TEXT,
    p_festival_key TEXT,
    p_festival_year INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_source_id UUID;
    v_event_id UUID;
    v_festival_id UUID;
    v_edition_id UUID;
    v_source_name TEXT;
    v_source_url TEXT;
    v_country_code TEXT;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    IF NULLIF(BTRIM(p_source_key), '') IS NULL
       OR NULLIF(BTRIM(p_source_external_id), '') IS NULL THEN
        RAISE EXCEPTION 'source key and source external id are required';
    END IF;

    IF NULLIF(BTRIM(p_festival_key), '') IS NULL
       OR p_festival_year IS NULL THEN
        RAISE EXCEPTION 'festival key and festival year are required';
    END IF;

    SELECT id, name, url, country_code
      INTO v_source_id, v_source_name, v_source_url, v_country_code
      FROM public.sources
     WHERE parser_key = p_source_key
     LIMIT 1;

    IF v_source_id IS NULL THEN
        RAISE EXCEPTION 'source not registered: %', p_source_key;
    END IF;

    SELECT id
      INTO v_event_id
      FROM public.events
     WHERE source_id = v_source_id
       AND source_external_id = p_source_external_id
     LIMIT 1;

    IF v_event_id IS NULL THEN
        RAISE EXCEPTION 'event not found for source external id: %', p_source_external_id;
    END IF;

    SELECT id
      INTO v_festival_id
      FROM public.festivals
     WHERE lower(btrim(slug)) = lower(btrim(p_festival_key))
     LIMIT 1;

    IF v_festival_id IS NULL THEN
        INSERT INTO public.festivals (name, slug, website, country_code)
        VALUES (
            COALESCE(NULLIF(BTRIM(v_source_name), ''), BTRIM(p_festival_key)),
            BTRIM(p_festival_key),
            NULLIF(BTRIM(v_source_url), ''),
            NULLIF(BTRIM(v_country_code), '')
        )
        RETURNING id INTO v_festival_id;
    ELSE
        UPDATE public.festivals
           SET name = COALESCE(NULLIF(BTRIM(v_source_name), ''), name),
               website = COALESCE(NULLIF(BTRIM(v_source_url), ''), website),
               country_code = COALESCE(NULLIF(BTRIM(v_country_code), ''), country_code),
               updated_at = now()
         WHERE id = v_festival_id;
    END IF;

    -- Calculate the complete edition date range from all sessions already
    -- imported for this source and festival year.
    SELECT
        MIN((start_at AT TIME ZONE 'Europe/Lisbon')::date),
        MAX((COALESCE(end_at, start_at) AT TIME ZONE 'Europe/Lisbon')::date)
      INTO v_start_date, v_end_date
      FROM public.events
     WHERE source_id = v_source_id
       AND EXTRACT(YEAR FROM (start_at AT TIME ZONE 'Europe/Lisbon')) = p_festival_year;

    IF v_start_date IS NULL OR v_end_date IS NULL THEN
        RAISE EXCEPTION
            'no event dates found for source % and festival year %',
            p_source_key,
            p_festival_year;
    END IF;

    SELECT id
      INTO v_edition_id
      FROM public.festival_editions
     WHERE festival_id = v_festival_id
       AND year = p_festival_year
     LIMIT 1;

    IF v_edition_id IS NULL THEN
        INSERT INTO public.festival_editions (
            festival_id,
            year,
            start_date,
            end_date,
            website
        )
        VALUES (
            v_festival_id,
            p_festival_year,
            v_start_date,
            v_end_date,
            NULLIF(BTRIM(v_source_url), '')
        )
        RETURNING id INTO v_edition_id;
    ELSE
        UPDATE public.festival_editions
           SET start_date = v_start_date,
               end_date = v_end_date,
               website = COALESCE(NULLIF(BTRIM(v_source_url), ''), website),
               updated_at = now()
         WHERE id = v_edition_id;
    END IF;

    UPDATE public.events
       SET festival_id = v_festival_id,
           festival_edition_id = v_edition_id,
           updated_at = now()
     WHERE id = v_event_id;

    RETURN jsonb_build_object(
        'eventId', v_event_id,
        'festivalId', v_festival_id,
        'festivalEditionId', v_edition_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.link_event_festival(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_event_festival(TEXT, TEXT, TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.link_event_festival(TEXT, TEXT, TEXT, INTEGER) TO service_role;

COMMIT;
