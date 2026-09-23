import { describe, expect, it } from "vitest";
import { rtpAdapter } from "../rtp/parser";
import { sicAdapter } from "../sic/parser";
import { tviAdapter } from "../tvi/parser";

const fixtures = [
  {
    adapter: rtpAdapter,
    item: {
      sourceExternalId: "rtp-1",
      sourceUrl: "https://www.rtp.pt/play/example",
      broadcasterKey: "rtp",
      channel: "RTP1",
      title: "Documentário RTP",
      genre: "Documentário",
      startAt: "2026-09-23T20:00:00+01:00",
    },
  },
  {
    adapter: sicAdapter,
    item: {
      sourceExternalId: "sic-sic-1",
      sourceUrl: "https://opto.sic.pt/example",
      broadcasterKey: "sic",
      channel: "SIC",
      title: "Documentário SIC",
      genre: "Documentários",
      startAt: "2026-09-23T21:00:00+01:00",
      episode: 2,
      season: 1,
    },
  },
  {
    adapter: tviAdapter,
    item: {
      sourceExternalId: "tvi-2026-09-23-2200-documentario-tvi",
      sourceUrl: "https://tvi.iol.pt/example",
      broadcasterKey: "tvi",
      channel: "TVI",
      title: "Documentário TVI",
      genre: "documental",
      startAt: "2026-09-23T22:00:00+01:00",
    },
  },
] as const;

describe("television production adapter contract", () => {
  it("normalizes RTP, SIC and TVI through the same adapter contract", () => {
    for (const { adapter, item } of fixtures) {
      const result = adapter.parse({
        sourceKey: adapter.key,
        sourceType: "website",
        externalId: item.sourceExternalId,
        sourceUrl: item.sourceUrl,
        raw: JSON.stringify(item),
        parsedAt: "2026-09-23T10:00:00.000Z",
      }, item);

      expect(result.events).toEqual([]);
      expect(result.screenings).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.tvPrograms).toHaveLength(1);

      const programme = result.tvPrograms![0];
      expect(programme.eventType).toBe("television");
      expect(programme.genre).toBe("documentary");
      expect(programme.sourceExternalId).toBe(item.sourceExternalId);
      expect(programme.sourceUrl).toBe(item.sourceUrl);
      expect(programme.broadcasterKey).toBe(item.broadcasterKey);
      expect(programme.channel).toBe(item.channel);
      expect(programme.title).toBe(item.title);
      expect(Number.isNaN(Date.parse(programme.startAt))).toBe(false);
    }
  });

  it("keeps source identities distinct across broadcasters and channels", () => {
    const identities = fixtures.map(({ item }) => `${item.broadcasterKey}:${item.channel}:${item.sourceExternalId}`);
    expect(new Set(identities).size).toBe(3);
  });
});
