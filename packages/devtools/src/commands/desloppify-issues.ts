import { Command } from "commander";
import { createDesloppifyIssues } from "../desloppify/issue-creator.js";

export function makeDesloppifyIssuesCommand(): Command {
  return new Command("desloppify-issues")
    .description("Create Multica issues from desloppify scan findings (T1 and T2 by default)")
    .requiredOption("--input <path>", "Path to desloppify-run JSON output file")
    .requiredOption("--repo <name>", "Repository name for issue titles")
    .option("--parent <id>", "Parent issue ID for linking to initiative")
    .option("--project <id>", "Project ID for assignment")
    .option("--min-tier <n>", "Maximum tier number to include (1=critical only, 2=high+, 3=medium+)", "2")
    .option("--group-by <mode>", "Group findings by: detector, file, or package", "detector")
    .option("--dry-run", "Preview issues without creating them")
    .action((opts) => {
      const minTier = parseInt(opts.minTier, 10);
      if (isNaN(minTier) || minTier < 1 || minTier > 4) {
        console.error("--min-tier must be a number between 1 and 4");
        process.exit(1);
      }

      const groupBy = opts.groupBy as "detector" | "file" | "package";
      if (!["detector", "file", "package"].includes(groupBy)) {
        console.error("--group-by must be one of: detector, file, package");
        process.exit(1);
      }

      const result = createDesloppifyIssues({
        input: opts.input,
        repo: opts.repo,
        parent: opts.parent,
        project: opts.project,
        minTier,
        dryRun: opts.dryRun || false,
        groupBy,
      });

      console.log(
        `\nDone: ${result.created} created, ${result.skipped} skipped, ${result.groups.length} groups`,
      );
    });
}
