import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleSourceIngest, type Deps } from "@/routes/api/public/ingest/source.$sourceKey";
import { resolveRunnableSource, SourceResolutionError } from "./run-source-ingestion";
import type { IngestionLibrary, ScreeningLike } from "./source-contract";
import { loadIngestionLibrary } from "./source-library.server";

const SECRET = "test-cron-secret";

function screening(id: string): ScreeningLike {
  return {
    eventType: "screening",
    title: `Screening ${id}`,
    startAt: "2026-09-18T20:00:00",
    provenance: { sourceKey: "cinemateca_pt", sourceExternalId: id },
  };
}

function makeLibrary(
  overrides: {
    status?: string;
    adapterKey?: string | undefined;
    unknown?: boolean;
    noFetcher?: boolean;
    ids?: string[];
    failParseOn?: string[];
  } = {},
): IngestionLibrary {
  const ids = overrides.ids ?? ["a", "b"];
  const adapter = {
    key: "cinemateca_pt",
    sourceType: "website",
    parse: (_input: unknown, item?: unknown) => {
      const id = (item as { id: string }).id;
      if (overrides.failParseOn?.includes(id)) throw new Error(`bad item ${id}`);
      return { screenings: [screening(id)], warnings: [] };
    },
  };

  return {
    getSourceDefinition: (key: string) =>
      overrides.unknown
        ? undefined
        : {
            key,
            name: "Cinemateca Portuguesa",
            status: (overrides.status ?? "production") as never,
            ...("adapterKey" in overrides
              ? overrides.adapterKey === undefined
                ? {}
                : { adapterKey: overrides.adapterKey }
              : { adapterKey: "cinemateca_pt" }),
          },
    createProductionAdapterRegistry: () => new Map([[adapter.key, adapter]]),
    getSourceFetcher: (sourceKey: string) => {
      if (overrides.noFetcher) throw new Error(`No fetcher implemented for source: ${sourceKey}`);
      return {
        sourceKey,
        sourceType: "website",
        fetch: async () => ids.map((id) => ({ id })),
        toParsedItem: () => ({ sourceKey, sourceType: "website" }),
      };
    },
    runSourcePipeline: () => undefined,
  };
}

function post(body?: unknown, auth = `Bearer ${SECRET}`): Request {
  return new Request("http://localhost/api/public/ingest/source/cinemateca_pt", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function deps(library: IngestionLibrary, persist = vi.fn(async () => {})): Deps {
  return { loadLibrary: async () => library, createPersist: async () => persist };
}

beforeEach(() => {
  process.env["LOVABLE_CRON_SECRET"] = SECRET;
});

describe("generic source resolution", () => {
  it("resolves a production source with adapter and fetcher", () => {
    const resolved = resolveRunnableSource(makeLibrary(), "cinemateca_pt");
    expect(resolved).toMatchObject({ sourceKey: "cinemateca_pt", adapterKey: "cinemateca_pt" });
  });

  it("rejects an unknown source", () => {
    expect(() => resolveRunnableSource(makeLibrary({ unknown: true }), "nope")).toThrow(
      SourceResolutionError,
    );
  });

  it("rejects a candidate (non-runnable) source", () => {
    try {
      resolveRunnableSource(makeLibrary({ status: "candidate" }), "doclisboa");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as SourceResolutionError).code).toBe("not_runnable");
    }
  });

  it("rejects a non-production source", () => {
    try {
      resolveRunnableSource(makeLibrary({ status: "registered" }), "cinemateca_pt");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as SourceResolutionError).code).toBe("not_runnable");
    }
  });

  it("rejects a source without an adapter", () => {
    try {
      resolveRunnableSource(makeLibrary({ adapterKey: undefined }), "culturgest");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as SourceResolutionError).code).toBe("no_adapter");
    }
  });
});

describe("generic ingest endpoint", () => {
  it("rejects requests without the cron secret", async () => {
    const persist = vi.fn(async () => {});
    const res = await handleSourceIngest(post({}, ""), "cinemateca_pt", deps(makeLibrary(), persist));
    expect(res.status).toBe(401);
    expect(persist).not.toHaveBeenCalled();
  });

  it("runs a source through the registry and persists each screening", async () => {
    const persist = vi.fn(async () => {});
    const res = await handleSourceIngest(post({}), "cinemateca_pt", deps(makeLibrary(), persist));
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      source: "cinemateca_pt",
      adapterKey: "cinemateca_pt",
      fetched: 2,
      processed: 2,
      persisted: 2,
      failed: 0,
    });
    expect(persist).toHaveBeenCalledTimes(2);
    expect((persist.mock.calls[0] as unknown[])[1]).toBe("cinemateca_pt");
  });

  it("dryRun writes nothing and returns the normalized screenings", async () => {
    const persist = vi.fn(async () => {});
    const res = await handleSourceIngest(
      post({ dryRun: true }),
      "cinemateca_pt",
      deps(makeLibrary({ ids: ["a", "b", "c"] }), persist),
    );
    const body = (await res.json()) as { persisted: number; screenings: ScreeningLike[] };
    expect(body.persisted).toBe(0);
    expect(body.screenings).toHaveLength(3);
    expect(persist).not.toHaveBeenCalled();
  });

  it("isolates per-item parse failures", async () => {
    const persist = vi.fn(async () => {});
    const res = await handleSourceIngest(
      post({}),
      "cinemateca_pt",
      deps(makeLibrary({ ids: ["a", "b", "c"], failParseOn: ["b"] }), persist),
    );
    const body = (await res.json()) as {
      persisted: number;
      failed: number;
      errors: { message: string }[];
    };
    expect(body).toMatchObject({ persisted: 2, failed: 1 });
    expect(body.errors[0]?.message).toBe("bad item b");
  });

  it("honours limit", async () => {
    const res = await handleSourceIngest(
      post({ limit: 2 }),
      "cinemateca_pt",
      deps(makeLibrary({ ids: ["a", "b", "c", "d"] })),
    );
    expect((await res.json()) as { fetched: number }).toMatchObject({ fetched: 2 });
  });

  it("returns 404 for an unknown source and 409 for a candidate source", async () => {
    const unknown = await handleSourceIngest(post({}), "nope", deps(makeLibrary({ unknown: true })));
    expect(unknown.status).toBe(404);
    const candidate = await handleSourceIngest(
      post({}),
      "doclisboa",
      deps(makeLibrary({ status: "candidate" })),
    );
    expect(candidate.status).toBe(409);
  });

  it("rejects an invalid body", async () => {
    const res = await handleSourceIngest(post({ limit: 0 }), "cinemateca_pt", deps(makeLibrary()));
    expect(res.status).toBe(400);
  });
});

describe("authoritative ingestion library", () => {
  it("exposes the registries and resolves the three registered cinema sources", async () => {
    const library = await loadIngestionLibrary();
    for (const key of ["cinemateca_pt", "cinema_sao_jorge", "cinema_fernando_lopes"]) {
      const resolved = resolveRunnableSource(library, key);
      expect(resolved.adapterKey).toBe(key);
    }
  });

  it("keeps Doclisboa a candidate that cannot be ingested", async () => {
    const library = await loadIngestionLibrary();
    expect(library.getSourceDefinition("doclisboa")?.status).toBe("candidate");
    expect(() => resolveRunnableSource(library, "doclisboa")).toThrow(/candidate/);
  });
});
