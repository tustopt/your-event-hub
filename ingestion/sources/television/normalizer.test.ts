import { describe, expect, it } from "vitest";
import { normalizeTelevisionProgramme } from "./normalizer";

describe("television normalizer", () => {
  it("normalizes documentary metadata generically", () => {
    const result = normalizeTelevisionProgramme({
      sourceExternalId: "abc",
      sourceUrl: "https://example.test/programme",
      broadcasterKey: "example",
      channel: "Example TV",
      title: "  A Documentary  ",
      genre: "Documentário",
      startAt: "2026-09-22T20:00:00+01:00",
      imageUrl: " https://cdn.example.test/poster.jpg ",
      seriesTitle: "A Series",
      episode: 2,
    });

    expect(result).toMatchObject({
      eventType: "television",
      sourceExternalId: "abc",
      sourceUrl: "https://example.test/programme",
      title: "A Documentary",
      broadcasterKey: "example",
      channel: "Example TV",
      genre: "documentary",
      imageUrl: "https://cdn.example.test/poster.jpg",
      seriesTitle: "A Series",
      episode: 2,
    });
  });

  it("rejects non-documentary programmes", () => {
    expect(normalizeTelevisionProgramme({
      sourceExternalId: "abc",
      sourceUrl: "https://example.test/programme",
      broadcasterKey: "example",
      channel: "Example TV",
      title: "Entertainment",
      genre: "Entretenimento",
      startAt: "2026-09-22T20:00:00+01:00",
    })).toBeUndefined();
  });
});
