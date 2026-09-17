import { describe, expect, it, vi } from "vitest";
import type { NormalizedFilm, NormalizedVenue } from "../core/contracts";
import type { IngestionPersistencePort } from "../core/persistence-contracts";
import { ingestCinematecaFixture } from "./fixture-runner";

const fixture = {
  source: {
    sourceKey: "cinemateca_pt",
    sourceUrl: "https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098",
    capturedAt: "2026-09-17",
  },
  items: [
    {
      sourceExternalId: "2026-09-01-2130-e-la-nave-va",
      sourceUrl: "https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098",
      date: "2026-09-01",
      time: "21:30",
      venue: "Sala M. Félix Ribeiro",
      title: "E LA NAVE VA",
      director: "Federico Fellini",
      country: "Itália",
      year: 1983,
      durationMinutes: 128,
      subtitles: "legendado em português",
      eventType: "screening" as const,
    },
    {
      sourceExternalId: "2026-09-02-1930-turandot",
      sourceUrl: "https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098",
      date: "2026-09-02",
      time: "19:30",
      venue: "Sala Luís de Pina",
      title: "TURANDOT",
      director: "Felix Breisach",
      country: "Áustria, Alemanha, Suíça",
      year: 2015,
      durationMinutes: 123,
      subtitles: "legendado eletronicamente em português",
      eventType: "screening" as const,
    },
  ],
};

function mockPersistence(): IngestionPersistencePort {
  return {
    resolveFilm: vi.fn(async (film: NormalizedFilm) => ({
      action: "review" as const,
      confidence: "weak" as const,
      canonicalKey: `title:${film.title.toLowerCase()}`,
    })),
    resolveVenue: vi.fn(async (venue: NormalizedVenue) => ({
      action: "review" as const,
      confidence: "weak" as const,
      canonicalKey: venue.name.toLowerCase(),
    })),
    persistScreening: vi.fn(async () => ({
      eventId: crypto.randomUUID(),
      screeningId: crypto.randomUUID(),
    })),
  };
}

describe("Cinemateca fixture runner", () => {
  it("processes every valid screening and delegates persistence", async () => {
    const persistence = mockPersistence();

    const result = await ingestCinematecaFixture(fixture, persistence);

    expect(result).toEqual({
      processed: 2,
      persisted: 2,
      failed: 0,
      warnings: [],
      failures: [],
    });
    expect(persistence.persistScreening).toHaveBeenCalledTimes(2);
    expect(persistence.resolveFilm).toHaveBeenCalledTimes(2);
    expect(persistence.resolveVenue).toHaveBeenCalledTimes(2);
  });

  it("continues processing after one persistence failure", async () => {
    const persistence = mockPersistence();
    vi.mocked(persistence.persistScreening)
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ eventId: "event-2", screeningId: "screening-2" });

    const result = await ingestCinematecaFixture(fixture, persistence);

    expect(result.processed).toBe(2);
    expect(result.persisted).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failures).toEqual([
      {
        sourceExternalId: "2026-09-01-2130-e-la-nave-va",
        title: "E LA NAVE VA",
        message: "temporary failure",
      },
    ]);
  });
});
