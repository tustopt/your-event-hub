import { describe, expect, it } from "vitest";
import { getProductionSources, getSourceDefinition } from "./source-registry";

describe("production television sources", () => {
  it("exposes RTP, SIC and TVI as production sources", () => {
    const sources = getProductionSources().filter((source) =>
      ["rtp", "sic", "tvi"].includes(source.key),
    );
    expect(sources.map((source) => source.key).sort()).toEqual(["rtp", "sic", "tvi"]);
    expect(sources.every((source) => source.adapterKey === source.key)).toBe(true);
  });

  it.each(["rtp", "sic", "tvi"])("%s has production metadata", (key) => {
    const source = getSourceDefinition(key);
    expect(source?.category).toBe("television");
    expect(source?.status).toBe("production");
    expect(source?.adapterKey).toBe(key);
    expect(source?.countryCode).toBe("PT");
  });
});

describe("cinema and film festival source registry", () => {
  it("registers researched Portuguese cinema candidates without enabling them in production", () => {
    const cinemaCandidates = ["cinema_ideal", "cinema_medeia_nimas"];

    for (const key of cinemaCandidates) {
      const source = getSourceDefinition(key);
      expect(source?.category).toBe("cinema");
      expect(source?.status).toBe("candidate");
      expect(source?.adapterKey).toBeUndefined();
      expect(source?.countryCode).toBe("PT");
    }
  });

  it("registers researched Portuguese festival candidates without enabling them in production", () => {
    const festivalCandidates = ["curtas_vila_do_conde", "indielisboa", "leffest"];

    for (const key of festivalCandidates) {
      const source = getSourceDefinition(key);
      expect(source?.category).toBe("festival");
      expect(source?.status).toBe("candidate");
      expect(source?.adapterKey).toBeUndefined();
      expect(source?.countryCode).toBe("PT");
    }
  });
});
