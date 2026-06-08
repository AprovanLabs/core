import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, afterEach } from "vitest";
import { parseStateFile, runDesloppifyScan } from "../desloppify/runner.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

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
});

describe("runDesloppifyScan scan-loop error handling", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets error field when a package scan throws", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("desloppify command not found");
    });

    const repoDir = join(tmpdir(), `scan-error-test-${Date.now()}`);
    const pkgDir = join(repoDir, "packages", "alpha");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: "@test/alpha" }),
    );

    const result = runDesloppifyScan({
      repo: repoDir,
      packages: ["packages/alpha"],
    });

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]!.error).toContain("desloppify command not found");
    expect(result.packages[0]!.issues).toEqual([]);
  });

  it("does not set error field on a successful scan with zero issues", () => {
    vi.mocked(execSync).mockImplementation(() => Buffer.from(""));

    const repoDir = join(tmpdir(), `scan-success-test-${Date.now()}`);
    const pkgDir = join(repoDir, "packages", "beta");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: "@test/beta" }),
    );

    const result = runDesloppifyScan({
      repo: repoDir,
      packages: ["packages/beta"],
    });

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]!.error).toBeUndefined();
    expect(result.packages[0]!.issues).toEqual([]);
  });
});
