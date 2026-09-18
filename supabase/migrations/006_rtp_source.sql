-- Register RTP as a documentary television ingestion source.
-- Starts inactive so production ingestion is explicitly enabled only after validation.

do $$
begin
  if exists (select 1 from public.sources where parser_key = 'rtp') then
    update public.sources
    set
      name = 'RTP',
      type = 'website',
      url = 'https://www.rtp.pt/',
      country_code = 'PT',
      language_code = 'pt-PT',
      fetch_interval_minutes = 360,
      configuration = jsonb_build_object(
        'timezone', 'Europe/Lisbon',
        'content_scope', 'documentaries'
      )
    where parser_key = 'rtp';
  else
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
      jsonb_build_object(
        'timezone', 'Europe/Lisbon',
        'content_scope', 'documentaries'
      )
    );
  end if;
end
$$;
