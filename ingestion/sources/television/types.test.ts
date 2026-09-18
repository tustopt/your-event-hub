import { describe, expect, it } from "vitest";
import { isDocumentaryProgramme } from "./types";

describe("television documentary filter", () => {
  it("accepts documentary genres", () => {
    expect(isDocumentaryProgramme({ genre: "Documentários" })).toBe(true);
    expect(isDocumentaryProgramme({ genre: "Série documental" })).toBe(true);
    expect(isDocumentaryProgramme({ genre: "Documentary" })).toBe(true);
  });

  it("rejects non-documentary genres", () => {
    expect(isDocumentaryProgramme({ genre: "Informação" })).toBe(false);
    expect(isDocumentaryProgramme({ genre: "Ficção" })).toBe(false);
    expect(isDocumentaryProgramme({ genre: undefined })).toBe(false);
  });
});
