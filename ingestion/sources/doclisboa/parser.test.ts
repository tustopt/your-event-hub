import { describe, expect, it } from "vitest";
import type { ParsedSourceItem } from "../../core/contracts";
import { parseProgrammeItems, doclisboaAdapter } from "./parser";

const input: ParsedSourceItem = {
  sourceKey: "doclisboa",
  sourceType: "website",
  sourceUrl: "https://doclisboa.org/",
  externalId: "doclisboa-2026-001",
  raw: "fixture",
  parsedAt: "2026-09-17T20:00:00Z",
};

const item = {
  sourceExternalId: "doclisboa-2026-001",
  sourceUrl: "https://doclisboa.org/",
  editionYear: 2026,
  date: "2026-10-15",
  time: "19:00",
  title: "EXEMPLO DE SESSÃO",
  section: "Competição Nacional",
  venue: "Culturgest",
  venueType: "cultural_center" as const,
};

describe("Doclisboa parser", () => {
  it("returns festival metadata, edition and screening", () => {
    const result = parseProgrammeItems(input, [item]);

    expect(result.warnings).toEqual([]);
    expect(result.festivals).toHaveLength(1);
    expect(result.festivalEditions).toEqual([
      expect.objectContaining({ festivalKey: "doclisboa", year: 2026 }),
    ]);
    expect(result.screenings).toHaveLength(1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      eventType: "screening",
      festivalKey: "doclisboa",
      festivalEditionYear: 2026,
    });
  });

  it("exposes the source adapter with the festival source key", () => {
    expect(doclisboaAdapter.key).toBe("doclisboa");
    expect(doclisboaAdapter.sourceType).toBe("website");
    expect(doclisboaAdapter.parse(input, item).screenings).toHaveLength(1);
  });
});
