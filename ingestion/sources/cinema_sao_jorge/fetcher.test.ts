import { describe, expect, it } from "vitest";
import { fetchCinemaSaoJorgeProgramme } from "./fetcher";

describe("Cinema São Jorge fetcher", () => {
  it("extracts programme sessions from human-readable HTML", async () => {
    const html = `
      <html><body>
        <h2>QUEER LISBOA 2026</h2>
        <p>Sexta-feira, 18 de Setembro às 00:00</p>
        <h2>Word Is Out: Stories of Some of Our Lives</h2>
        <p>QUEER LISBOA 2026</p>
        <p>Sexta-feira, 18 de Setembro às 16:00</p>
        <p>132' minutos</p>
        <h2>The Man I Love | SESSÃO DE ABERTURA</h2>
        <p>QUEER LISBOA 2026</p>
        <p>Sexta-feira, 18 de Setembro às 21:00</p>
        <p>95' minutos</p>
      </body></html>`;

    const result = await fetchCinemaSaoJorgeProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      url: "https://example.test/programacao/0/",
    });

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.title)).toEqual([
      "Word Is Out: Stories of Some of Our Lives",
      "The Man I Love | SESSÃO DE ABERTURA",
    ]);
    expect(result[0]).toMatchObject({
      date: "2026-09-18",
      time: "16:00",
      durationMinutes: 132,
      festival: "QUEER LISBOA 2026",
    });
  });


  it("detects the current Festa do Cinema Francês festival context", async () => {
    const html = `
      <h2>Festa do Cinema Francês 2026</h2>
      <p>Quinta-feira, 1 de Outubro às 21:00</p>
      <h2>La Bataille de Gaulle: L'âge de fer | SESSÃO DE ABERTURA</h2>
      <p>Festa do Cinema Francês 2026</p>
      <p>Quinta-feira, 1 de Outubro às 21:00</p>
      <p>160' minutos</p>
    `;

    const result = await fetchCinemaSaoJorgeProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      url: "https://example.test/programacao/0/",
      now: () => new Date("2026-10-01T10:00:00+01:00"),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "La Bataille de Gaulle: L'âge de fer | SESSÃO DE ABERTURA",
      date: "2026-10-01",
      time: "21:00",
      durationMinutes: 160,
      festival: "Festa do Cinema Francês 2026",
    });
  });

  it("rejects failed source responses", async () => {
    await expect(
      fetchCinemaSaoJorgeProgramme({
        fetchImpl: async () => new Response("", { status: 503 }),
      }),
    ).rejects.toThrow("Cinema São Jorge fetch failed: 503");
  });
});
