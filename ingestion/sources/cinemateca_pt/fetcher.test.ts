import { describe, expect, it } from "vitest";
import { fetchCinematecaProgramme } from "./fetcher";

const SOURCE_URL = "https://www.cinemateca.pt/Programacao%20.aspx?ciclo=2098";

function mockFetch(html: string): typeof fetch {
  return async () =>
    new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
}

describe("fetchCinematecaProgramme", () => {
  it("extracts screenings and ignores cycle summary blocks", async () => {
    const html = `
      <div>01/09/2026, 21h30 | Sala M. Félix Ribeiro</div>
      <div>Ciclo CINE-ÓPERA</div><div>E LA NAVE VA</div><div>O Navio</div>
      <div>de Federico Fellini</div><div>Itália, 1983 - 128 min</div>
      <div>02/09/2026, 19h30 | Sala Luís de Pina</div>
      <div>Ciclo CINE-ÓPERA</div><div>TURANDOT</div>
      <div>de Felix Breisach</div><div>Áustria, Alemanha, Suíça, 2015 - 123 min</div>
      <div>08/09/2026, 15h30 | Sala M. Félix Ribeiro</div>
      <div>Ciclo CINE-ÓPERA</div><div>AMADEUS</div><div>Amadeus</div>
      <div>de Milos Forman</div><div>Estados Unidos, 1984 - 160 min</div>
      <div>10/09/2026, 19h00 | Sala M. Félix Ribeiro</div>
      <div>Ciclo CINE-ÓPERA</div><div>ARIA</div>
      <div>de Robert Altman, Bruce Beresford, Bill Bryden, Jean-Luc Godard, Derek Jarman, Franc Roddam, Nicolas Roeg, Ken Russell, Charles Sturridge, Julien Temple</div>
      <div>Reino Unido, França, Estados Unidos, 1987 - 90 min</div>
      <div>01/09/2026, 21h30 | Sala M. Félix Ribeiro</div>
      <div>Ciclo CINE-ÓPERA</div><div>CINE-ÓPERA</div>
      <div>Em colaboração com o Operafest Lisboa e Oeiras 2026</div>
      <div>de Federico Fellini</div><div>Itália, 1983 - 128 min</div>
    `;

    const items = await fetchCinematecaProgramme({ url: SOURCE_URL, fetchImpl: mockFetch(html) });
    expect(items).toHaveLength(4);
    expect(items.map((item) => item.title)).toEqual(["E LA NAVE VA", "TURANDOT", "AMADEUS", "ARIA"]);
    expect(items.map((item) => item.sourceExternalId)).toEqual([
      "2026-09-01-2130-e-la-nave-va",
      "2026-09-02-1930-turandot",
      "2026-09-08-1530-amadeus",
      "2026-09-10-1900-aria",
    ]);
  });

  it("preserves original titles and multiple directors/countries", async () => {
    const html = `
      <div>01/09/2026, 21h30 | Sala M. Félix Ribeiro</div><div>Ciclo CINE-ÓPERA</div>
      <div>E LA NAVE VA</div><div>O Navio</div><div>de Federico Fellini</div><div>Itália, 1983 - 128 min</div>
      <div>10/09/2026, 19h00 | Sala M. Félix Ribeiro</div><div>Ciclo CINE-ÓPERA</div><div>ARIA</div>
      <div>de Robert Altman, Bruce Beresford, Bill Bryden, Jean-Luc Godard, Derek Jarman, Franc Roddam, Nicolas Roeg, Ken Russell, Charles Sturridge, Julien Temple</div>
      <div>Reino Unido, França, Estados Unidos, 1987 - 90 min</div>
    `;
    const items = await fetchCinematecaProgramme({ fetchImpl: mockFetch(html) });
    expect(items[0]).toMatchObject({ title: "E LA NAVE VA", originalTitle: "O Navio", director: "Federico Fellini", country: "Itália", year: 1983, durationMinutes: 128, venue: "Sala M. Félix Ribeiro", cycle: "CINE-ÓPERA" });
    expect(items[1]).toMatchObject({ title: "ARIA", director: "Robert Altman, Bruce Beresford, Bill Bryden, Jean-Luc Godard, Derek Jarman, Franc Roddam, Nicolas Roeg, Ken Russell, Charles Sturridge, Julien Temple", country: "Reino Unido, França, Estados Unidos", year: 1987, durationMinutes: 90 });
  });

  it("decodes HTML entities and repairs UTF-8 mojibake in programme metadata", async () => {
    const html = `
      <div>01/09/2026, 21h30 | Sala M. F\u00e9lix Ribeiro</div>
      <div>Ciclo CINE-&amp;#211;PERA</div>
      <div>E LA NAVE VA</div><div>O Navio</div><div>de Federico Fellini</div>
      <div>It\u00e1lia, 1983 - 128 min</div>
    `.replace("&amp;#211;", "Ã“");

    const items = await fetchCinematecaProgramme({ fetchImpl: mockFetch(html) });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      venue: "Sala M. F\u00e9lix Ribeiro",
      cycle: "CINE-ÓPERA",
      country: "Itália",
    });
  });

  it("deduplicates repeated programme blocks by sourceExternalId", async () => {
    const html = `
      <div>01/09/2026, 21h30 | Sala M. Félix Ribeiro</div><div>Ciclo CINE-ÓPERA</div><div>E LA NAVE VA</div><div>O Navio</div><div>de Federico Fellini</div><div>Itália, 1983 - 128 min</div>
      <div>01/09/2026, 21h30 | Sala M. Félix Ribeiro</div><div>Ciclo CINE-ÓPERA</div><div>E LA NAVE VA</div><div>O Navio</div><div>de Federico Fellini</div><div>Itália, 1983 - 128 min</div>
    `;
    const items = await fetchCinematecaProgramme({ fetchImpl: mockFetch(html) });
    expect(items).toHaveLength(1);
    expect(items[0].sourceExternalId).toBe("2026-09-01-2130-e-la-nave-va");
  });
});
