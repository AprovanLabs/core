import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command } from "commander";
import { DEFAULT_EXCLUSIONS } from "../desloppify/exclusions.js";
import { runDesloppifyScan } from "../desloppify/runner.js";
import type { ScanProfile, ScanResult } from "../desloppify/types.js";

interface StatusOutput {
  overall_score: number;
  objective_score: number;
  strict_score: number;
  issue_count: number;
  [key: string]: unknown;
}

interface NextItem {
  id: string;
  detector: string;
  file: string;
  tier: number;
  summary: string;
  [key: string]: unknown;
}

function formatScanSummary(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(`\nRepo: ${result.repo}`);
  lines.push(`Profile: ${result.profile}`);
  lines.push(`Timestamp: ${result.timestamp}`);
  lines.push("");

  for (const pkg of result.packages) {
    lines.push(`Package: ${pkg.name} (${pkg.path})`);
    lines.push(
      `  Score: overall=${pkg.score.overall} objective=${pkg.score.objective} strict=${pkg.score.strict}`,
    );
    lines.push(`  Issues: ${pkg.issues.length}`);

    const byTier = new Map<number, number>();
    for (const issue of pkg.issues) {
      byTier.set(issue.tier, (byTier.get(issue.tier) || 0) + 1);
    }
    for (const [tier, count] of [...byTier.entries()].sort(
      ([a], [b]) => a - b,
    )) {
      lines.push(`    T${tier}: ${count}`);
    }
    lines.push("");
  }

  const totalIssues = result.packages.reduce(
    (s, p) => s + p.issues.length,
    0,
  );
  lines.push(`Total issues: ${totalIssues}`);
  return lines.join("\n");
}

function formatStatusTable(status: StatusOutput): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(
    "┌──────────────────┬────────┐",
  );
  lines.push(
    "│ Metric           │  Score │",
  );
  lines.push(
    "├──────────────────┼────────┤",
  );
  lines.push(
    `│ Overall          │ ${String(status.overall_score).padStart(6)} │`,
  );
  lines.push(
    `│ Objective        │ ${String(status.objective_score).padStart(6)} │`,
  );
  lines.push(
    `│ Strict           │ ${String(status.strict_score).padStart(6)} │`,
  );
  lines.push(
    `│ Issues           │ ${String(status.issue_count).padStart(6)} │`,
  );
  lines.push(
    "└──────────────────┴────────┘",
  );
  return lines.join("\n");
}

function resolvePackagePath(
  basePath: string,
  packageName: string,
): string | null {
  // Try direct subdirectory match by name
  const candidates = [
    join(basePath, "packages", packageName),
    join(basePath, "apps", packageName),
    join(basePath, packageName),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "package.json"))) {
      return candidate;
    }
  }

  // Try matching by package.json name field
  const searchDirs = [
    join(basePath, "packages"),
    join(basePath, "apps"),
  ];
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgJsonPath = join(dir, entry.name, "package.json");
      if (!existsSync(pkgJsonPath)) continue;
      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as {
          name?: string;
        };
        if (pkgJson.name === packageName) {
          return join(dir, entry.name);
        }
      } catch {
        // skip
      }
    }
  }
  return null;
}

function makeScanCommand(): Command {
  return new Command("scan")
    .description("Scan a path for code quality issues using desloppify")
    .option("--path <path>", "Path to scan (default: cwd)")
    .option(
      "--profile <profile>",
      "Scan profile: ci, full, or objective",
      "ci",
    )
    .option("--no-badge", "Suppress badge output (default for CI runs)")
    .option(
      "--state <path>",
      "State directory for per-package state isolation",
    )
    .option(
      "--package <name>",
      "Scan a single package by name or directory (monorepo)",
    )
    .option("--json", "Output results as JSON only")
    .action((opts: {
      path?: string;
      profile: string;
      badge: boolean;
      state?: string;
      package?: string;
      json?: boolean;
    }) => {
      const scanPath = opts.path ? resolve(opts.path) : process.cwd();
      const profile = opts.profile as ScanProfile;

      if (!["objective", "full", "ci"].includes(profile)) {
        throw new Error(
          `Invalid profile: ${profile}. Must be objective, full, or ci.`,
        );
      }

      if (!existsSync(scanPath)) {
        throw new Error(`Path does not exist: ${scanPath}`);
      }

      let packages: string[] | undefined;
      let stateDir: string | undefined = opts.state
        ? resolve(opts.state)
        : undefined;

      if (opts.package) {
        const pkgPath = resolvePackagePath(scanPath, opts.package);
        if (!pkgPath) {
          throw new Error(
            `Package not found: ${opts.package}. Checked packages/, apps/, and root.`,
          );
        }
        // Derive relative path for the runner
        const rel = pkgPath.replace(scanPath, "").replace(/^\//, "");
        packages = [rel];

        // Isolate state per package when --state not explicitly given
        if (!stateDir) {
          const defaultStateBase = join(scanPath, ".desloppify");
          stateDir = join(defaultStateBase, rel);
          if (!existsSync(stateDir)) {
            mkdirSync(stateDir, { recursive: true });
          }
        }
      }

      const result = runDesloppifyScan({
        repo: scanPath,
        packages,
        profile,
        exclusions: DEFAULT_EXCLUSIONS,
        stateDir,
      });

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatScanSummary(result));
        if (!opts.badge) {
          // badge suppressed — skip badge output
        }
        console.log("\n--- JSON Output ---");
        console.log(JSON.stringify(result, null, 2));
      }
    });
}

function makeStatusCommand(): Command {
  return new Command("status")
    .description(
      "Report quality status from desloppify state; exits 1 if score is below threshold",
    )
    .option("--path <path>", "Path to scan/repo (default: cwd)")
    .option(
      "--state <path>",
      "Path to desloppify state file or directory",
    )
    .option(
      "--threshold <n>",
      "Minimum overall score required (exit 1 if below)",
      "70",
    )
    .option("--json", "Emit JSON only (no summary table)")
    .action((opts: {
      path?: string;
      state?: string;
      threshold: string;
      json?: boolean;
    }) => {
      const scanPath = opts.path ? resolve(opts.path) : process.cwd();
      const threshold = Number(opts.threshold);

      // Build desloppify status command
      const stateArg = opts.state
        ? `--state "${resolve(opts.state)}"`
        : `--state "${join(scanPath, ".desloppify", "state.json")}"`;

      let raw: string;
      try {
        raw = execSync(`desloppify status --json ${stateArg}`, {
          encoding: "utf-8",
          shell: "/bin/bash",
          timeout: 60_000,
        });
      } catch (err) {
        throw new Error(
          `Failed to run desloppify status: ${String(err)}`,
        );
      }

      let status: StatusOutput;
      try {
        status = JSON.parse(raw) as StatusOutput;
      } catch (err) {
        throw new Error(`Failed to parse desloppify status output:\n${raw}\n${String(err)}`);
      }

      if (!opts.json) {
        console.log(formatStatusTable(status));
      }

      console.log(JSON.stringify(status, null, 2));

      if (status.overall_score < threshold) {
        throw new Error(
          `\nQuality gate FAILED: overall score ${status.overall_score} is below threshold ${threshold}`,
        );
      }
    });
}

function makeNextCommand(): Command {
  return new Command("next")
    .description(
      "List the next prioritized desloppify fix items as structured JSON",
    )
    .option("--path <path>", "Path to scan/repo (default: cwd)")
    .option(
      "--state <path>",
      "Path to desloppify state file or directory",
    )
    .option(
      "--count <n>",
      "Number of items to return",
      "10",
    )
    .option("--json", "Emit JSON only (no header)")
    .action((opts: {
      path?: string;
      state?: string;
      count: string;
      json?: boolean;
    }) => {
      const scanPath = opts.path ? resolve(opts.path) : process.cwd();
      const count = Number(opts.count);

      const stateArg = opts.state
        ? `--state "${resolve(opts.state)}"`
        : `--state "${join(scanPath, ".desloppify", "state.json")}"`;

      let raw: string;
      try {
        raw = execSync(
          `desloppify next --count ${count} --json ${stateArg}`,
          {
            encoding: "utf-8",
            shell: "/bin/bash",
            timeout: 60_000,
          },
        );
      } catch (err) {
        throw new Error(
          `Failed to run desloppify next: ${String(err)}`,
        );
      }

      let items: NextItem[];
      try {
        items = JSON.parse(raw) as NextItem[];
      } catch (err) {
        throw new Error(`Failed to parse desloppify next output:\n${raw}\n${String(err)}`);
      }

      if (!opts.json) {
        console.log(`\nNext ${items.length} fix items:`);
        for (const item of items) {
          console.log(
            `  [T${item.tier}] ${item.detector}: ${item.summary} (${item.file})`,
          );
        }
        console.log("");
      }

      console.log(JSON.stringify(items, null, 2));
    });
}

export function makeQualityCommand(): Command {
  const quality = new Command("quality").description(
    "Run desloppify quality scans with shared defaults and consistent output",
  );

  quality.addCommand(makeScanCommand());
  quality.addCommand(makeStatusCommand());
  quality.addCommand(makeNextCommand());

  return quality;
}
