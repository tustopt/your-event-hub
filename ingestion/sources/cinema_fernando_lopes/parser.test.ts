import { describe, expect, it } from "vitest";
import type { ParsedSourceItem } from "../../core/contracts";
import { parseProgrammeItems } from "./parser";

const input: ParsedSourceItem = {
  sourceKey: "cinema_fernando_lopes",
  sourceType: "website",
  sourceUrl: "https://cinemafernandolopes.pt/programacao",
  raw: "fixture",
  parsedAt: "2026-09-17T12:00:00Z",
};

describe("Cinema Fernando Lopes parser", () => {
  it("converts source items into screenings and events", () => {
    const result = parseProgrammeItems(input, [
      {
        sourceExternalId: "2026-09-19-1100-tu-que-vives",
        sourceUrl: input.sourceUrl!,
        date: "2026-09-19",
        time: "11:00",
        title: "TU, QUE VIVES",
        festival: "mostra essencial Roy Andersson",
      },
    ]);

    expect(result.warnings).toEqual([]);
    expect(result.screenings).toHaveLength(1);
    expect(result.events).toEqual([
      expect.objectContaining({
        eventType: "screening",
        title: "TU, QUE VIVES",
        startAt: "2026-09-19T11:00",
      }),
    ]);
  });
});
