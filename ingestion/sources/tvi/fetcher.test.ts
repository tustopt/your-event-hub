import { describe, expect, it } from "vitest";
import { fetchTviProgramme, isTviDocumentaryText, parseTviScheduleHtml } from "./fetcher";

describe("TVI schedule parser", () => {
  it("parses documentary entries from the TVI daily grid", () => {
    const html = `
      <div class="guiatv-linha">
        <div class="hora">23:10</div>
        <h2>Os Últimos Paraísos na Terra</h2>
        <div class="texto texto2">Série documental sobre natureza e território.</div>
        <a href="/programas/os-ultimos-paraisos-na-terra">Ver programa</a>
      </div>
      <div class="guiatv-linha">
        <div class="hora">00:30</div>
        <h2>Novela Exemplo</h2>
        <div class="texto texto2">Uma história de ficção.</div>
      </div>
    `;

    const result = parseTviScheduleHtml(html, "2026-09-23");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      broadcasterKey: "tvi",
      channel: "TVI",
      title: "Os Últimos Paraísos na Terra",
      genre: "Documentários",
      startAt: "2026-09-23T23:10:00+01:00",
      sourceUrl: "https://tvi.iol.pt/programas/os-ultimos-paraisos-na-terra",
    });
  });

  it("recognizes documentary text independently", () => {
    expect(isTviDocumentaryText("Série documental sobre a natureza")).toBe(true);
    expect(isTviDocumentaryText("Novela de ficção")).toBe(false);
  });

  it("fetches today and tomorrow using the TVI date endpoint", async () => {
    const urls: string[] = [];
    const responses = [
      new Response('<div class="guiatv-linha"><div class="hora">20:00</div><h2>Documentário</h2></div>', { status: 200 }),
      new Response('<div class="guiatv-linha"><div class="hora">21:00</div><h2>Outro Documentário</h2></div>', { status: 200 }),
    ];

    await fetchTviProgramme({
      now: () => new Date("2026-09-23T10:00:00Z"),
      fetchImpl: async (input) => {
        urls.push(String(input));
        return responses.shift()!;
      },
    });

    expect(urls).toEqual([
      "https://tvi.iol.pt/emissao/dia/tvi?data=2026-09-23",
      "https://tvi.iol.pt/emissao/dia/tvi?data=2026-09-24",
    ]);
  });
});
