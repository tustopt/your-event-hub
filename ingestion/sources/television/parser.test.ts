import { describe, expect, it } from "vitest";
import { parseTelevisionProgrammeItem } from "./parser";

describe("television parser", () => {
  it("returns one normalized TV programme for a documentary", () => {
    const result = parseTelevisionProgrammeItem({} as never, {
      sourceExternalId: "sic-123",
      sourceUrl: "https://example.test/programme/sic-123",
      broadcasterKey: "sic",
      channel: "SIC",
      title: "  Exemplo Documentário  ",
      genre: "Documentário",
      startAt: "2026-09-22T21:00:00+01:00",
      description: "  Descrição  ",
    });

    expect(result.screenings).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.tvPrograms).toHaveLength(1);
    expect(result.tvPrograms[0]).toMatchObject({
      title: "Exemplo Documentário",
      broadcasterKey: "sic",
      channel: "SIC",
      genre: "documentary",
      description: "Descrição",
    });
  });

  it("returns a complete empty result for a non-documentary", () => {
    const result = parseTelevisionProgrammeItem({} as never, {
      sourceExternalId: "sic-124",
      sourceUrl: "https://example.test/programme/sic-124",
      broadcasterKey: "sic",
      channel: "SIC",
      title: "Entretenimento",
      genre: "Entretenimento",
      startAt: "2026-09-22T21:00:00+01:00",
    });

    expect(result).toEqual({
      events: [],
      screenings: [],
      tvPrograms: [],
      warnings: [],
    });
  });
});
