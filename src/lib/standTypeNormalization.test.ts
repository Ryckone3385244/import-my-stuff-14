import { describe, it, expect } from "vitest";
import { normalizeStandType, isValidStandType, ALLOWED_STAND_TYPES } from "./standTypeNormalization";

describe("normalizeStandType", () => {
  it("returns null for null/undefined/empty", () => {
    expect(normalizeStandType(null)).toBeNull();
    expect(normalizeStandType(undefined)).toBeNull();
    expect(normalizeStandType("")).toBeNull();
    expect(normalizeStandType("   ")).toBeNull();
  });

  it("normalizes 'Pipe and Drape' variations", () => {
    expect(normalizeStandType("pipe and drape")).toBe("Pipe and Drape");
    expect(normalizeStandType("Pipe & Drape")).toBe("Pipe and Drape");
    expect(normalizeStandType("P&D")).toBe("Pipe and Drape");
    expect(normalizeStandType("pipeanddrape")).toBe("Pipe and Drape");
    expect(normalizeStandType("pipe&drape")).toBe("Pipe and Drape");
    expect(normalizeStandType("pd")).toBe("Pipe and Drape");
  });

  it("normalizes 'Shell' variations", () => {
    expect(normalizeStandType("shell")).toBe("Shell");
    expect(normalizeStandType("Shell")).toBe("Shell");
    expect(normalizeStandType("SHELL")).toBe("Shell");
    expect(normalizeStandType("shell scheme")).toBe("Shell");
    expect(normalizeStandType("shellscheme")).toBe("Shell");
  });

  it("normalizes 'Space only' variations", () => {
    expect(normalizeStandType("space only")).toBe("Space only");
    expect(normalizeStandType("Space only")).toBe("Space only");
    expect(normalizeStandType("spaceonly")).toBe("Space only");
    expect(normalizeStandType("space-only")).toBe("Space only");
    expect(normalizeStandType("space")).toBe("Space only");
    expect(normalizeStandType("raw space")).toBe("Space only");
  });

  it("returns null for invalid values", () => {
    expect(normalizeStandType("table")).toBeNull();
    expect(normalizeStandType("booth")).toBeNull();
    expect(normalizeStandType("random")).toBeNull();
  });

  it("handles exact allowed values", () => {
    ALLOWED_STAND_TYPES.forEach((type) => {
      expect(normalizeStandType(type)).toBe(type);
    });
  });
});

describe("isValidStandType", () => {
  it("returns true for null/undefined (allowed)", () => {
    expect(isValidStandType(null)).toBe(true);
    expect(isValidStandType(undefined)).toBe(true);
  });

  it("returns true for valid stand types", () => {
    expect(isValidStandType("Pipe and Drape")).toBe(true);
    expect(isValidStandType("Shell")).toBe(true);
    expect(isValidStandType("Space only")).toBe(true);
  });

  it("returns false for invalid stand types", () => {
    expect(isValidStandType("pipe and drape")).toBe(false);
    expect(isValidStandType("booth")).toBe(false);
    expect(isValidStandType("random")).toBe(false);
  });
});
