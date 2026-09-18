import { describe, expect, it } from "vitest";
import {
  normalizeFestival,
  normalizeFestivalEdition,
  normalizeProgrammeItem,
} from "./normalizer";

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
  language: "Português",
  subtitleLanguage: "Inglês",
  format: "DCP",
  durationMinutes: 92,
  director: "Realizador Exemplo",
  country: "Portugal",
  year: 2026,
  films: [{ title: "EXEMPLO DE SESSÃO", year: 2026, director: "Realizador Exemplo", country: "Portugal", durationMinutes: 92 }],
};

describe("Doclisboa normalizer", () => {
  it("normalizes festival and edition independently of the venue", () => {
    expect(normalizeFestival()).toMatchObject({
      key: "doclisboa",
      name: "Doclisboa",
      countryCode: "PT",
    });

    expect(normalizeFestivalEdition(2026)).toMatchObject({
      festivalKey: "doclisboa",
      year: 2026,
    });

    const result = normalizeProgrammeItem(item);

    expect(result).toMatchObject({
      eventType: "screening",
      title: "EXEMPLO DE SESSÃO",
      startAt: "2026-10-15T19:00:00+01:00",
      festivalKey: "doclisboa",
      festivalEditionYear: 2026,
      cycle: "Competição Nacional",
      venue: {
        name: "Culturgest",
        type: "cultural_center",
        city: "Lisboa",
        countryCode: "PT",
      },
      films: [{
        position: 1,
        film: {
          title: "EXEMPLO DE SESSÃO",
          year: 2026,
          durationMinutes: 92,
          people: [{ name: "Realizador Exemplo", role: "director" }],
          countries: ["Portugal"],
        },
      }],
    });
  });
});
