import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleCinematecaIngest } from "@/routes/api/public/ingest/cinemateca";
import { resolveRunnableSource, runSourceIngestion } from "./run-source-ingestion";
import type { IngestionLibrary, ScreeningLike } from "./source-contract";
import { loadIngestionLibrary } from "./source-library.server";

const SECRET = "test-cron-secret";

const CINEMATECA_HTML = `
  <div>01/09/2026, 21h30 | Sala M. Félix Ribeiro</div>
  <div>Ciclo CINE-ÓPERA</div><div>E LA NAVE VA</div><div>O Navio</div>
  <div>de Federico Fellini</div><div>Itália, 1983 - 128 min</div>
  <div>02/09/2026, 19h30 | Sala Luís de Pina</div>
  <div>Ciclo CINE-ÓPERA</div><div>TURANDOT</div>
  <div>de Felix Breisach</div><div>Áustria, 2015 - 123 min</div>`;

const SAO_JORGE_HTML = `
  <html><body>
    <h2>QUEER LISBOA 2026</h2>
    <h2>Word Is Out: Stories of Some of Our Lives</h2>
    <p>QUEER LISBOA 2026</p>
    <p>Sexta-feira, 18 de Setembro às 16:00</p>
    <p>132' minutos</p>
    <h2>The Man I Love | SESSÃO DE ABERTURA</h2>
    <p>QUEER LISBOA 2026</p>
    <p>Sexta-feira, 18 de Setembro às 21:00</p>
    <p>95' minutos</p>
  </body></html>`;

const FERNANDO_LOPES_HTML = `
  <html><body>
    <div>sex, 18 set</div>
    <div>19h00 - CARTAS AMARELAS</div>
    <div>21h30 - HOPE</div>
  </body></html>`;

function fetcherOptions(html: string): Record<string, unknown> {
  return {
    fetchImpl: async () => new Response(html, { status: 200 }),
    url: "https://example.test/programacao",
    now: () => new Date("2026-09-17T12:00:00+01:00"),
  };
}

const CASES = [
  { sourceKey: "cinemateca_pt", html: CINEMATECA_HTML },
  { sourceKey: "cinema_sao_jorge", html: SAO_JORGE_HTML },
  { sourceKey: "cinema_fernando_lopes", html: FERNANDO_LOPES_HTML },
] as const;

let library: IngestionLibrary;

beforeEach(async () => {
  process.env["LOVABLE_CRON_SECRET"] = SECRET;
  library = await loadIngestionLibrary();
});

describe("each production adapter runs through the generic runner", () => {
  for (const { sourceKey, html } of CASES) {
    it(`ingests ${sourceKey}`, async () => {
      const persist = vi.fn(async () => {});
      const resolved = resolveRunnableSource(library, sourceKey, fetcherOptions(html));
      const result = await runSourceIngestion(resolved, persist);

      expect(result.source).toBe(sourceKey);
      expect(result.adapterKey).toBe(sourceKey);
      expect(result.fetched).toBeGreaterThan(0);
      expect(result.processed).toBeGreaterThan(0);
      expect(result.persisted).toBe(result.processed);
      expect(result.failed).toBe(0);
      expect(persist).toHaveBeenCalledTimes(result.processed);

      const [screening, persistedKey] = persist.mock.calls[0] as unknown as [
        ScreeningLike,
        string,
      ];
      expect(persistedKey).toBe(sourceKey);
      expect(screening.provenance?.sourceKey).toBe(sourceKey);
      expect(typeof screening.provenance?.sourceExternalId).toBe("string");
      expect(screening["startAt"]).toBeTruthy();
    });

    it(`does not write in dryRun for ${sourceKey}`, async () => {
      const persist = vi.fn(async () => {});
      const resolved = resolveRunnableSource(library, sourceKey, fetcherOptions(html));
      const result = await runSourceIngestion(resolved, persist, { dryRun: true });

      expect(persist).not.toHaveBeenCalled();
      expect(result.persisted).toBe(0);
      expect(result.screenings?.length).toBe(result.processed);
    });
  }
});

describe("warning and error propagation", () => {
  it("collects adapter warnings and per-item errors without stopping the run", async () => {
    const resolved = resolveRunnableSource(library, "cinemateca_pt", fetcherOptions(CINEMATECA_HTML));
    let call = 0;
    const patched = {
      ...resolved,
      adapter: {
        ...resolved.adapter,
        parse: (input: Parameters<typeof resolved.adapter.parse>[0], item?: unknown) => {
          call += 1;
          if (call === 1) throw new Error("bad item");
          const parsed = resolved.adapter.parse(input, item);
          return { ...parsed, warnings: [...parsed.warnings, "adapter warning"] };
        },
      },
    };

    const persist = vi.fn(async () => {});
    const result = await runSourceIngestion(patched, persist);

    expect(result.failed).toBe(1);
    expect(result.errors[0]?.message).toBe("bad item");
    expect(result.warnings).toContain("adapter warning");
    expect(result.persisted).toBeGreaterThan(0);
  });
});

function stubLibrary(): IngestionLibrary {
  const screening: ScreeningLike = {
    eventType: "screening",
    title: "Stub",
    startAt: "2026-09-18T20:00:00",
    provenance: { sourceKey: "cinemateca_pt", sourceExternalId: "stub-1" },
  };
  return {
    getSourceDefinition: (key: string) =>
      ({ key, name: "Stub", status: "production", adapterKey: "cinemateca_pt" }) as never,
    createProductionAdapterRegistry: () =>
      new Map([
        [
          "cinemateca_pt",
          {
            key: "cinemateca_pt",
            sourceType: "website",
            parse: () => ({ screenings: [screening], warnings: [] }),
          },
        ],
      ]) as never,
    getSourceFetcher: (sourceKey: string) =>
      ({
        sourceKey,
        sourceType: "website",
        fetch: async () => [{ id: "stub-1" }],
        toParsedItem: () => ({ sourceKey, sourceType: "website" }),
      }) as never,
    runSourcePipeline: () => undefined,
  };
}

describe("Cinemateca route stays a thin wrapper", () => {
  it("delegates to the generic handler with the cinemateca_pt source key", async () => {
    const persist = vi.fn(async () => {});
    const request = new Request("http://localhost/api/public/ingest/cinemateca", {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ dryRun: true }),
    });

    const res = await handleCinematecaIngest(request, {
      loadLibrary: async () => stubLibrary(),
      createPersist: async () => persist,
    });
    const body = (await res.json()) as { source: string; persisted: number };

    expect(res.status).toBe(200);
    expect(body.source).toBe("cinemateca_pt");
    expect(body.persisted).toBe(0);
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    const res = await handleCinematecaIngest(
      new Request("http://localhost/api/public/ingest/cinemateca", { method: "POST" }),
    );
    expect(res.status).toBe(401);
  });
});
