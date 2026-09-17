import { describe, expect, it } from "vitest";
import type { SourceAdapter } from "./contracts";
import { createAdapterRegistry, resolveSourceAdapter } from "./adapter-registry";

const cinematecaAdapter: SourceAdapter = {
  key: "cinemateca_pt",
  sourceType: "website",
  parse: () => ({ events: [], screenings: [], warnings: [] }),
};

describe("adapter registry", () => {
  it("resolves an installed adapter by source key", () => {
    const registry = createAdapterRegistry([cinematecaAdapter]);
    expect(resolveSourceAdapter("cinemateca_pt", registry)).toBe(cinematecaAdapter);
  });

  it("rejects duplicate adapter keys", () => {
    expect(() => createAdapterRegistry([cinematecaAdapter, cinematecaAdapter])).toThrow(
      "Duplicate source adapter key: cinemateca_pt",
    );
  });

  it("rejects a registered source without an installed adapter", () => {
    const registry = createAdapterRegistry([]);
    expect(() => resolveSourceAdapter("cinemateca_pt", registry)).toThrow(
      "Adapter not installed for source: cinemateca_pt",
    );
  });

  it("rejects unknown sources", () => {
    const registry = createAdapterRegistry([]);
    expect(() => resolveSourceAdapter("does_not_exist", registry)).toThrow(
      "Unknown DocuEvents source: does_not_exist",
    );
  });
});
