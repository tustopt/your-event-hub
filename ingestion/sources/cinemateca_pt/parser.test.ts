import { describe, expect, it } from "vitest";
import { parseProgrammeItems } from "./parser";
import type { CinematecaProgrammeItem } from "./types";

const fixtureItems: CinematecaProgrammeItem[] = [
  {
    sourceExternalId: "cine-opera-2026-09-01-2130-e-la-nave-va",
    sourceUrl: "https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098",
    date: "2026-09-01",
    time: "21:30",
    venue: "Sala M. Félix Ribeiro",
    cycle: "CINE-ÓPERA",
    title: "E LA NAVE VA",
    originalTitle: "E LA NAVE VA",
    director: "Federico Fellini",
    country: "Italy",
    year: 1983,
    durationMinutes: 128,
    subtitles: "Portuguese",
    eventType: "screening",
  },
  {
    sourceExternalId: "cine-opera-2026-09-02-1930-turandot",
    sourceUrl: "https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098",
    date: "2026-09-02",
    time: "19:30",
    venue: "Sala Luís de Pina",
    cycle: "CINE-ÓPERA",
    title: "TURANDOT",
    originalTitle: "TURANDOT",
    director: "Felix Breisach",
    country: "Austria/Germany/Switzerland",
    year: 2015,
    durationMinutes: 123,
    subtitles: "electronically subtitled Portuguese",
    eventType: "screening",
  },
];

describe("Cinemateca parser", () => {
  it("normalizes structured programming items into screening events", () => {
    const result = parseProgrammeItems(
      { sourceKey: "cinemateca_pt", sourceType: "website", raw: "fixture", parsedAt: "2026-09-17T00:00:00Z" },
      fixtureItems,
    );

    expect(result.warnings).toHaveLength(0);
    expect(result.screenings).toHaveLength(2);
    expect(result.events).toHaveLength(2);

    const first = result.screenings[0];
    expect(first.eventType).toBe("screening");
    expect(first.title).toBe("E LA NAVE VA");
    expect(first.startAt).toBe("2026-09-01T21:30");
    expect(first.venue?.name).toBe("Sala M. Félix Ribeiro");
    expect(first.films).toHaveLength(1);
    expect(first.films[0].film.title).toBe("E LA NAVE VA");
    expect(first.films[0].film.originalTitle).toBe("E LA NAVE VA");
    expect(first.films[0].film.year).toBe(1983);
    expect(first.films[0].film.durationMinutes).toBe(128);
    expect(first.films[0].film.people?.[0].name).toBe("Federico Fellini");
    expect(first.films[0].film.people?.[0].role).toBe("director");
    expect(first.films[0].film.countries).toEqual(["Italy"]);
    expect(first.subtitleLanguage).toBe("Portuguese");
    expect(first.cycle).toBe("CINE-ÓPERA");
    expect(first.provenance.sourceExternalId).toBe(
      "cine-opera-2026-09-01-2130-e-la-nave-va",
    );
  });

  it("preserves multiple countries as separate normalized values", () => {
    const result = parseProgrammeItems(
      { sourceKey: "cinemateca_pt", sourceType: "website", raw: "fixture", parsedAt: "2026-09-17T00:00:00Z" },
      [fixtureItems[1]],
    );

    expect(result.screenings[0].films[0].film.countries).toEqual([
      "Austria",
      "Germany",
      "Switzerland",
    ]);
  });

  it("warns when a source item has no usable film title", () => {
    const result = parseProgrammeItems(
      { sourceKey: "cinemateca_pt", sourceType: "website", raw: "fixture", parsedAt: "2026-09-17T00:00:00Z" },
      [{ ...fixtureItems[0], title: "   " }],
    );

    expect(result.screenings).toHaveLength(1);
    expect(result.screenings[0].films).toHaveLength(0);
    expect(result.warnings).toEqual(["Item 1 has no film records."]);
  });
});
