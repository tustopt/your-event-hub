import { describe, expect, it } from "vitest";
import { fetchCinemaIdealProgramme } from "./fetcher";

describe("Cinema Ideal fetcher", () => {
  it("extracts dated sessions when title and time share a line", async () => {
    const html = `
      <html><body>
        <h2>seg, 28 set 2026</h2>
        <div>Natal Amargo</div>
        <div>16:30</div>
        <div>Natal Amargo</div>
        <div>21h15</div>
        <h2>ter, 29 set</h2>
        <div>A Piscina</div>
        <div>18:45</div>
      </body></html>`;

    const result = await fetchCinemaIdealProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      url: "https://example.test/cinema-ideal",
      now: () => new Date("2026-09-27T12:00:00+01:00"),
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      date: "2026-09-28",
      time: "16:30",
      title: "Natal Amargo",
    });
    expect(result[1]).toMatchObject({
      date: "2026-09-28",
      time: "21:15",
      title: "Natal Amargo",
    });
    expect(result[2]).toMatchObject({
      date: "2026-09-29",
      time: "18:45",
      title: "A Piscina",
    });
  });

  it("supports dates without an explicit year", async () => {
    const html = `<div>qua, 30 set</div><div>19h00 - FILME TESTE</div>`;
    const result = await fetchCinemaIdealProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      now: () => new Date("2026-09-01T12:00:00+01:00"),
    });
    expect(result[0]).toMatchObject({ date: "2026-09-30", time: "19:00" });
  });

  it("deduplicates identical sessions", async () => {
    const html = `
      <div>1/10/2026</div>
      <div>19:00 - FILME</div>
      <div>19:00 - FILME</div>`;
    const result = await fetchCinemaIdealProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
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
