-- Register RTP as a documentary television ingestion source.
-- Starts inactive so production ingestion is explicitly enabled only after validation.

insert into public.sources (
  name,
  parser_key,
  type,
  url,
  country_code,
  language_code,
  active,
  fetch_interval_minutes,
  configuration
)
values (
  'RTP',
  'rtp',
  'website',
  'https://www.rtp.pt/',
  'PT',
  'pt-PT',
  false,
  360,
  jsonb_build_object('timezone', 'Europe/Lisbon', 'content_scope', 'documentaries')
)
on conflict (parser_key) do update
set
  name = excluded.name,
  type = excluded.type,
  url = excluded.url,
  country_code = excluded.country_code,
  language_code = excluded.language_code,
  fetch_interval_minutes = excluded.fetch_interval_minutes,
  configuration = excluded.configuration;

