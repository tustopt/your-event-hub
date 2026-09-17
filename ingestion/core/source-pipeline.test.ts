import { describe, expect, it } from "vitest";
import type { ParsedSourceItem, SourceAdapter } from "./contracts";
import { createAdapterRegistry } from "./adapter-registry";
import { runSourcePipeline, type SourceFetcher } from "./source-pipeline";

const adapter: SourceAdapter = {
  key: "test_source",
  sourceType: "website",
  parse: (input: ParsedSourceItem) => ({
    events: [],
    screenings: [],
    warnings: [`parsed:${input.externalId}`],
  }),
};

const fetcher: SourceFetcher<string> = {
  sourceKey: "test_source",
  sourceType: "website",
  fetch: async () => ["one", "two"],
  toParsedItem: (raw) => ({
    sourceKey: "test_source",
    sourceType: "website",
    externalId: raw,
    raw,
    parsedAt: "2026-09-17T12:00:00Z",
  }),
};

describe("source pipeline", () => {
  it("keeps fetch and parse separate and aggregates adapter results", async () => {
    const result = await runSourcePipeline(fetcher, createAdapterRegistry([adapter]));
    expect(result.fetched).toBe(2);
    expect(result.parsed).toBe(2);
    expect(result.result.warnings).toEqual(["parsed:one", "parsed:two"]);
  });

  it("supports dry-run without invoking persistence", async () => {
    const result = await runSourcePipeline(
      fetcher,
      createAdapterRegistry([adapter]),
      { dryRun: true },
    );
    expect(result.fetched).toBe(2);
    expect(result.result.warnings).toHaveLength(2);
  });

  it("rejects a fetcher whose source type differs from its adapter", async () => {
    const mismatched = { ...fetcher, sourceType: "rss" as const };
    await expect(
      runSourcePipeline(mismatched, createAdapterRegistry([adapter])),
    ).rejects.toThrow("Fetcher type mismatch for test_source");
  });
});
