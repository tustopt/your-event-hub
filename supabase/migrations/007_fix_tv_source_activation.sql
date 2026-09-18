-- Correct television ingestion persistence for the existing sources schema.
-- The sources table uses active=true, not a production status column.

create or replace function public.ingest_tv_program(
  p_source_key text,
  p_program jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_id uuid;
  v_id uuid;
  v_external_id text;
  v_title text;
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

  if v_external_id is null then
    raise exception 'TV programme sourceExternalId is required';
  end if;
  if v_title is null then
    raise exception 'TV programme title is required';
  end if;
  if v_channel is null then
    raise exception 'TV programme channel is required';
  end if;
  if v_start_at is null then
    raise exception 'TV programme startAt is required';
  end if;

  insert into public.tv_programs (
    film_id, channel_id, title, description, start_at, end_at,
    source_id, source_url, source_external_id, series_title, episode_title,
    season, episode, year, genre
  )
  values (
    null,
    null,
    v_title,
    nullif(p_program->>'description', ''),
    v_start_at,
    v_end_at,
    v_source_id,
    nullif(p_program->>'sourceUrl', ''),
    v_external_id,
    nullif(p_program->>'seriesTitle', ''),
    nullif(p_program->>'episodeTitle', ''),
    nullif(p_program->>'season', '')::integer,
    nullif(p_program->>'episode', '')::integer,
    nullif(p_program->>'year', '')::integer,
    nullif(p_program->>'genre', '')
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
    genre = excluded.genre;

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
$$;

revoke all on function public.ingest_tv_program(text, jsonb) from public;
grant execute on function public.ingest_tv_program(text, jsonb) to service_role;
