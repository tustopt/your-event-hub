import { describe, expect, it } from "vitest";
import {
  extractRtpEpgFeedUrl,
  extractRtpProgrammeImageUrl,
  isRtpDocumentaryPage,
  fetchRtpProgramme,
  parseRtpEpg,
} from "./fetcher";

describe("RTP EPG parser", () => {
  it("resolves relative EPG feed URLs against the channel page", () => {
    const template = extractRtpEpgFeedUrl(
      '<script>var epgFeedUrl = \'/EPG/json/rtp-channels-page/list-grid/tv/1/{0}\';</script>',
    );
    expect(new URL(template!.replace("{date}", "2026-09-19"), "https://www.rtp.pt/rtp1/").toString())
      .toBe("https://www.rtp.pt/EPG/json/rtp-channels-page/list-grid/tv/1/2026-09-19");
  });

  it("extracts the EPG feed template", () => {
    expect(
      extractRtpEpgFeedUrl(
        '<script>var epgFeedUrl = \'/EPG/json/rtp-channels-page/list-grid/tv/1/{0}\';</script>',
      ),
    ).toBe("/EPG/json/rtp-channels-page/list-grid/tv/1/{date}");
  });

  it("builds RTP Play URLs for EPG entries", () => {
    const result = parseRtpEpg(
      {
        result: {
          morning: [{
            id: "951524",
            date: "2026-09-19 10:30:00",
            name: "Os Primeiros Alentejanos",
            url: "https://www.rtp.pt/programa/tv/p17100/e951524",
          }],
        },
      },
      "RTP1",
    );
    expect(result[0].sourceUrl)
      .toBe("https://www.rtp.pt/play/p17100/e951524/os-primeiros-alentejanos");
  });

  it("parses EPG entries using the channel reported by RTP", () => {
    const result = parseRtpEpg(
      {
        _info: { name: "RTP1", timeZone: "lis" },
        result: {
          morning: [{
            id: "951524",
            date: "2026-09-19 10:30:00",
            name: "Os Primeiros Alentejanos",
            series: "",
            description: "Documentário sobre os monumentos megalíticos do Alentejo central",
            url: "https://www.rtp.pt/programa/tv/p17100/e951524",
            episode: { number: "", title: "", sinopse: "" },
          }],
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

  it("extracts an Open Graph promotional image URL", () => {
    expect(
      extractRtpProgrammeImageUrl(
        '<meta property="og:image" content="/images/programmes/doc.jpg">',
        "https://www.rtp.pt/play/p17100/e951524/os-primeiros-alentejanos",
      ),
    ).toBe("https://www.rtp.pt/images/programmes/doc.jpg");
  });
});

describe("RTP historical ingestion", () => {
  it("ingests a known historical documentary from the EPG", async () => {
    const responses = [
      new Response('<script>var epgFeedUrl = "/EPG/json/rtp-channels-page/list-grid/tv/1/{0}";</script>', { status: 200 }),
      new Response(JSON.stringify({
        _info: { name: "RTP1" },
        result: {
          late: [{
            id: "49401",
            date: "2026-09-03 23:28:00",
            name: "Os Primeiros Alentejanos",
            url: "https://www.rtp.pt/programa/tv/p17100/e951524",
          }],
        },
      }), { status: 200, headers: { "content-type": "application/json" } }),
      new Response('<meta property="og:image" content="/images/programmes/doc.jpg"><h2 class="section-title">Este conte&uacute;do faz parte de Document&aacute;rios de Patrim&oacute;nio, Tradi&ccedil;&otilde;es e Gastronomia</h2>', { status: 200 }),
    ];

    const result = await fetchRtpProgramme({
      now: () => new Date("2026-09-03T12:00:00Z"),
      channelPages: [{ key: "rtp1", channel: "RTP1", url: "https://www.rtp.pt/rtp1/" }],
      fetchImpl: async () => responses.shift() ?? new Response("", { status: 500 }),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Os Primeiros Alentejanos",
      channel: "RTP1",
      sourceExternalId: "49401-2026-09-03-rtp1",
      startAt: "2026-09-03T23:28:00+01:00",
      imageUrl: "https://www.rtp.pt/images/programmes/doc.jpg",
    });
  });
});

describe("RTP documentary classification", () => {
  it("accepts current RTP Play documentary markup with HTML entities", () => { expect(isRtpDocumentaryPage('<h2 class="section-title">Este conte&uacute;do faz parte de Document&aacute;rios de Patrim&oacute;nio, Tradi&ccedil;&otilde;es e Gastronomia</h2>')).toBe(true); });

  it("accepts RTP programme pages classified as Documentários", () => {
    expect(
      isRtpDocumentaryPage(
        "<div><span>Géneros</span><div>Documentários</div></div>",
      ),
    ).toBe(true);
  });

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
