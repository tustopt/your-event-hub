-- Television documentary persistence
-- Extends the existing public.tv_programs table; does not recreate it.

alter table public.tv_programs
  add column if not exists source_external_id text;

create unique index if not exists uq_tv_programs_source_external_id
  on public.tv_programs(source_id, source_external_id)
  where source_external_id is not null;

create index if not exists ix_tv_programs_start_at
  on public.tv_programs(start_at);

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
    and status = 'production'
  limit 1;

  if v_source_id is null then
    raise exception 'Source is not registered for production: %', p_source_key;
  end if;

  v_external_id := nullif(p_program->>'sourceExternalId', '');
  v_title := nullif(p_program->>'title', '');
  v_channel := nullif(p_program->>'channel', '');
  v_start_at := (p_program->>'startAt')::timestamptz;
  v_end_at := case when nullif(p_program->>'endAt','') is null then null else (p_program->>'endAt')::timestamptz end;

  if v_external_id is null then raise exception 'TV programme sourceExternalId is required'; end if;
  if v_title is null then raise exception 'TV programme title is required'; end if;
  if v_channel is null then raise exception 'TV programme channel is required'; end if;
  if v_start_at is null then raise exception 'TV programme startAt is required'; end if;


  insert into public.tv_programs (
    film_id, channel_id, title, description, start_at, end_at,
    source_id, source_url, source_external_id
  )
  values (
    null,
    null,
    v_title,
    nullif(p_program->>'description',''),
    v_start_at,
    v_end_at,
    v_source_id,
    nullif(p_program->>'sourceUrl',''),
    v_external_id
  )
  on conflict (source_id, source_external_id)
  do update set
    film_id = excluded.film_id,
    title = excluded.title,
    description = excluded.description,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    source_url = excluded.source_url;

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
