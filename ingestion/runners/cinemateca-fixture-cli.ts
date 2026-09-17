import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { ingestCinematecaFixture, type CinematecaFixture } from "./fixture-runner";
import { SupabaseIngestionPersistence } from "../core/supabase-persistence";

const fixturePath = new URL(
  "../sources/cinemateca_pt/fixtures/september-2026-programming.json",
  import.meta.url,
);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main(): Promise<void> {
  const fixture = JSON.parse(
    await readFile(fixturePath, "utf8"),
  ) as CinematecaFixture;

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const persistence = new SupabaseIngestionPersistence(client);
  const result = await ingestCinematecaFixture(fixture, persistence);

  console.log(JSON.stringify(result, null, 2));

  if (result.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
