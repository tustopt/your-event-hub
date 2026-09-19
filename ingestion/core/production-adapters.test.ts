import { describe, expect, it } from "vitest";
import { createProductionAdapterRegistry, productionAdapters } from "./production-adapters";

describe("production adapter registry", () => {
  it("contains all implemented sources", () => {
    const registry = createProductionAdapterRegistry();
    expect(productionAdapters).toHaveLength(5);
    expect(registry.get("cinemateca_pt")?.sourceType).toBe("website");
    expect(registry.get("cinema_sao_jorge")?.sourceType).toBe("website");
    expect(registry.get("cinema_fernando_lopes")?.sourceType).toBe("website");
    expect(registry.get("doclisboa")?.sourceType).toBe("website");
    expect(registry.get("rtp")?.sourceType).toBe("website");
  });

  it("resolves each adapter through the shared registry", () => {
    const registry = createProductionAdapterRegistry();
    expect(registry.has("cinemateca_pt")).toBe(true);
    expect(registry.has("cinema_sao_jorge")).toBe(true);
    expect(registry.has("cinema_fernando_lopes")).toBe(true);
    expect(registry.has("doclisboa")).toBe(true);
    expect(registry.has("rtp")).toBe(true);
  });
});
