import { describe, expect, it } from "vitest";
import { parseRtpProgrammePage } from "./fetcher";

describe("RTP programme parser", () => {
  it("parses a documentary programme and its next emission", () => {
    const html = `<h1>RTP Sempre</h1>
      <div>Géneros</div><div>Documentários</div>
      <div>Informação Adicional</div><div>Série de 26 episódios que marcam a identidade portuguesa</div>
      <div>Próximas emissões deste programa</div>
      <div>25 Set 2026</div><div>00:33</div><div>RTP Memória</div>
      <div>Rever últimos episódios no RTP Play</div>`;
    const result = parseRtpProgrammePage(html, "https://www.rtp.pt/programa/tv/p31980", 2026);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "RTP Sempre", channel: "RTP Memória", genre: "Documentários",
      startAt: "2026-09-25T00:33:00+01:00", seriesTitle: "RTP Sempre",
      description: "Série de 26 episódios que marcam a identidade portuguesa",
    });
  });

  it("extracts episode number when present", () => {
    const html = `<h1>Como Se Faz</h1><div>Géneros Documentários</div><div>Episódio n.º 9 de 12</div><div>Próximas emissões deste programa</div><div>25 Set 2026</div><div>20:30</div><div>RTP Madeira</div>`;
    const result = parseRtpProgrammePage(html, "https://www.rtp.pt/programa/tv/p48773/e9", 2026);
    expect(result[0]).toMatchObject({ seriesTitle: "Como Se Faz", episode: 9 });
  });

  it("rejects non-documentary programme pages", () => {
    const html = `<h1>Programa X</h1><div>Géneros</div><div>Informação</div>`;
    expect(parseRtpProgrammePage(html, "https://www.rtp.pt/programa/tv/p1", 2026)).toEqual([]);
  });
});
