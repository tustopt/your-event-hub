import { describe, expect, it } from "vitest";
import { fetchDoclisboaProgramme, DOCLISBOA_EDITION_YEAR } from "./fetcher";

describe("Doclisboa fetcher", () => {
  it("discovers section pages and extracts 2026 sessions", async () => {
    const indexHtml = `
      <a href="/seccoes/riscos/">Riscos</a>
      <a href="/seccoes/da-terra-a-lua/">Da Terra à Lua</a>
    `;
    const pages: Record<string, string> = {
      "https://doclisboa.test/seccoes/riscos/": `
        <h1>Riscos</h1>
        <div>Complô</div>
        <div>17.10 / 22:45 / 86’</div>
        <div>Cinema São Jorge - Sala M. Oliveira</div>
      `,
      "https://doclisboa.test/seccoes/da-terra-a-lua/": `
        <h1>Da Terra à Lua</h1>
        <div>Cover-Up</div>
        <div>21.10 / 20:15 / 117’</div>
        <div>Culturgest</div>
      `,
    };

    const result = await fetchDoclisboaProgramme({
      fetchImpl: async (input) => {
        const url = String(input);
        const body = url === "https://doclisboa.test/seccoes/" ? indexHtml : pages[url] ?? "";
        return new Response(body, { status: body ? 200 : 404 });
      },
      url: "https://doclisboa.test/seccoes/",
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      title: "Complô",
      date: "2026-10-17",
      time: "22:45",
      venue: "Cinema São Jorge - Sala M. Oliveira",
      section: "Riscos",
      editionYear: DOCLISBOA_EDITION_YEAR,
      durationMinutes: 86,
    });
    expect(result[1]).toMatchObject({
      title: "Cover-Up",
      date: "2026-10-21",
      time: "20:15",
      venue: "Culturgest",
      section: "Da Terra à Lua",
      durationMinutes: 117,
    });
  });

  it("deduplicates sessions repeated across sections", async () => {
    const indexHtml = `
      <a href="/seccoes/a/">A</a>
      <a href="/seccoes/b/">B</a>
    `;
    const pageHtml = `
      <h1>Section</h1>
      <div>Film</div>
      <div>17.10 / 22:45 / 86’</div>
      <div>Culturgest</div>
    `;
    const result = await fetchDoclisboaProgramme({
      fetchImpl: async (input) =>
        new Response(String(input) === "https://doclisboa.test/seccoes/" ? indexHtml : pageHtml, { status: 200 }),
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
