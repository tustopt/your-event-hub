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

  it("does not resolve a channel under the wrong broadcaster", () => {
    expect(getTelevisionChannel("tvi", "sic_noticias")).toBeUndefined();
  });
});
