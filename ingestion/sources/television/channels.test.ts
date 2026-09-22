import { describe, expect, it } from "vitest";
import {
  getTelevisionChannel,
  PORTUGUESE_TELEVISION_CHANNELS,
} from "./channels";

describe("Portuguese television channel catalog", () => {
  it("contains the RTP, SIC and TVI channel families", () => {
    expect(PORTUGUESE_TELEVISION_CHANNELS.map((channel) => channel.channel)).toEqual(
      expect.arrayContaining([
        "RTP1",
        "RTP2",
        "RTP3",
        "SIC",
        "SIC Notícias",
        "TVI",
        "V+ TVI",
      ]),
    );
  });

  it("resolves a channel by broadcaster and channel key", () => {
    expect(getTelevisionChannel("sic", "sic_noticias")).toMatchObject({
      broadcasterKey: "sic",
      channelKey: "sic_noticias",
      channel: "SIC Notícias",
    });
  });

  it("has unique broadcaster and channel keys", () => {
    const keys = PORTUGUESE_TELEVISION_CHANNELS.map((channel) => `${channel.broadcasterKey}:${channel.channelKey}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has canonical URLs for every channel", () => {
    for (const channel of PORTUGUESE_TELEVISION_CHANNELS) {
      expect(() => new URL(channel.canonicalUrl)).not.toThrow();
      expect(channel.canonicalUrl).toMatch(/^https:\/\//);
    }
  });

  it("does not resolve a channel under the wrong broadcaster", () => {
    expect(getTelevisionChannel("tvi", "sic_noticias")).toBeUndefined();
  });
});
