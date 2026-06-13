import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { createIssuesFromScanResult } from "../multica/issue-creator.js";
import type { ScanResult } from "../desloppify/types.js";

export function makeCreateIssuesCommand(): Command {
  return new Command("create-issues")
    .description(
      "Read a desloppify scan JSON output and create Multica issues for T1/T2 findings",
    )
    .requiredOption("--input <path>", "Path to desloppify scan JSON output file")
    .option(
      "--parent <issue-id>",
      "Parent Multica issue ID (e.g. APR-65 UUID for Code Quality Sentinel)",
    )
    .option("--project <project-id>", "Multica project ID to assign issues to")
    .option(
      "--max-tier <number>",
      "Maximum tier to include (1 = T1 only, 2 = T1+T2)",
      "2",
    )
    .option("--dry-run", "Print what would be created without calling multica", false)
    .action((opts) => {
      const inputPath = resolve(opts.input);
      let scanResult: ScanResult;

      try {
        const raw = readFileSync(inputPath, "utf-8");
        scanResult = JSON.parse(raw) as ScanResult;
      } catch (err) {
        console.error(`Failed to read input file: ${String(err)}`);
        process.exit(1);
      }

      const maxTier = parseInt(opts.maxTier, 10);
      if (isNaN(maxTier) || maxTier < 1 || maxTier > 3) {
        console.error("--max-tier must be 1, 2, or 3");
        process.exit(1);
      }

      const result = createIssuesFromScanResult(scanResult, {
        parentIssueId: opts.parent,
        projectId: opts.project,
        maxTier,
        dryRun: opts.dryRun,
      });

      if (opts.dryRun) {
        console.log(`\nDry run — would create ${result.created.length} issue(s):\n`);
      } else {
        console.log(`\nCreated ${result.created.length} issue(s):\n`);
      }

      for (const issue of result.created) {
        const id = issue.issueId ? ` [${issue.issueId}]` : "";
        console.log(
          `  T${issue.tier} | ${issue.detector} | ${issue.packageName} | ${issue.findingCount} finding(s)${id}`,
        );
        console.log(`    ${issue.title}`);
      }

      if (result.errors.length > 0) {
        console.error(`\n${result.errors.length} error(s):`);
        for (const err of result.errors) {
          console.error(`  [ERROR] ${err.title}: ${err.error}`);
        }
      }

      if (result.skipped > 0) {
        console.log(`\nSkipped ${result.skipped} finding(s) below T${maxTier} threshold.`);
      }

      if (result.errors.length > 0) {
        process.exit(1);
      }
    });
}
