import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { DEFAULT_EXCLUSIONS, formatExclusions } from "./exclusions.js";
import type {
  DesloppifyIssue,
  PackageResult,
  RunnerOptions,
  ScanProfile,
  ScanResult,
} from "./types.js";

interface DesloppifyState {
  version: number;
  overall_score: number;
  objective_score: number;
  strict_score: number;
  work_items: Record<
    string,
    {
      id: string;
      detector: string;
      file: string;
      tier: number;
      confidence: string;
      summary: string;
      status: string;
      detail?: Record<string, unknown>;
    }
  >;
}

function run(cmd: string, label: string): void {
  console.log(`  ${label}...`);
  try {
    execSync(cmd, { stdio: "inherit", shell: "/bin/bash", timeout: 300_000 });
  } catch (err) {
    throw new Error(`Failed: ${label}\n${String(err)}`);
  }
}

export function parseStateFile(statePath: string): DesloppifyState {
  const raw = readFileSync(statePath, "utf-8");
  try {
    return JSON.parse(raw) as DesloppifyState;
  } catch (err) {
    throw new Error(
      `Failed to parse desloppify state file at ${statePath}: ${String(err)}`,
    );
  }
}

function extractIssues(state: DesloppifyState): DesloppifyIssue[] {
  return Object.values(state.work_items).map((item) => ({
    tier: item.tier,
    category: item.detector,
    message: item.summary,
    file: item.file,
    line: null,
    detector: item.detector,
    id: item.id,
    status: item.status,
    confidence: item.confidence,
  }));
}

function detectPackages(repoPath: string): string[] {
  const workspaceFile = join(repoPath, "pnpm-workspace.yaml");
  if (!existsSync(workspaceFile)) return [];

  const content = readFileSync(workspaceFile, "utf-8");
  const globLines = content
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.replace(/^\s*-\s*['"]?/, "").replace(/['"]?\s*$/, ""));

  const packages: string[] = [];
  for (const pattern of globLines) {
    const dir = pattern.replace(/\/\*$/, "");
    const fullDir = join(repoPath, dir);
    if (!existsSync(fullDir)) continue;
    for (const entry of readdirSync(fullDir, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        existsSync(join(fullDir, entry.name, "package.json"))
      ) {
        packages.push(join(dir, entry.name));
      }
    }
  }
  return packages;
}

function resolvePackageName(pkgPath: string): string {
  try {
    const pkgJson = JSON.parse(
      readFileSync(join(pkgPath, "package.json"), "utf-8"),
    );
    return (pkgJson.name as string) || basename(pkgPath);
  } catch {
    return basename(pkgPath);
  }
}

function resolveStatePath(
  stateDir: string,
  defaultStateFile: string,
): string | null {
  if (existsSync(defaultStateFile)) return defaultStateFile;

  const langStateFiles = readdirSync(stateDir)
    .filter((f) => f.startsWith("state-") && f.endsWith(".json"))
    .sort();

  if (langStateFiles.length > 0) return join(stateDir, langStateFiles[0]!);

  return null;
}

function scanPackage(
  repoPath: string,
  pkgRelPath: string,
  profile: ScanProfile,
  exclusions: string[],
  stateDir: string,
): PackageResult {
  const pkgAbsPath = resolve(repoPath, pkgRelPath);
  const pkgName = resolvePackageName(pkgAbsPath);
  const pkgStateDir = join(stateDir, pkgRelPath);
  const stateFile = join(pkgStateDir, "state.json");

  if (!existsSync(pkgStateDir)) {
    mkdirSync(pkgStateDir, { recursive: true });
  }

  const excludeArgs = formatExclusions(exclusions).join(" ");
  const scanCmd = [
    "desloppify scan",
    `--path "${pkgAbsPath}"`,
    `--state "${stateFile}"`,
    `--profile ${profile}`,
    excludeArgs,
  ]
    .filter(Boolean)
    .join(" ");

  run(scanCmd, `Scanning package: ${pkgName}`);

  const statePath = resolveStatePath(pkgStateDir, stateFile);
  if (statePath) {
    const state = parseStateFile(statePath);
    const issues = extractIssues(state);
    return {
      name: pkgName,
      path: pkgRelPath,
      score: {
        overall: state.overall_score,
        objective: state.objective_score,
        strict: state.strict_score,
      },
      issues,
    };
  }

  return {
    name: pkgName,
    path: pkgRelPath,
    score: { overall: 0, objective: 0, strict: 0 },
    issues: [],
  };
}

function scanWholeRepo(
  repoPath: string,
  profile: ScanProfile,
  exclusions: string[],
  stateDir: string,
): PackageResult {
  const stateFile = join(stateDir, "state.json");

  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  const excludeArgs = formatExclusions(exclusions).join(" ");
  const scanCmd = [
    "desloppify scan",
    `--path "${repoPath}"`,
    `--state "${stateFile}"`,
    `--profile ${profile}`,
    excludeArgs,
  ]
    .filter(Boolean)
    .join(" ");

  run(scanCmd, `Scanning repo: ${basename(repoPath)}`);

  const statePath = resolveStatePath(stateDir, stateFile);
  if (statePath) {
    const state = parseStateFile(statePath);
    const issues = extractIssues(state);
    return {
      name: basename(repoPath),
      path: ".",
      score: {
        overall: state.overall_score,
        objective: state.objective_score,
        strict: state.strict_score,
      },
      issues,
    };
  }

  return {
    name: basename(repoPath),
    path: ".",
    score: { overall: 0, objective: 0, strict: 0 },
    issues: [],
  };
}

export function runDesloppifyScan(options: RunnerOptions): ScanResult {
  const {
    repo,
    packages: explicitPackages,
    profile = "objective",
    exclusions = DEFAULT_EXCLUSIONS,
    stateDir,
  } = options;

  const repoPath = resolve(repo);
  const effectiveStateDir =
    stateDir || join(repoPath, ".desloppify");

  if (!existsSync(repoPath)) {
    throw new Error(`Repo path does not exist: ${repoPath}`);
  }

  let packages = explicitPackages;
  if (!packages || packages.length === 0) {
    const detected = detectPackages(repoPath);
    if (detected.length > 0) {
      packages = detected;
      console.log(
        `Detected ${detected.length} packages in monorepo: ${detected.join(", ")}`,
      );
    }
  }

  const results: PackageResult[] = [];

  if (packages && packages.length > 0) {
    console.log(`\nRunning per-package scan (${packages.length} packages)...\n`);
    for (const pkgRelPath of packages) {
      try {
        const result = scanPackage(
          repoPath,
          pkgRelPath,
          profile,
          exclusions,
          effectiveStateDir,
        );
        results.push(result);
      } catch (err) {
        console.error(`Error scanning package ${pkgRelPath}: ${String(err)}`);
        results.push({
          name: resolvePackageName(resolve(repoPath, pkgRelPath)),
          path: pkgRelPath,
          score: { overall: 0, objective: 0, strict: 0 },
          issues: [],
          error: String(err),
        });
      }
    }
  } else {
    console.log("\nRunning whole-repo scan...\n");
    const result = scanWholeRepo(repoPath, profile, exclusions, effectiveStateDir);
    results.push(result);
  }

  const scanResult: ScanResult = {
    repo: basename(repoPath),
    profile,
    timestamp: new Date().toISOString(),
    packages: results,
  };

  return scanResult;
}
