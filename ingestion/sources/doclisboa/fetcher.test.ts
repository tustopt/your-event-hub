import { describe, expect, it } from "vitest";
import { fetchDoclisboaProgramme } from "./fetcher";

describe("Doclisboa fetcher", () => {
  it("parses sessions that precede a film heading", async () => {
    const indexHtml = `<a href="/seccoes/da-terra-a-lua/">Da Terra à Lua</a>`;
    const sectionHtml = `
      <h1>Da Terra à Lua</h1>
      <div>16 Out / 11:30 / 104’</div>
      <div>Culturgest - Pequeno Auditório</div>
      <div>18 Out / 15:00 / 104’</div>
      <div>Cinema São Jorge - Sala 3</div>

      <h3><a href="/filmes/the-vanishing-point/">The Vanishing Point</a></h3>
      <div>Noghteh-e-Goriz</div>
      <div>Bani Khoshnoudi</div>
      <div>2025 Irão, EUA, França 104’</div>

      <div>16 Out / 15:00 / 72’</div>
      <div>Cinema São Jorge - Sala 3</div>
      <h3><a href="/filmes/a-scary-movie/">A Scary Movie</a></h3>
      <div>Una película de miedo</div>
      <div>Sergio Oksman</div>
      <div>2025 Espanha, Portugal 72’</div>
    `;

    const result = await fetchDoclisboaProgramme({
      fetchImpl: async (input) => {
        const url = String(input);
        return new Response(url === "https://doclisboa.test/seccoes/" ? indexHtml : sectionHtml, { status: 200 });
      },
      url: "https://doclisboa.test/seccoes/",
    });

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

  it("keeps all films belonging to the same festival programme session", async () => {
    const indexHtml = `<a href="/seccoes/verdes-anos/">Verdes Anos</a>`;
    const sectionHtml = `
      <h1>Verdes Anos</h1>
      <div>20 Out / 16:30 / 105’</div>
      <div>Cinema São Jorge - Sala M. Oliveira</div>
      <h3>Two Days and Two Nights</h3>
      <div>Katarina Lanier</div>
      <div>2025 Portugal 12’</div>
      <h3>Panic in Nowhere</h3>
      <div>Adrian Flury</div>
      <div>2024 Suíça 27’</div>
      <h3>The Summit</h3>
      <div>Ander Reviejo</div>
      <div>2025 Espanha 10’</div>
      <h3>One Sun, a Shadow Each</h3>
      <div>Alexandre Carré</div>
      <div>2025 França 58’</div>
    `;

    const result = await fetchDoclisboaProgramme({
      fetchImpl: async (input) => new Response(String(input) === "https://doclisboa.test/seccoes/" ? indexHtml : sectionHtml, { status: 200 }),
      url: "https://doclisboa.test/seccoes/",
    });

    expect(result).toHaveLength(1);
    expect(result[0].films).toHaveLength(4);
    expect(result[0].films.map((film) => film.title)).toEqual([
      "Two Days and Two Nights",
      "Panic in Nowhere",
      "The Summit",
      "One Sun, a Shadow Each",
    ]);
  });

  it("deduplicates repeated section links", async () => {
    const indexHtml = `
      <a href="/seccoes/a/">A</a>
      <a href="/seccoes/a/">A duplicate</a>
    `;
    const sectionHtml = `
      <h1>A</h1>
      <div>16 Out / 11:30 / 104’</div>
      <div>Culturgest</div>
      <h3>Film</h3>
      <div>Director</div>
      <div>2025 Portugal 104’</div>
    `;
    const result = await fetchDoclisboaProgramme({
      fetchImpl: async (input) =>
        new Response(String(input) === "https://doclisboa.test/seccoes/" ? indexHtml : sectionHtml, { status: 200 }),
      url: "https://doclisboa.test/seccoes/",
    });
    expect(result).toHaveLength(1);
  });

  it("rejects failed source responses", async () => {
    await expect(
      fetchDoclisboaProgramme({ fetchImpl: async () => new Response("", { status: 503 }) }),
    ).rejects.toThrow("Doclisboa fetch failed: 503");
  });
});
