import { describe, expect, it } from "vitest";
import { normalizeProgrammeItem } from "./normalizer";

const item = {
  sourceExternalId: "2026-09-18-1600-word-is-out",
  sourceUrl: "https://cinemasaojorge.pt/evento/queer-lisboa-2026/",
  date: "2026-09-18",
  time: "16:00",
  title: "Word Is Out: Stories of Some of Our Lives",
  festival: "QUEER LISBOA 2026",
  durationMinutes: 132,
  venue: "Sala Manoel de Oliveira",
  director: "Peter Adair, Nancy Adair, Rob Epstein, Lucy Massie",
  year: 1977,
  country: "Estados Unidos",
  eventType: "screening" as const,
};

describe("Cinema São Jorge normalizer", () => {
  it("normalizes a screening and preserves venue/festival provenance", () => {
    const result = normalizeProgrammeItem(item);

    expect(result.startAt).toBe("2026-09-18T16:00");
    expect(result.venue?.name).toBe("Sala Manoel de Oliveira");
    expect(result.cycle).toBe("QUEER LISBOA 2026");
    expect(result.provenance.sourceKey).toBe("cinema_sao_jorge");
    expect(result.films[0].film.durationMinutes).toBe(132);
  });

  it("splits multiple directors", () => {
    const result = normalizeProgrammeItem(item);
    expect(result.films[0].film.people?.map((person) => person.name)).toEqual([
      "Peter Adair",
      "Nancy Adair",
      "Rob Epstein",
      "Lucy Massie",
    ]);
  });
});
