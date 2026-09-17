import { describe, expect, it } from "vitest";
import { buildFilmIdentity, filmIdentitiesMatch } from "./entity-resolution";

describe("film entity resolution", () => {
  it("prefers IMDb identifiers", () => {
    expect(buildFilmIdentity({ title: "E LA NAVE VA", imdbId: "tt0090196" })).toEqual({
      canonicalKey: "imdb:tt0090196",
      confidence: "strong",
    });
  });

  it("prefers TMDb identifiers when IMDb is unavailable", () => {
    expect(buildFilmIdentity({ title: "E LA NAVE VA", tmdbId: "116" })).toEqual({
      canonicalKey: "tmdb:116",
      confidence: "strong",
    });
  });

  it("normalizes accents and punctuation in title-based keys", () => {
    const identity = buildFilmIdentity({
      title: "Àrvore, A Cidade!",
      year: 2026,
      director: "José Silva",
    });

    expect(identity.canonicalKey).toBe(
      "title:arvore a cidade|year:2026|director:jose silva",
    );
    expect(identity.confidence).toBe("probable");
  });

  it("matches equivalent title, year and director data", () => {
    expect(
      filmIdentitiesMatch(
        { title: "E LA NAVE VA", year: 1983, director: "Federico Fellini" },
        { title: "E la nave va", year: 1983, director: "Federico Fellini" },
      ),
    ).toBe(true);
  });

  it("does not automatically merge weak title-only matches", () => {
    expect(
      filmIdentitiesMatch(
        { title: "Turandot" },
        { title: "Turandot" },
      ),
    ).toBe(false);
  });
});
