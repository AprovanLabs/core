import { describe, it, expect, vi } from "vitest";
import { createIssuesFromScanResult } from "../multica/issue-creator.js";
import type { ScanResult } from "../desloppify/types.js";

const baseScanResult: ScanResult = {
  repo: "core",
  profile: "objective",
  timestamp: "2026-01-01T00:00:00.000Z",
  packages: [
    {
      name: "@aprovan/api",
      path: "packages/api",
      score: { overall: 72, objective: 75, strict: 65 },
      issues: [
        {
          tier: 1,
          category: "no-input-validation",
          message: "Handler accepts unvalidated body",
          file: "src/routes/users.ts",
          line: 42,
          detector: "no-input-validation",
          id: "abc1",
          status: "open",
          confidence: "high",
        },
        {
          tier: 1,
          category: "no-input-validation",
          message: "Handler accepts unvalidated query",
          file: "src/routes/posts.ts",
          line: 18,
          detector: "no-input-validation",
          id: "abc2",
          status: "open",
          confidence: "high",
        },
        {
          tier: 2,
          category: "missing-tests",
          message: "No test file for src/services/auth.ts",
          file: "src/services/auth.ts",
          line: null,
          detector: "missing-tests",
          id: "abc3",
          status: "open",
          confidence: "medium",
        },
        {
          tier: 3,
          category: "style",
          message: "Missing trailing newline",
          file: "src/index.ts",
          line: 1,
          detector: "style",
          id: "abc4",
          status: "open",
          confidence: "low",
        },
      ],
    },
  ],
};

describe("createIssuesFromScanResult", () => {
  it("returns dry-run results without calling the executor", () => {
    const executor = vi.fn();
    const result = createIssuesFromScanResult(baseScanResult, {
      dryRun: true,
      executor,
    });

    expect(executor).not.toHaveBeenCalled();
    expect(result.created).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.created.every((c) => c.dryRun)).toBe(true);
  });

  it("groups findings by detector in dry-run mode", () => {
    const result = createIssuesFromScanResult(baseScanResult, { dryRun: true });

    const t1Group = result.created.find((c) => c.detector === "no-input-validation");
    expect(t1Group).toBeDefined();
    expect(t1Group!.findingCount).toBe(2);
    expect(t1Group!.tier).toBe(1);
  });

  it("respects maxTier filter in dry-run mode", () => {
    const result = createIssuesFromScanResult(baseScanResult, {
      dryRun: true,
      maxTier: 1,
    });

    expect(result.created).toHaveLength(1);
    expect(result.created[0]!.tier).toBe(1);
  });

  it("excludes T3 findings when maxTier is 2 (default)", () => {
    const result = createIssuesFromScanResult(baseScanResult, { dryRun: true });

    const t3 = result.created.find((c) => c.tier === 3);
    expect(t3).toBeUndefined();
  });

  it("builds issue title with repo, detector, package", () => {
    const result = createIssuesFromScanResult(baseScanResult, { dryRun: true });

    const t1 = result.created.find((c) => c.detector === "no-input-validation");
    expect(t1!.title).toMatch(/\[desloppify\]/);
    expect(t1!.title).toMatch(/\[T1\]/);
    expect(t1!.title).toMatch(/no-input-validation/);
    expect(t1!.title).toMatch(/@aprovan\/api/);
    expect(t1!.title).toMatch(/core/);
  });

  it("calls the executor once per finding group when not dry-run", () => {
    const executor = vi.fn().mockReturnValue(
      "Created issue 11111111-2222-3333-4444-555555555555",
    );

    const result = createIssuesFromScanResult(baseScanResult, { executor });

    expect(executor).toHaveBeenCalledTimes(2);
    expect(result.created).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    const cmd = executor.mock.calls[0]![0] as string;
    expect(cmd).toMatch(/multica issue create/);
    expect(cmd).toMatch(/--title/);
    expect(cmd).toMatch(/--priority critical/);
  });

  it("includes --parent when parentIssueId is provided", () => {
    const executor = vi.fn().mockReturnValue("Created issue abc");

    createIssuesFromScanResult(baseScanResult, {
      parentIssueId: "0d0853e2-b0e0-45ce-a52e-d30066fe2d1d",
      executor,
    });

    const cmd = executor.mock.calls[0]![0] as string;
    expect(cmd).toMatch(/--parent 0d0853e2-b0e0-45ce-a52e-d30066fe2d1d/);
  });

  it("includes --project when projectId is provided", () => {
    const executor = vi.fn().mockReturnValue("Created issue abc");

    createIssuesFromScanResult(baseScanResult, {
      projectId: "proj-uuid-123",
      executor,
    });

    const cmd = executor.mock.calls[0]![0] as string;
    expect(cmd).toMatch(/--project proj-uuid-123/);
  });

  it("uses priority high for T2 issues", () => {
    const executor = vi.fn().mockReturnValue("Created issue abc");

    createIssuesFromScanResult(baseScanResult, { executor });

    const t2Call = executor.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes("--priority high"),
    );
    expect(t2Call).toBeDefined();
  });

  it("captures executor errors without throwing", () => {
    const executor = vi.fn().mockImplementation(() => {
      throw new Error("multica CLI not found");
    });

    const result = createIssuesFromScanResult(baseScanResult, { executor });

    expect(result.errors).toHaveLength(2);
    expect(result.created).toHaveLength(0);
    expect(result.errors[0]!.error).toMatch(/multica CLI not found/);
  });

  it("handles a scan result with no T1/T2 issues", () => {
    const emptyResult: ScanResult = {
      ...baseScanResult,
      packages: [
        {
          ...baseScanResult.packages[0]!,
          issues: baseScanResult.packages[0]!.issues.filter((i) => i.tier === 3),
        },
      ],
    };

    const result = createIssuesFromScanResult(emptyResult, { dryRun: true });

    expect(result.created).toHaveLength(0);
  });

  it("handles a scan result with no packages", () => {
    const noPackages: ScanResult = { ...baseScanResult, packages: [] };

    const result = createIssuesFromScanResult(noPackages, { dryRun: true });

    expect(result.created).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
