import { describe, expect, it } from "vitest";
import { getSourceFetcher, sourceFetcherFactories } from "./source-fetchers";

describe("source fetcher registry", () => {
  it("registers every implemented production source", () => {
    expect(Object.keys(sourceFetcherFactories).sort()).toEqual([
      "cinema_fernando_lopes",
      "cinema_sao_jorge",
      "cinemateca_pt",
      "doclisboa",
      "rtp",
      "sic",
      "tvi",
    ]);
  });

  it.each([
    ["rtp", "website"],
    ["sic", "website"],
    ["tvi", "website"],
  ])("creates the %s television fetcher with the correct source type", (sourceKey, sourceType) => {
    const fetcher = getSourceFetcher(sourceKey);
    expect(fetcher.sourceKey).toBe(sourceKey);
    expect(fetcher.sourceType).toBe(sourceType);
    expect(typeof fetcher.fetch).toBe("function");
    expect(typeof fetcher.toParsedItem).toBe("function");
  });

  it("preserves television source identity when converting a fetched item", () => {
    const fetcher = getSourceFetcher("rtp");
    const parsed = fetcher.toParsedItem({
      sourceExternalId: "rtp:RTP1:2026-09-23T20:00:00Z:doc-1",
      sourceUrl: "https://www.rtp.pt/play/direto/rtp1",
      title: "Documentário",
    });

    expect(parsed).toMatchObject({
      sourceKey: "rtp",
      sourceType: "website",
      externalId: "rtp:RTP1:2026-09-23T20:00:00Z:doc-1",
      sourceUrl: "https://www.rtp.pt/play/direto/rtp1",
      raw: expect.any(String),
    });
  });
});
