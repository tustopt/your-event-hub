-- Television ingestion persistence contract
-- Applied to the connected production database separately.

-- RTP is an enabled production source.
UPDATE public.sources
SET active = true,
    last_error_at = NULL,
    last_error = NULL,
    updated_at = now()
WHERE parser_key = 'rtp';

-- The ingest function uses ON CONFLICT(source_id, source_external_id),
-- so the unique index must be a normal unique index rather than a partial one.
DROP INDEX IF EXISTS public.uq_tv_programs_source_external_id;
CREATE UNIQUE INDEX uq_tv_programs_source_external_id
  ON public.tv_programs (source_id, source_external_id);

-- Keep the production RPC aligned with the television schema: resolve the
-- required channel_id from tv_channels and accept source identity at the
-- top level of the normalized TV payload.

CREATE OR REPLACE FUNCTION public.ingest_tv_program(p_source_key text, p_program jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_source_id uuid;
  v_id uuid;
  v_external_id text;
  v_title text;
  v_channel_id uuid;
  v_channel text;
  v_start_at timestamptz;
  v_end_at timestamptz;
begin
  select id into v_source_id
  from public.sources
  where parser_key = p_source_key
    and active = true
  limit 1;

  if v_source_id is null then
    raise exception 'Source is not active for ingestion: %', p_source_key;
  end if;

  v_external_id := nullif(p_program->>'sourceExternalId', '');
  v_title := nullif(p_program->>'title', '');
  v_channel := nullif(p_program->>'channel', '');
  v_start_at := (p_program->>'startAt')::timestamptz;
  v_end_at := case
    when nullif(p_program->>'endAt', '') is null then null
    else (p_program->>'endAt')::timestamptz
  end;

  if v_external_id is null then raise exception 'TV programme sourceExternalId is required'; end if;
  if v_title is null then raise exception 'TV programme title is required'; end if;
  if v_channel is null then raise exception 'TV programme channel is required'; end if;
  if v_start_at is null then raise exception 'TV programme startAt is required'; end if;

  select id into v_channel_id
  from public.tv_channels
  where lower(btrim(name)) = lower(btrim(v_channel))
    and country_code = 'PT'
  order by created_at
  limit 1;

  if v_channel_id is null then
    insert into public.tv_channels (name, country_code)
    values (v_channel, 'PT')
    returning id into v_channel_id;
  end if;

  insert into public.tv_programs (
    film_id, channel_id, title, description, start_at, end_at,
    source_id, source_url, source_external_id, series_title, episode_title,
    season, episode, year, genre, image_url
  )
  values (
    null, v_channel_id, v_title,
    nullif(p_program->>'description', ''),
    v_start_at, v_end_at, v_source_id,
    nullif(p_program->>'sourceUrl', ''),
    v_external_id,
    nullif(p_program->>'seriesTitle', ''),
    nullif(p_program->>'episodeTitle', ''),
    nullif(p_program->>'season', '')::integer,
    nullif(p_program->>'episode', '')::integer,
    nullif(p_program->>'year', '')::integer,
    nullif(p_program->>'genre', ''),
    nullif(p_program->>'imageUrl', '')
  )
  on conflict (source_id, source_external_id)
  do update set
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

  select id into v_id
  from public.tv_programs
  where source_id = v_source_id
    and source_external_id = v_external_id;

  return jsonb_build_object(
    'id', v_id,
    'sourceKey', p_source_key,
    'sourceExternalId', v_external_id
  );
end;
$function$

