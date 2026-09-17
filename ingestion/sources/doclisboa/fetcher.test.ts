import { describe, expect, it } from "vitest";
import { fetchDoclisboaProgramme } from "./fetcher";

describe("Doclisboa fetcher", () => {
  it("extracts programme sessions from the documented festival programme shape", async () => {
    const html = `
      <div>15 Outubro</div>
      <div>Da Terra à Lua</div>
      <div>15.10 / 10:30 / 104’</div>
      <div>Culturgest - Pequeno Auditório</div>
      <div>The Example Documentary</div>
      <div>De Example Director</div>
      <div>16.10 / 14:00 / 72’</div>
      <div>Cinema São Jorge - Sala 3</div>
      <div>Another Documentary</div>
      <div>De Another Director</div>
    `;

    const result = await fetchDoclisboaProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
      url: "https://example.test/2026/programa/",
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      editionYear: 2026,
      date: "2026-10-15",
      time: "10:30",
      title: "The Example Documentary",
      section: "Da Terra à Lua",
      venue: "Culturgest - Pequeno Auditório",
      durationMinutes: 104,
      director: "Example Director",
    });
    expect(result[1]).toMatchObject({
      date: "2026-10-16",
      time: "14:00",
      title: "Another Documentary",
      venue: "Cinema São Jorge - Sala 3",
      durationMinutes: 72,
      director: "Another Director",
    });
  });

  it("deduplicates repeated session cards", async () => {
    const html = `
      <div>15.10 / 10:30 / 104’</div>
      <div>Culturgest</div>
      <div>Example Documentary</div>
      <div>De Example Director</div>
      <div>15.10 / 10:30 / 104’</div>
      <div>Culturgest</div>
      <div>Example Documentary</div>
      <div>De Example Director</div>
    `;

    const result = await fetchDoclisboaProgramme({
      fetchImpl: async () => new Response(html, { status: 200 }),
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
