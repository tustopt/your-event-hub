import { describe, expect, it } from "vitest";
import { normalizeProgrammeItem } from "./normalizer";

const item = {
  sourceExternalId: "2026-09-19-1100-tu-que-vives",
  sourceUrl: "https://cinemafernandolopes.pt/programacao",
  date: "2026-09-19",
  time: "11:00",
  title: "TU, QUE VIVES",
  festival: "mostra essencial Roy Andersson",
  director: "Roy Andersson",
  year: 2007,
  durationMinutes: 94,
};

describe("Cinema Fernando Lopes normalizer", () => {
  it("normalizes venue, film and provenance", () => {
    const result = normalizeProgrammeItem(item);

    expect(result).toMatchObject({
      eventType: "screening",
      title: "TU, QUE VIVES",
      startAt: "2026-09-19T11:00",
      cycle: "mostra essencial Roy Andersson",
      venue: {
        name: "Cinema Fernando Lopes",
        city: "Lisboa",
        postalCode: "1749-024",
      },
      films: [
        {
          position: 1,
          film: {
            title: "TU, QUE VIVES",
            year: 2007,
            durationMinutes: 94,
            people: [{ name: "Roy Andersson", role: "director" }],
          },
        },
      ],
    });

    expect(result.provenance).toEqual({
      sourceKey: "cinema_fernando_lopes",
      sourceExternalId: "2026-09-19-1100-tu-que-vives",
      sourceUrl: "https://cinemafernandolopes.pt/programacao",
    });
  });
});
