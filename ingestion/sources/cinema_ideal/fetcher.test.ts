import { describe, expect, it } from "vitest";
import { fetchCinemaIdealProgramme } from "./fetcher";

describe("Cinema Ideal fetcher", () => {
  it("extracts the weekly programme from the Cinema Ideal page structure", async () => {
    const html = `
      <html><body>
        <div>NO CINEMA</div>
        <div>próximas ESTREIAS</div>
        <h3>NAZA</h3>
        <p>Yuval Abraham & Rachel Szor</p>
        <div>QUINTA 14:30 18:30 20:00 | SEXTA 18:30 20:00 21:30 | SÁBADO 14:30 18:30 21:30</div>
        <div>+ INFO</div>
        <div>COMPRAR</div>
        <h3>FUCK THE POLIS</h3>
        <p>Rita Azevedo Gomes</p>
        <div>21:30 QUINTA SEGUNDA | 14:30 SEXTA TERÇA | 20:00 SÁBADO DOMINGO QUARTA</div>
        <div>+ INFO</div>
        <div>COMPRAR</div>
        <h3>NATAL AMARGO</h3>
        <p>Pedro Almodóvar</p>
        <div>16:15 TODOS OS DIAS | TERÇA E QUARTA TAMBÉM 21.30</div>
        <div>+ INFO</div>
        <div>COMPRAR</div>
        <div>EM CASA</div>
        <div>VIDEOCLUBE</div>
      </body></html>`;

    const result = await fetchCinemaIdealProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      url: "https://example.test/cinema-ideal",
      now: () => new Date("2026-10-01T12:00:00+01:00"),
    });

    expect(result).toHaveLength(13);
    expect(result.filter((item) => item.title === "NAZA")).toHaveLength(7);
    expect(result.filter((item) => item.title === "FUCK THE POLIS")).toHaveLength(7);
    expect(result.filter((item) => item.title === "NATAL AMARGO")).toHaveLength(7);

    expect(result).toContainEqual(expect.objectContaining({
      title: "NAZA",
      date: "2026-10-01",
      time: "14:30",
    }));
    expect(result).toContainEqual(expect.objectContaining({
      title: "FUCK THE POLIS",
      date: "2026-10-05",
      time: "21:30",
    }));
    expect(result).toContainEqual(expect.objectContaining({
      title: "NATAL AMARGO",
      date: "2026-10-06",
      time: "21:30",
    }));
  });

  it("does not include historical news sessions after the cinema programme", async () => {
    const html = `
      <div>NO CINEMA</div>
      <div>próximas ESTREIAS</div>
      <h3>FILME ACTUAL</h3>
      <p>Realizador</p>
      <div>QUINTA 19:00</div>
      <div>+ INFO</div>
      <div>COMPRAR</div>
      <div>EM CASA</div>
      <div>VIDEOCLUBE</div>
      <div>NOTÍCIAS</div>
      <div>TERÇA 29 Setembro 16:30 NATAL AMARGO</div>
    `;

    const result = await fetchCinemaIdealProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      now: () => new Date("2026-10-01T12:00:00+01:00"),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "FILME ACTUAL",
      date: "2026-10-01",
      time: "19:00",
    });
  });

  it("deduplicates repeated programme blocks", async () => {
    const html = `
      <div>NO CINEMA</div>
      <div>próximas ESTREIAS</div>
      <h3>FILME</h3>
      <p>Realizador</p>
      <div>QUINTA 19:00</div>
      <div>+ INFO</div>
      <div>COMPRAR</div>
      <h3>FILME</h3>
      <p>Realizador</p>
      <div>QUINTA 19:00</div>
      <div>+ INFO</div>
      <div>COMPRAR</div>
      <div>EM CASA</div>
    `;

    const result = await fetchCinemaIdealProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      now: () => new Date("2026-10-01T12:00:00+01:00"),
    });

    expect(result).toHaveLength(1);
  });

  it("rejects failed source responses", async () => {
    await expect(
      fetchCinemaIdealProgramme({
        fetchImpl: async () => new Response("", { status: 503 }),
      }),
    ).rejects.toThrow("Cinema Ideal fetch failed: 503");
  });
});
