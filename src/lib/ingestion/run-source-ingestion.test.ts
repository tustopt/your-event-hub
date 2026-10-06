import { describe, expect, it } from "vitest";

import { runSourceIngestion } from "./run-source-ingestion";

describe("runSourceIngestion image coverage", () => {
  it("reports film and television image coverage", async () => {
    const result = await runSourceIngestion(
      {
        sourceKey: "test",
        adapterKey: "test",
        adapter: {
          key: "test",
          sourceType: "website",
          parse: () => ({
            screenings: [
              {
                films: [
                  { film: { imageUrl: "https://example.com/poster.jpg", provenance: {} } },
                  { film: { provenance: {} } },
                ],
              },
            ],
            tvPrograms: [{ imageUrl: "https://example.com/tv.jpg", provenance: {} }, { imageUrl: undefined, provenance: {} }],
            warnings: [],
          }),
        },
        fetcher: {
          sourceKey: "test",
          sourceType: "website",
          fetch: async () => [{ sourceExternalId: "1" }],
          toParsedItem: () => ({ sourceKey: "test", sourceType: "website" }),
        },
      },
      async () => {},
      async () => {},
    );

    expect(result.imageCoverage).toEqual({ available: 2, missing: 2 });
    expect(result.processed).toBe(3);
    expect(result.persisted).toBe(3);
  });
});
