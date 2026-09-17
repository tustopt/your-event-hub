import { describe, expect, it } from "vitest";
import { fetchCinemaFernandoLopesProgramme } from "./fetcher";

describe("Cinema Fernando Lopes fetcher", () => {
  it("extracts programme sessions from the site's abbreviated date format", async () => {
    const html = `
      <html><body>
        <div>sex, 18 set</div>
        <div>19h00 - CARTAS AMARELAS</div>
        <div>21h30 - HOPE</div>
        <div>sáb, 19 set</div>
        <div>11h00 - TU, QUE VIVES - mostra essencial Roy Andersson</div>
        <div>16h00 - NOBODY - semana do cinema chinês em portugal 2026</div>
        <div>19h00 - TABLE FOR TWO - semana do cinema chinês em portugal 2026 | sessão especial</div>
        <div>dom, 20 set</div>
        <div>21h30 - HOPE</div>
        <div>programação a anunciar brevemente</div>
      </body></html>`;

    const result = await fetchCinemaFernandoLopesProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      url: "https://example.test/programacao",
      now: () => new Date("2026-09-17T12:00:00+01:00"),
    });

    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({
      date: "2026-09-18",
      time: "19:00",
      title: "CARTAS AMARELAS",
    });
    expect(result[2]).toMatchObject({
      date: "2026-09-19",
      time: "11:00",
      title: "TU, QUE VIVES",
      festival: "mostra essencial Roy Andersson",
    });
    expect(result[3]).toMatchObject({
      title: "NOBODY",
      festival: "semana do cinema chinês em portugal 2026",
    });
    expect(result[4].title).toBe("TABLE FOR TWO");
  });

  it("accepts explicit years in source date headings", async () => {
    const html = `<div>quarta-feira, 7 outubro 2027</div><div>19h00 - EXAMPLE FILM</div>`;

    const result = await fetchCinemaFernandoLopesProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      now: () => new Date("2026-09-17T12:00:00+01:00"),
    });

    expect(result[0]).toMatchObject({ date: "2027-10-07" });
  });

  it("rejects failed source responses", async () => {
    await expect(
      fetchCinemaFernandoLopesProgramme({
        fetchImpl: async () => new Response("", { status: 503 }),
      }),
    ).rejects.toThrow("Cinema Fernando Lopes fetch failed: 503");
  });
});
