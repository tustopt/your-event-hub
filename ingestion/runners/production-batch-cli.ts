const appUrl = process.env.DOCUEVENTS_APP_URL?.replace(/\/$/, "");
const token = process.env.DOCUEVENTS_INGEST_AUTOMATION_TOKEN;

if (!appUrl) throw new Error("DOCUEVENTS_APP_URL is required.");
if (!token) throw new Error("DOCUEVENTS_INGEST_AUTOMATION_TOKEN is required.");

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const sourcesArg = process.argv.find((arg) => arg.startsWith("--sources="));

const body: Record<string, unknown> = {};
if (dryRun) body.dryRun = true;
if (limitArg) body.limit = Number.parseInt(limitArg.slice("--limit=".length), 10);
if (sourcesArg) {
  body.sources = sourcesArg
    .slice("--sources=".length)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const response = await fetch(`${appUrl}/api/public/ingest/production`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await response.text();
let payload: unknown;
try {
  payload = JSON.parse(text);
} catch {
  payload = { raw: text };
}

console.log(JSON.stringify(payload, null, 2));

if (!response.ok && response.status !== 207) {
  process.exitCode = 1;
}
