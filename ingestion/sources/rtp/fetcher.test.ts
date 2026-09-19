import { describe, expect, it } from "vitest";
import {
  extractRtpEpgFeedUrl,
  isRtpDocumentaryPage,
  parseRtpEpg,
} from "./fetcher";

describe("RTP EPG parser", () => {
  it("extracts the EPG feed template", () => {
    expect(
      extractRtpEpgFeedUrl(
        '<script>var epgFeedUrl = \'/EPG/json/rtp-channels-page/list-grid/tv/1/{0}\';</script>',
      ),
    ).toBe("/EPG/json/rtp-channels-page/list-grid/tv/1/{date}");
  });

  it("parses EPG entries using the channel reported by RTP", () => {
    const result = parseRtpEpg(
      {
        _info: { name: "RTP1", timeZone: "lis" },
        result: {
          morning: [
            {
              id: "951524",
              date: "2026-09-19 10:30:00",
              name: "Os Primeiros Alentejanos",
              series: "",
              description: "Documentário sobre os monumentos megalíticos do Alentejo central",
              url: "https://www.rtp.pt/programa/tv/p17100/e951524",
              episode: { number: "", title: "", sinopse: "" },
            },
          ],
        },
      },
      "RTP",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sourceExternalId: "951524-2026-09-19-rtp1",
      title: "Os Primeiros Alentejanos",
      channel: "RTP1",
      broadcasterKey: "rtp",
      genre: "Documentários",
      startAt: "2026-09-19T10:30:00+01:00",
    });
  });
});

describe("RTP documentary classification", () => {
  it("accepts current RTP Play documentary markup with HTML entities", () => { expect(isRtpDocumentaryPage('<h2 class="section-title">Este conte&uacute;do faz parte de Document&aacute;rios de Patrim&oacute;nio, Tradi&ccedil;&otilde;es e Gastronomia</h2>')).toBe(true); });

  it("accepts RTP Play documentary sections", () => {
    expect(
      isRtpDocumentaryPage(
        "<main>Género: Cultura</main><footer>Este conteúdo faz parte de Documentários de Ciência e Natureza</footer>",
      ),
    ).toBe(true);
  });

  it("rejects a normal RTP Play programme page", () => {
    expect(
      isRtpDocumentaryPage(
        "<main>Género: Cultura</main><footer>Este conteúdo faz parte de Programas de Informação</footer>",
      ),
    ).toBe(false);
  });
});
