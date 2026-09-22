import { describe, expect, it } from "vitest";
import { fetchDoclisboaProgramme, parseDoclisboaProgrammeText } from "./fetcher";

describe("Doclisboa PDF text parser", () => {
  it("parses sessions that precede a film heading", () => {
    const programmeText = `
      Da Terra à Lua
      16 Out / 11:30, Culturgest - Pequeno Auditório
      18 Out / 15:00, Cinema São Jorge - Sala 3
      The Vanishing Point
      Noghteh-e-Goriz
      Bani Khoshnoudi
      2025 Irão, EUA, França • 104’ • DCP
      16 Out / 15:00, Cinema São Jorge - Sala 3
      A Scary Movie
      Una película de miedo
      Sergio Oksman
      2025 Espanha, Portugal • 72’ • DCP
    `;

    const result = parseDoclisboaProgrammeText(
      programmeText,
      "https://doclisboa.test/doclisboa2026_programa.pdf",
    );

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      title: "The Vanishing Point",
      date: "2026-10-16",
      time: "11:30",
      venue: "Culturgest - Pequeno Auditório",
      director: "Bani Khoshnoudi",
      year: 2025,
      country: "Irão, EUA, França",
      durationMinutes: 104,
      films: [{ title: "The Vanishing Point" }],
    });
    expect(result[1]).toMatchObject({
      title: "The Vanishing Point",
      date: "2026-10-18",
      time: "15:00",
      venue: "Cinema São Jorge - Sala 3",
    });
    expect(result[2]).toMatchObject({
      title: "A Scary Movie",
      date: "2026-10-16",
      time: "15:00",
      venue: "Cinema São Jorge - Sala 3",
      films: [{ title: "A Scary Movie", director: "Sergio Oksman" }],
    });
  });

  it("keeps all films belonging to the same festival programme session", () => {
    const programmeText = `
      Verdes Anos
      20 Out / 16:30, Cinema São Jorge - Sala M. Oliveira
      Two Days and Two Nights
      Katarina Lanier
      2025 Portugal • 12’ • DCP
      Panic in Nowhere
      Adrian Flury
      2024 Suíça • 27’ • DCP
      The Summit
      Ander Reviejo
      2025 Espanha • 10’ • DCP
      One Sun, a Shadow Each
      Alexandre Carré
      2025 França • 58’ • DCP
    `;

    const result = parseDoclisboaProgrammeText(
      programmeText,
      "https://doclisboa.test/doclisboa2026_programa.pdf",
    );

    expect(result).toHaveLength(4);
    expect(result.every((item) => item.date === "2026-10-20")).toBe(true);
    expect(result.every((item) => item.time === "16:30")).toBe(true);
    expect(result.map((item) => item.title)).toEqual([
      "Two Days and Two Nights",
      "Panic in Nowhere",
      "The Summit",
      "One Sun, a Shadow Each",
    ]);
    expect(result.every((item) => item.films).length).toBe(4);
    expect(result.every((item) => item.films.length === 1)).toBe(true);
  });

  it("preserves film format metadata extracted from the PDF", () => {
    const result = parseDoclisboaProgrammeText(
      `
        16 Out / 11:30, Culturgest
        Film
        Director
        2025 Portugal • 92’ • DCP
      `,
      "https://doclisboa.test/doclisboa2026_programa.pdf",
    );

    expect(result[0].films[0]).toMatchObject({
      title: "Film",
      director: "Director",
      format: "DCP",
    });
  });

  it("rejects failed PDF source responses", async () => {
    await expect(
      fetchDoclisboaProgramme({
        fetchImpl: async () => new Response("", { status: 503 }),
      }),
    ).rejects.toThrow("Doclisboa PDF fetch failed: 503");
  });
});
