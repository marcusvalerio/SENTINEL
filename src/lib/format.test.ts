import { describe, expect, it } from "vitest";
import { centsToInput, formatDate, formatRelative, parseMoneyToCents } from "./format";

describe("parseMoneyToCents", () => {
  it.each([
    ["12.500,90", 1250090],
    ["R$ 1.200", 120000],
    ["1200.5", 120050],
    ["1,5", 150],
    ["1.234.567", 123456700],
    ["1,234.56", 123456],
    ["0", 0],
  ])("parses %s", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it("returns null for empty input", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("   ")).toBeNull();
  });

  it("round-trips through centsToInput", () => {
    expect(parseMoneyToCents(centsToInput(1250090))).toBe(1250090);
  });
});

describe("dates", () => {
  it("never shifts calendar dates across time zones", () => {
    expect(formatDate("2026-09-24", "numeric")).toBe("24/09/2026");
  });

  it("formats relative time", () => {
    const now = new Date("2026-09-25T12:00:00Z");
    expect(formatRelative(new Date("2026-09-25T11:59:50Z"), now)).toBe("agora");
    expect(formatRelative(new Date("2026-09-24T12:00:00Z"), now)).toBe("ontem");
  });
});
