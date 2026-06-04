import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { DEFAULT_EXCLUSIONS } from "../desloppify/exclusions.js";
import { runDesloppifyScan } from "../desloppify/runner.js";
import type { ScanProfile, ScanResult } from "../desloppify/types.js";

function formatSummary(result: ScanResult): string {
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
    for (const [tier, count] of byTier) {
      lines.push(`    T${tier}: ${count}`);
    }

    const byDetector = new Map<string, number>();
    for (const issue of pkg.issues) {
      byDetector.set(issue.detector, (byDetector.get(issue.detector) || 0) + 1);
    }
    for (const [detector, count] of byDetector) {
      lines.push(`    ${detector}: ${count}`);
    }

    lines.push("");
  }

  const totalIssues = result.packages.reduce((s, p) => s + p.issues.length, 0);
  lines.push(`Total issues: ${totalIssues}`);

  return lines.join("\n");
}

export function makeDesloppifyCommand(): Command {
  return new Command("desloppify")
    .description(
      "Run desloppify scan and output normalized JSON artifacts for downstream consumption",
    )
    .requiredOption("--repo <path>", "Path to the repository root")
    .option(
      "--packages <paths...>",
      "Relative package paths within the monorepo (auto-detected if omitted)",
    )
    .option(
      "--profile <profile>",
      "Scan profile: objective, full, or ci",
      "objective",
    )
    .option("--exclusions <patterns...>", "Additional exclusion patterns", [])
    .option("--output <path>", "Write normalized JSON output to file")
    .option(
      "--state-dir <path>",
      "Custom state directory (default: <repo>/.desloppify)",
    )
    .option(
      "--no-auto-detect",
      "Disable monorepo package auto-detection",
    )
    .action((opts) => {
      const profile = opts.profile as ScanProfile;
      if (!["objective", "full", "ci"].includes(profile)) {
        console.error(
          `Invalid profile: ${profile}. Must be objective, full, or ci.`,
        );
        process.exit(1);
      }

      const allExclusions = [...DEFAULT_EXCLUSIONS, ...opts.exclusions];

      const result = runDesloppifyScan({
        repo: resolve(opts.repo),
        packages: opts.noAutoDetect ? opts.packages : undefined,
        profile,
        exclusions: allExclusions,
        stateDir: opts.stateDir ? resolve(opts.stateDir) : undefined,
      });

      console.log(formatSummary(result));

      const json = JSON.stringify(result, null, 2);

      if (opts.output) {
        writeFileSync(resolve(opts.output), json, "utf-8");
        console.log(`\nResults written to ${opts.output}`);
      } else {
        console.log(`\n--- JSON Output ---`);
        console.log(json);
      }
    });
}
