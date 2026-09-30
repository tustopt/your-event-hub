import { describe, expect, it, vi } from "vitest";
import { enrichAdapterResultImages, extractSourceImageUrl, resolveSourceImageUrl } from "./image-resolver";

describe("image resolver", () => {
  it("prefers og:image and resolves relative URLs", () => {
    expect(extractSourceImageUrl('<meta property="og:image" content="/images/poster.jpg">', "https://example.test/programa")).toBe("https://example.test/images/poster.jpg");
  });

  it("falls back to lazy image attributes", () => {
    expect(extractSourceImageUrl('<img data-src="/poster.jpg" alt="poster">', "https://example.test/programa")).toBe("https://example.test/poster.jpg");
  });

  it("resolves an image from a source page", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo, _init?: RequestInit) => new Response('<meta property="og:image" content="https://cdn.example.test/poster.jpg">', { status: 200 }));
    await expect(resolveSourceImageUrl("https://example.test/programa", { fetchImpl })).resolves.toBe("https://cdn.example.test/poster.jpg");
  });

  it("enriches missing TV and film images without replacing existing images", async () => {
    type TestFilm = { imageUrl?: string; provenance: { sourceUrl?: string } };
    type TestTvProgram = { imageUrl?: string; sourceUrl?: string; provenance: { sourceUrl?: string } };
    const fetchImpl = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      return new Response('<meta property="og:image" content="https://cdn.example.test/' + (url.includes("tv") ? "tv" : "film") + '.jpg">', { status: 200 });
    });
    const result: {
      screenings: Array<{ films: Array<{ film: TestFilm }> }>;
      tvPrograms: TestTvProgram[];
    } = {
      screenings: [{ films: [{ film: { provenance: { sourceUrl: "https://example.test/film" } } }] }],
      tvPrograms: [
        { sourceUrl: "https://example.test/tv", provenance: { sourceUrl: "https://example.test/tv" } },
        { imageUrl: "https://existing.test/poster.jpg", sourceUrl: "https://example.test/other", provenance: {} },
      ],
    };
    await enrichAdapterResultImages(result, { fetchImpl });
    expect(result.screenings[0].films[0].film.imageUrl).toBe("https://cdn.example.test/film.jpg");
    expect(result.tvPrograms?.[0].imageUrl).toBe("https://cdn.example.test/tv.jpg");
    expect(result.tvPrograms?.[1].imageUrl).toBe("https://existing.test/poster.jpg");
  });
});
