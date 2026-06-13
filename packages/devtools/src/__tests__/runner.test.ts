import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { parseStateFile, runDesloppifyScan } from "../desloppify/runner.js";

describe("parseStateFile", () => {
  it("parses a valid state file", () => {
    const dir = join(tmpdir(), `runner-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const statePath = join(dir, "state.json");
    const state = {
      version: 1,
      overall_score: 85,
      objective_score: 90,
      strict_score: 80,
      work_items: {},
    };
    writeFileSync(statePath, JSON.stringify(state));

    const result = parseStateFile(statePath);
    expect(result.overall_score).toBe(85);
    expect(result.work_items).toEqual({});
  });

  it("throws a descriptive error for malformed JSON", () => {
    const dir = join(tmpdir(), `runner-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const statePath = join(dir, "state.json");
    writeFileSync(statePath, "{ not valid json }}");

    expect(() => parseStateFile(statePath)).toThrow(
      /Failed to parse desloppify state file/,
    );
  });

  it("includes the file path in the error message", () => {
    const dir = join(tmpdir(), `runner-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const statePath = join(dir, "state.json");
    writeFileSync(statePath, "invalid");

    expect(() => parseStateFile(statePath)).toThrow(statePath);
  });

  it("parses a state file with work_items", () => {
    const dir = join(tmpdir(), `runner-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const statePath = join(dir, "state.json");
    const state = {
      version: 1,
      overall_score: 70,
      objective_score: 75,
      strict_score: 65,
      work_items: {
        "item-1": {
          id: "item-1",
          detector: "console-error",
          file: "src/foo.ts",
          tier: 2,
          confidence: "high",
          summary: "console.error without throw",
          status: "open",
        },
      },
    };
    writeFileSync(statePath, JSON.stringify(state));

    const result = parseStateFile(statePath);
    expect(result.overall_score).toBe(70);
    expect(Object.keys(result.work_items)).toHaveLength(1);
    expect(result.work_items["item-1"]?.detector).toBe("console-error");
  });
});

describe("runDesloppifyScan", () => {
  it("throws when the repo path does not exist", () => {
    expect(() =>
      runDesloppifyScan({
        repo: "/nonexistent/path/that/does/not/exist",
        profile: "objective",
      }),
    ).toThrow(/does not exist/);
  });
});
