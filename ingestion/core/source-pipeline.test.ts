import { describe, expect, it, vi } from "vitest";
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

  it("merges television results while preserving source identity", async () => {
    const tvAdapter: SourceAdapter = {
      key: "rtp",
      sourceType: "website",
      parse: (input) => ({
        events: [],
        screenings: [],
        tvPrograms: [{
          eventType: "television",
          sourceExternalId: input.externalId ?? "missing",
          sourceUrl: input.sourceUrl ?? "https://example.test",
          title: "Documentário RTP",
          channel: "RTP1",
          broadcasterKey: "rtp",
          startAt: "2026-09-23T20:00:00+01:00",
          genre: "documentary",
          provenance: {
            sourceKey: "rtp",
            sourceExternalId: input.externalId,
            sourceUrl: input.sourceUrl,
          },
        }],
        warnings: [],
      }),
    };
    const tvFetcher: SourceFetcher<{ id: string }> = {
      sourceKey: "rtp",
      sourceType: "website",
      fetch: async () => [{ id: "one" }, { id: "two" }],
      toParsedItem: (item) => ({
        sourceKey: "rtp",
        sourceType: "website",
        externalId: `rtp:${item.id}`,
        sourceUrl: `https://example.test/${item.id}`,
        raw: JSON.stringify(item),
        parsedAt: "2026-09-23T10:00:00Z",
      }),
    };

    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('<meta property="og:image" content="/rtp.jpg">', { status: 200 }),
    );
    const result = await runSourcePipeline(
      tvFetcher,
      createAdapterRegistry([tvAdapter]),
      { imageResolver: { fetchImpl } },
    );

    expect(result.result.tvPrograms?.map((item) => item.sourceExternalId)).toEqual([
      "rtp:one",
      "rtp:two",
    ]);
    expect(result.result.tvPrograms?.map((item) => item.imageUrl)).toEqual([
      "https://example.test/rtp.jpg",
      "https://example.test/rtp.jpg",
    ]);
  });

  it("rejects a fetcher whose source type differs from its adapter", async () => {
    const mismatched = { ...fetcher, sourceType: "rss" as const };
    await expect(
      runSourcePipeline(mismatched, createAdapterRegistry([adapter])),
    ).rejects.toThrow("Fetcher type mismatch for test_source");
  });
});
