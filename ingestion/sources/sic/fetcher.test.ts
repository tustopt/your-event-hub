import { describe, expect, it } from "vitest";
import { fetchSicProgramme, parseSicEpg, SIC_CHANNELS_URL, SIC_EPG_URL } from "./fetcher";

describe("SIC Opto EPG parser", () => {
  it("keeps only documentary programme entries and normalizes timestamps", () => {
    const result = parseSicEpg([
      {
        id: "abc",
        title: "Grande Reportagem",
        description: "Documentário sobre Portugal.",
        start_time: 1790110800000,
        end_time: 1790114400000,
        episode_number: 2,
        season_number: 4,
      },
      {
        id: "news",
        title: "Jornal da Noite",
        description: "Informação.",
        start_time: 1790114400000,
        end_time: 1790118000000,
      },
    ], "SIC");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sourceExternalId: "sic-sic-abc",
      broadcasterKey: "sic",
      channel: "SIC",
      title: "Grande Reportagem",
      genre: "Documentários",
      episode: 2,
      season: 4,
      startAt: "2026-09-22T21:00:00.000Z",
    });
  });

  it("uses the Opto channel and EPG APIs", async () => {
    const urls: string[] = [];
    const responses = [
      new Response(JSON.stringify([{ id: "1", name: "SIC" }, { id: "2", name: "SIC Notícias" }]), { status: 200 }),
      new Response(JSON.stringify([]), { status: 200 }),
      new Response(JSON.stringify([]), { status: 200 }),
      new Response(JSON.stringify([]), { status: 200 }),
      new Response(JSON.stringify([]), { status: 200 }),
    ];

    await fetchSicProgramme({
      now: () => new Date("2026-09-23T10:00:00Z"),
      fetchImpl: async (input) => {
        urls.push(String(input));
        return responses.shift()!;
      },
    });

    expect(urls[0]).toBe(SIC_CHANNELS_URL);
    expect(urls.filter((url) => url.startsWith(SIC_EPG_URL))).toHaveLength(4);
    expect(urls.some((url) => url.includes("channels=1"))).toBe(true);
    expect(urls.some((url) => url.includes("channels=2"))).toBe(true);
  });
});
