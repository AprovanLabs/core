import { describe, it, expect } from "vitest";
import {
  DEFAULT_EXCLUSIONS,
  formatExclusions,
} from "../desloppify/exclusions.js";

describe("formatExclusions", () => {
  it("prepends --exclude= to each pattern", () => {
    const result = formatExclusions(["node_modules", "dist"]);
    expect(result).toEqual([
      "--exclude=node_modules",
      "--exclude=dist",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(formatExclusions([])).toEqual([]);
  });

  it("handles glob patterns", () => {
    const result = formatExclusions(["*.min.js", "*.bundle.js"]);
    expect(result).toEqual([
      "--exclude=*.min.js",
      "--exclude=*.bundle.js",
    ]);
  });

  it("handles patterns with slashes", () => {
    const result = formatExclusions([".git", ".desloppify"]);
    expect(result).toEqual([
      "--exclude=.git",
      "--exclude=.desloppify",
    ]);
  });
});

describe("DEFAULT_EXCLUSIONS", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(DEFAULT_EXCLUSIONS)).toBe(true);
    expect(DEFAULT_EXCLUSIONS.length).toBeGreaterThan(0);
    for (const item of DEFAULT_EXCLUSIONS) {
      expect(typeof item).toBe("string");
    }
  });

  it("excludes node_modules", () => {
    expect(DEFAULT_EXCLUSIONS).toContain("node_modules");
  });

  it("excludes dist", () => {
    expect(DEFAULT_EXCLUSIONS).toContain("dist");
  });

  it("excludes .desloppify", () => {
    expect(DEFAULT_EXCLUSIONS).toContain(".desloppify");
  });

  it("excludes .multica", () => {
    expect(DEFAULT_EXCLUSIONS).toContain(".multica");
  });

  it("excludes .agents", () => {
    expect(DEFAULT_EXCLUSIONS).toContain(".agents");
  });

  it("excludes .git", () => {
    expect(DEFAULT_EXCLUSIONS).toContain(".git");
  });

  it("works with formatExclusions round-trip", () => {
    const formatted = formatExclusions(DEFAULT_EXCLUSIONS);
    expect(formatted).toHaveLength(DEFAULT_EXCLUSIONS.length);
    expect(formatted[0]).toBe(`--exclude=${DEFAULT_EXCLUSIONS[0]}`);
  });
});
