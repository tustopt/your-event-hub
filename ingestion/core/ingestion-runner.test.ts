import { describe, expect, it } from "vitest";
import type { ParsedSourceItem, SourceAdapter } from "./contracts";
import { createAdapterRegistry } from "./adapter-registry";
import { createIngestionRunner, ingestSource } from "./ingestion-runner";

const adapter: SourceAdapter = {
  key: "test_source",
  sourceType: "website",
  parse: (input) => ({
    events: [],
    screenings: [],
    warnings: [`parsed:${input.externalId ?? "none"}`],
  }),
};

const input: ParsedSourceItem = {
  sourceKey: "test_source",
  sourceType: "website",
  externalId: "item-1",
  raw: "<html />",
  parsedAt: "2026-09-17T12:00:00Z",
};

describe("generic ingestion runner", () => {
  it("runs an adapter without source-specific runner logic", () => {
    const result = ingestSource({ sourceKey: "test_source", input }, createAdapterRegistry([adapter]));
    expect(result.sourceKey).toBe("test_source");
    expect(result.adapterKey).toBe("test_source");
    expect(result.result.warnings).toEqual(["parsed:item-1"]);
  });

  it("rejects a source/input type mismatch", () => {
    const mismatched = { ...input, sourceType: "rss" as const };
    expect(() => ingestSource({ sourceKey: "test_source", input: mismatched }, createAdapterRegistry([adapter]))).toThrow(
      "Source type mismatch for test_source",
    );
  });

  it("can be constructed once and reused for multiple sources", () => {
    const runner = createIngestionRunner([adapter]);
    expect(runner({ sourceKey: "test_source", input }).result.warnings).toEqual(["parsed:item-1"]);
  });
});
