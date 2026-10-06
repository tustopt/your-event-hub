-- Television programme image persistence
-- Applied to the connected Lovable Cloud database separately.
-- This migration documents the required schema/function contract.

ALTER TABLE public.tv_programs
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- The production ingest_tv_program() function must read:
-- p_program->>'imageUrl'
-- and upsert it into tv_programs.image_url.
