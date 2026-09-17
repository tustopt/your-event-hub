import { describe, expect, it } from "vitest";
import { normalizeProgrammeItem } from "./normalizer";

const baseItem = {
  sourceExternalId: "aria-test",
  sourceUrl: "https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098",
  date: "2026-09-10",
  time: "19:00",
  venue: "Sala M. Félix Ribeiro",
  cycle: "CINE-ÓPERA",
  title: "ARIA",
  originalTitle: "ARIA",
  director: "Robert Altman; Bruce Beresford; Bill Bryden",
  country: "Reino Unido, França, Estados Unidos",
  year: 1987,
  durationMinutes: 90,
  subtitles: "legendado eletronicamente em português",
  eventType: "screening" as const,
};

describe("Cinemateca normalizer", () => {
  it("splits semicolon-separated directors into individual people", () => {
    const result = normalizeProgrammeItem(baseItem);
    expect(result.films[0].film.people).toHaveLength(3);
    expect(result.films[0].film.people?.map((person) => person.name)).toEqual([
      "Robert Altman",
      "Bruce Beresford",
      "Bill Bryden",
    ]);
  });

  it("preserves multiple countries as separate values", () => {
    const result = normalizeProgrammeItem(baseItem);
    expect(result.films[0].film.countries).toEqual([
      "Reino Unido",
      "França",
      "Estados Unidos",
    ]);
  });
});
