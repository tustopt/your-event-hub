import { describe, expect, it } from "vitest";
import { getLisbonDate, getLisbonOffset } from "./time";

describe("Lisbon television time helpers", () => {
  it("uses the Portuguese calendar date rather than UTC at midnight", () => {
    expect(getLisbonDate(new Date("2026-09-22T23:30:00.000Z"))).toBe("2026-09-23");
    expect(getLisbonDate(new Date("2026-09-23T00:30:00.000Z"))).toBe("2026-09-23");
  });

  it("handles summer and winter Lisbon offsets", () => {
    expect(getLisbonOffset("2026-09-23", "20:00")).toBe("+01:00");
    expect(getLisbonOffset("2026-01-15", "20:00")).toBe("+00:00");
  });

  it("handles calendar-day rollover in both directions", () => {
    const now = new Date("2026-09-22T23:30:00.000Z");
    expect(getLisbonDate(now, -1)).toBe("2026-09-22");
    expect(getLisbonDate(now, 1)).toBe("2026-09-24");
  });
});
