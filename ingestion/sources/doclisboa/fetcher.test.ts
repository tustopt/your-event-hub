import { describe, expect, it } from "vitest";
import { fetchDoclisboaProgramme } from "./fetcher";

describe("Doclisboa fetcher", () => {
  it("discovers film pages and extracts the current session format", async () => {
    const indexHtml = `
      <a href="/filmes/complo/">Complô</a>
      <a href="/filmes/cover-up/">Cover-Up</a>
    `;

    const pages: Record<string, string> = {
      "https://doclisboa.test/filmes/complo/": `
        <h1>Complô</h1>
        <div>João Miller Guerra</div>
        <div>2025 Portugal 86’</div>
        <div>Competição Portuguesa</div>
        <div>17.10 / 22:45 / 86’</div>
        <div>Cinema São Jorge - Sala M. Oliveira</div>
        <div>Bilhete</div>
        <div>21.10 / 15:00 / 86’</div>
        <div>Cinema São Jorge - Sala 3</div>
      `,
      "https://doclisboa.test/filmes/cover-up/": `
        <h1>Cover-Up</h1>
        <div>Laura Poitras, Mark Obenhaus</div>
        <div>2025 EUA 117’</div>
        <div>Da Terra à Lua</div>
        <div>21.10 / 20:15 / 117’</div>
        <div>Cinema São Jorge - Sala M. Oliveira</div>
      `,
    };

    const result = await fetchDoclisboaProgramme({
      fetchImpl: async (input) => {
        const url = String(input);
        const body = url === "https://doclisboa.test/filmes/" ? indexHtml : pages[url] ?? "";
        return new Response(body, { status: body ? 200 : 404 });
      },
      url: "https://doclisboa.test/filmes/",
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      title: "Complô",
      date: "2026-10-17",
      time: "22:45",
      venue: "Cinema São Jorge - Sala M. Oliveira",
      section: "Competição Portuguesa",
      director: "João Miller Guerra",
      year: 2025,
      durationMinutes: 86,
    });
    expect(result[1]).toMatchObject({
      title: "Complô",
      date: "2026-10-21",
      time: "15:00",
      venue: "Cinema São Jorge - Sala 3",
    });
    expect(result[2]).toMatchObject({
      title: "Cover-Up",
      date: "2026-10-21",
      time: "20:15",
      venue: "Cinema São Jorge - Sala M. Oliveira",
      section: "Da Terra à Lua",
    });
  });

  it("deduplicates repeated film links and sessions", async () => {
    const indexHtml = `
      <a href="/filmes/complo/">Complô</a>
      <a href="/filmes/complo/">Complô duplicate</a>
    `;
    const pageHtml = `
      <h1>Complô</h1>
      <div>João Miller Guerra</div>
      <div>2025 Portugal 86’</div>
      <div>Competição Portuguesa</div>
      <div>17.10 / 22:45 / 86’</div>
      <div>Culturgest</div>
    `;

    const result = await fetchDoclisboaProgramme({
      fetchImpl: async (input) => {
        const url = String(input);
        return new Response(url === "https://doclisboa.test/filmes/" ? indexHtml : pageHtml, { status: 200 });
      },
      url: "https://doclisboa.test/filmes/",
    });

    expect(result).toHaveLength(1);
  });

  it("rejects failed source responses", async () => {
    await expect(
      fetchDoclisboaProgramme({
        fetchImpl: async () => new Response("", { status: 503 }),
      }),
    ).rejects.toThrow("Doclisboa fetch failed: 503");
  });
});
