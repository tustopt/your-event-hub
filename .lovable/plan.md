# Cinemateca ingestion endpoint (smallest safe integration)

Goal: run the DocuEvents Cinemateca ingestion inside this project, with the parsing/normalizing/entity-resolution logic staying in the GitHub repo. No schema changes, no auth changes, no UI changes, no second backend.

## What exists today

- Routes: only `src/routes/__root.tsx` and `src/routes/index.tsx` (placeholder). No API routes yet.
- Server-side database client with full privileges: `src/integrations/supabase/client.server.ts` (`supabaseAdmin`).
- Cron/job authentication helper already generated: `src/integrations/supabase/cron-auth.ts` (checks `Bearer LOVABLE_CRON_SECRET`, supports rotation).
- `LOVABLE_CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are already configured.
- Note: `src/integrations/supabase/types.ts` is currently empty of tables (stale). It does not affect runtime; regenerating types is optional and only improves type hints.

## Proposed shape

One new endpoint, one thin adapter, zero business logic copied into Lovable.

```text
GitHub tustopt/docuevents  ->  npm/git dependency  ->  src/routes/api/public/ingest/cinemateca.ts
   parser + normalizer                                    auth check (cron secret)
   entity resolution                                      call parser -> screening objects
   runner (as a library fn)                                for each: rpc ingest_screening
```

1. New file: `src/routes/api/public/ingest/cinemateca.ts` — a POST handler.
   - First line of the handler: `authenticateCronRequest(request)`; return its 401/500 response when non-null. This is what makes the public path safe.
   - Then `const { supabaseAdmin } = await import('@/integrations/supabase/client.server')` inside the handler (never at module scope).
   - Accepts an optional JSON body validated with Zod: `{ dryRun?: boolean, limit?: number, from?: string, to?: string }`.
   - Calls the GitHub package's Cinemateca fetch+normalize function to get an array of normalized screening payloads, then for each calls `supabaseAdmin.rpc('ingest_screening', { p_source_key: 'cinemateca', p_screening: screening })`.
   - Returns a summary: `{ fetched, ingested, skipped, errors: [{ sourceExternalId, message }] }`. Per-item failures are collected, not fatal.
   - `dryRun: true` parses and returns counts without any writes — the safe first test.
2. Dependency, not a copy: add `tustopt/docuevents` as a git dependency (`bun add github:tustopt/docuevents#<tag>`), pinned to a tag/commit. GitHub stays source of truth; updating the parser = bump the pin. Only the adapter above lives in Lovable.
3. Daily job: once the endpoint returns clean results, schedule a daily POST to the stable preview/production URL with the `Bearer LOVABLE_CRON_SECRET` header. No extra secret needed.

## Requirements on the GitHub side

The ingestion code must be importable as a library and run in an edge/worker runtime:

- Export a function such as `fetchCinemetacaScreenings(options)` that returns normalized screening objects matching what `ingest_screening()` already expects — no direct database access inside it, and no CLI-only entry point.
- Pure JS/TS using `fetch`; no `child_process`, no Playwright/puppeteer, no native modules, no writing outside `/tmp`. If today's runner shells out or uses a headless browser, that part must be replaced with `fetch` + an HTML parser (e.g. `linkedom`/`cheerio`) before this can run here.
- Publishable as an npm/git-installable package with a valid `exports` entry (buildable/bundleable at build time).

If the repo does not yet meet those points, the smallest bridge is: keep parsing logic in GitHub, add a thin library export there, and this plan proceeds unchanged.

## Explicitly out of scope

No migrations, no changes to `ingest_screening()`, no auth or RLS changes, no UI. Credentials stay server-side; the endpoint never returns data rows, only counts.

## Open question

Does the repo already expose the Cinemateca runner as a callable library function with pure `fetch` networking, or does it currently run as a Node CLI/scraper? That decides whether this is one adapter file or one adapter file plus a small upstream export change.
