import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CinematecaSource, NormalizedScreening } from "./contract";
import { handleCinematecaIngest, type Deps } from "@/routes/api/public/ingest/cinemateca";

const SECRET = "test-cron-secret";

function screening(id: string): NormalizedScreening {
  return {
    title: `Screening ${id}`,
    startAt: "2026-09-18T20:00:00",
    venue: { name: "Cinemateca Portuguesa", city: "Lisboa" },
    films: [],
    provenance: { sourceExternalId: id, sourceUrl: "https://www.cinemateca.pt/" },
  };
}

function makeSource(ids: string[], failOn: string[] = []): CinematecaSource {
  return {
    fetchCinematecaScreenings: vi.fn(async () => ids.map((id) => ({ id }))),
    normalizeCinematecaScreening: (raw) => {
      const id = (raw as { id: string }).id;
      if (failOn.includes(id)) throw new Error(`bad item ${id}`);
      return screening(id);
    },
  };
}

function post(body?: unknown, auth = `Bearer ${SECRET}`): Request {
  return new Request("http://localhost/api/public/ingest/cinemateca", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  process.env["LOVABLE_CRON_SECRET"] = SECRET;
});

describe("cinemateca ingest endpoint", () => {
  it("rejects requests without the cron secret", async () => {
    const persist = vi.fn();
    const deps: Deps = {
      loadSource: async () => makeSource(["a"]),
      createPersist: async () => persist,
    };
    const res = await handleCinematecaIngest(post({}, ""), deps);
    expect(res.status).toBe(401);
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects a wrong cron secret", async () => {
    const res = await handleCinematecaIngest(post({}, "Bearer nope"), {
      loadSource: async () => makeSource(["a"]),
      createPersist: async () => vi.fn(async () => {}),
    });
    expect(res.status).toBe(401);
  });

  it("dryRun returns normalized screenings and writes nothing", async () => {
    const persist = vi.fn();
    const res = await handleCinematecaIngest(post({ dryRun: true }), {
      loadSource: async () => makeSource(["a", "b", "c", "d"]),
      createPersist: async () => persist,
    });
    const body = (await res.json()) as {
      dryRun: boolean;
      fetched: number;
      persisted: number;
      screenings: NormalizedScreening[];
      source: string;
    };
    expect(res.status).toBe(200);
    expect(body.source).toBe("cinemateca_pt");
    expect(body.dryRun).toBe(true);
    expect(body.fetched).toBe(4);
    expect(body.persisted).toBe(0);
    expect(body.screenings).toHaveLength(4);
    expect(persist).not.toHaveBeenCalled();
  });

  it("persists each screening once when not a dry run", async () => {
    const persist = vi.fn(async () => {});
    const res = await handleCinematecaIngest(post({}), {
      loadSource: async () => makeSource(["a", "b"]),
      createPersist: async () => persist,
    });
    const body = (await res.json()) as { persisted: number; failed: number };
    expect(body).toMatchObject({ persisted: 2, failed: 0 });
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("continues after a per-item persistence failure", async () => {
    const persist = vi.fn(async (s: NormalizedScreening) => {
      if (s.provenance.sourceExternalId === "b") throw new Error("rpc exploded");
    });
    const res = await handleCinematecaIngest(post({}), {
      loadSource: async () => makeSource(["a", "b", "c"]),
      createPersist: async () => persist,
    });
    const body = (await res.json()) as {
      processed: number;
      persisted: number;
      failed: number;
      errors: { sourceExternalId: string | null; message: string }[];
    };
    expect(persist).toHaveBeenCalledTimes(3);
    expect(body).toMatchObject({ processed: 3, persisted: 2, failed: 1 });
    expect(body.errors[0]).toMatchObject({ sourceExternalId: "b", message: "rpc exploded" });
  });

  it("continues after a normalization failure", async () => {
    const persist = vi.fn(async () => {});
    const res = await handleCinematecaIngest(post({}), {
      loadSource: async () => makeSource(["a", "b"], ["a"]),
      createPersist: async () => persist,
    });
    const body = (await res.json()) as { persisted: number; failed: number };
    expect(body).toMatchObject({ persisted: 1, failed: 1 });
  });

  it("honours limit", async () => {
    const persist = vi.fn(async () => {});
    const res = await handleCinematecaIngest(post({ limit: 2 }), {
      loadSource: async () => makeSource(["a", "b", "c", "d"]),
      createPersist: async () => persist,
    });
    const body = (await res.json()) as { fetched: number; persisted: number };
    expect(body).toMatchObject({ fetched: 2, persisted: 2 });
  });

  it("rejects an invalid body", async () => {
    const res = await handleCinematecaIngest(post({ limit: -1 }), {
      loadSource: async () => makeSource(["a"]),
      createPersist: async () => vi.fn(async () => {}),
    });
    expect(res.status).toBe(400);
  });

  it("loads the DocuEvents ingestion library from the repository", async () => {
    const { loadCinematecaSource } = await import("./cinemateca-source.server");
    const source = await loadCinematecaSource();
    expect(typeof source.fetchCinematecaScreenings).toBe("function");
    expect(typeof source.normalizeCinematecaScreening).toBe("function");
  });

  it("returns 501 when no parser can be loaded", async () => {
    const res = await handleCinematecaIngest(post({ dryRun: true }), {
      loadSource: async () => {
        throw new Error("Cinemateca parser not available (tustopt/docuevents)");
      },
      createPersist: async () => vi.fn(async () => {}),
    });
    expect(res.status).toBe(501);
    expect(((await res.json()) as { error: string }).error).toContain("tustopt/docuevents");
  });
});
