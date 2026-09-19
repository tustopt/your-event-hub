import { describe, expect, it } from "vitest";
import {
  getDateFilterRange,
  matchesExploreFilter,
  matchesExploreQuery,
  matchesFilmQuery,
  normalizeSearch,
} from "./filters";

describe("explore filters", () => {
  it("normalizes Portuguese search terms", () => {
    expect(normalizeSearch("  CINEMATECA  ")).toBe("cinemateca");
  });

  it("searches event title, venue and festival", () => {
    const event = {
      title: "Sessão especial",
      description: "Documentário português",
      type: "screening",
      start_at: "2026-09-20T18:00:00Z",
      venues: { name: "Cinema São Jorge", city: "Lisboa" },
      festivals: { name: "Doclisboa" },
    };

    expect(matchesExploreQuery(event, "São Jorge")).toBe(true);
    expect(matchesExploreQuery(event, "doclisboa")).toBe(true);
    expect(matchesExploreQuery(event, "Porto")).toBe(false);
  });

  it("searches film title, synopsis and year", () => {
    const film = {
      title: "Lisboa documental",
      synopsis: "Uma história da cidade",
      year: 2026,
    };

    expect(matchesFilmQuery(film, "2026")).toBe(true);
    expect(matchesFilmQuery(film, "cidade")).toBe(true);
    expect(matchesFilmQuery(film, "Cinemateca")).toBe(false);
  });

  it("returns today's date range", () => {
    const now = new Date(2026, 8, 19, 13, 0);
    const { from, to } = getDateFilterRange("today", now);

    expect(from).toEqual(new Date(2026, 8, 19, 0, 0));
    expect(to).toEqual(new Date(2026, 8, 20, 0, 0));
  });

  it("returns the current weekend range when today is Saturday", () => {
    const now = new Date(2026, 8, 19, 13, 0);
    const { from, to } = getDateFilterRange("weekend", now);

    expect(from).toEqual(new Date(2026, 8, 19, 0, 0));
    expect(to).toEqual(new Date(2026, 8, 21, 0, 0));
  });

  it("filters by city and festival", () => {
    const event = {
      title: "Festival de cinema",
      description: null,
      type: "screening",
      start_at: "2026-09-20T18:00:00",
      venues: { name: "Cinema", city: "Lisboa" },
      festivals: { name: "Doclisboa" },
    };

    expect(matchesExploreFilter(event, "city-lisboa")).toBe(true);
    expect(matchesExploreFilter(event, "city-porto")).toBe(false);
    expect(matchesExploreFilter(event, "festivals")).toBe(true);
  });
});
