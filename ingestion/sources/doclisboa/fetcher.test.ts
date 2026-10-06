import { describe, expect, it } from "vitest";
import { fetchDoclisboaProgramme } from "./fetcher";

function response(html: string): Response {
  return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
}

describe("Doclisboa website fetcher", () => {
  it("discovers film pages and extracts their sessions", async () => {
    const catalogue = `
      <html><body>
        <a href="/filmes/13-alfinetes/">13 Alfinetes</a>
        <a href="/filmes/last-movies/">Last Movies</a>
        <a href="/filmes/movie.link">placeholder</a>
        <a href="/filmes/">Filmes</a>
      </body></html>
    `;

    const pages: Record<string, string> = {
      "https://doclisboa.org/filmes/13-alfinetes/": `
        <h2>Competição Internacional</h2>
        <meta property="og:image" content="/wp-content/uploads/13-alfinetes.jpg">
        <h1>13 Alfinetes</h1>
        <p>João Pedro Rodrigues, João Rui Guerra da Mata</p>
        <p>2026 Portugal 61’</p>
        <p>Descrição</p>
        <h2>Sessões</h2>
        <p>Competição Internacional</p>
        <p>20 Out / 21:30 / 61’</p>
        <p>Culturgest - Auditório Emílio Rui Vilar</p>
        <h4>13 Alfinetes</h4>
        <p>João Pedro Rodrigues, João Rui Guerra da Mata</p>
        <p>22 Out / 14:00 / 61’</p>
        <p>Culturgest - Pequeno Auditório</p>
      `,
      "https://doclisboa.org/filmes/last-movies/": `
        <h2>Da Terra à Lua</h2>
        <h1>Last Movies</h1>
        <p>Stanley Schtinter</p>
        <p>2026 Reino Unido 84’</p>
        <p>Descrição</p>
        <h2>Sessões</h2>
        <p>16 Out / 21:30 / 86’</p>
        <p>Culturgest - Auditório Emílio Rui Vilar</p>
        <p>18 Out / 19:30 / 86’</p>
        <p>Cinema Ideal</p>
      `,
    };

    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      calls.push(url);
      if (url === "https://doclisboa.org/filmes/") return response(catalogue);
      const page = pages[url];
      if (!page) return new Response("not found", { status: 404 });
      return response(page);
    };

    const items = await fetchDoclisboaProgramme({ fetchImpl });

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({
      title: "13 Alfinetes",
      date: "2026-10-20",
      time: "21:30",
      venue: "Culturgest - Auditório Emílio Rui Vilar",
      director: "João Pedro Rodrigues, João Rui Guerra da Mata",
      imageUrl: "https://doclisboa.org/wp-content/uploads/13-alfinetes.jpg",
      section: "Competição Internacional",
      durationMinutes: 61,
    });
    expect(items[1].sourceUrl).toBe("https://doclisboa.org/filmes/13-alfinetes/");
    expect(items[2]).toMatchObject({
      title: "Last Movies",
      date: "2026-10-16",
      time: "21:30",
      venue: "Culturgest - Auditório Emílio Rui Vilar",
      durationMinutes: 86,
      section: "Da Terra à Lua",
    });
    expect(new Set(items.map((item) => item.sourceExternalId)).size).toBe(4);
    expect(calls).toHaveLength(3);
  });

  it("fails clearly when the catalogue has no film links", async () => {
    await expect(
      fetchDoclisboaProgramme({
        fetchImpl: async () => response("<html><body>Sem filmes</body></html>"),
      }),
    ).rejects.toThrow("catalogue returned no film links");
  });
});
