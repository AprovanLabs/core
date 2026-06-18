import { execSync } from "node:child_process";
import type { DesloppifyIssue, PackageResult, ScanResult } from "../desloppify/types.js";

export type Executor = (cmd: string) => string;

export interface CreateIssuesOptions {
  parentIssueId?: string;
  projectId?: string;
  maxTier?: number;
  dryRun?: boolean;
  executor?: Executor;
}

export interface CreatedIssue {
  title: string;
  tier: number;
  detector: string;
  packageName: string;
  findingCount: number;
  issueId?: string;
  dryRun: boolean;
}

export interface CreateIssuesResult {
  created: CreatedIssue[];
  skipped: number;
  errors: { title: string; error: string }[];
}

interface FindingGroup {
  tier: number;
  detector: string;
  packageName: string;
  packagePath: string;
  findings: DesloppifyIssue[];
}

function groupFindings(
  pkg: PackageResult,
  maxTier: number,
): FindingGroup[] {
  const map = new Map<string, FindingGroup>();

  for (const issue of pkg.issues) {
    if (issue.tier > maxTier) continue;
    const key = `${issue.tier}::${issue.detector}`;
    if (!map.has(key)) {
      map.set(key, {
        tier: issue.tier,
        detector: issue.detector,
        packageName: pkg.name,
        packagePath: pkg.path,
        findings: [],
      });
    }
    map.get(key)!.findings.push(issue);
  }

  return Array.from(map.values()).sort((a, b) => a.tier - b.tier || a.detector.localeCompare(b.detector));
}

function buildTitle(group: FindingGroup, repo: string): string {
  return `[desloppify] [T${group.tier}] ${group.detector} in ${group.packageName} (${repo})`;
}

function buildDescription(group: FindingGroup, repo: string): string {
  const tierLabel = group.tier === 1 ? "Critical" : "High";
  const lines: string[] = [
    `## desloppify ${tierLabel} Finding: \`${group.detector}\``,
    "",
    `**Repo:** ${repo}`,
    `**Package:** ${group.packageName} (\`${group.packagePath}\`)`,
    `**Tier:** T${group.tier} (${tierLabel})`,
    `**Detector:** ${group.detector}`,
    `**Findings:** ${group.findings.length}`,
    "",
    "### Issues",
    "",
  ];

  for (const f of group.findings) {
    const location = f.line != null ? `${f.file}:${f.line}` : f.file;
    lines.push(`- **${location}** — ${f.message} *(confidence: ${f.confidence})*`);
  }

  lines.push("", "---", "_Created by `devtools create-issues` from a desloppify scan._");
  return lines.join("\n");
}

function defaultExecutor(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", shell: "/bin/bash" }).trim();
}

function runMulticaCreate(args: string[], executor: Executor): string {
  const cmd = ["multica issue create", ...args].join(" ");
  return executor(cmd);
}

function extractIssueId(output: string): string | undefined {
  // multica issue create prints the issue ID or URL containing it
  const match = output.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1];
}

export function createIssuesFromScanResult(
  result: ScanResult,
  options: CreateIssuesOptions = {},
): CreateIssuesResult {
  const { parentIssueId, projectId, maxTier = 2, dryRun = false, executor = defaultExecutor } = options;
  const summary: CreateIssuesResult = { created: [], skipped: 0, errors: [] };

  for (const pkg of result.packages) {
    const groups = groupFindings(pkg, maxTier);

    for (const group of groups) {
      const title = buildTitle(group, result.repo);
      const description = buildDescription(group, result.repo);
      const priority = group.tier === 1 ? "critical" : "high";

      if (dryRun) {
        summary.created.push({
          title,
          tier: group.tier,
          detector: group.detector,
          packageName: group.packageName,
          findingCount: group.findings.length,
          dryRun: true,
        });
        continue;
      }

      try {
        const args = [
          `--title ${JSON.stringify(title)}`,
          `--description ${JSON.stringify(description)}`,
          `--priority ${priority}`,
        ];
        if (parentIssueId) args.push(`--parent ${parentIssueId}`);
        if (projectId) args.push(`--project ${projectId}`);

        const output = runMulticaCreate(args, executor);
        const issueId = extractIssueId(output);

        summary.created.push({
          title,
          tier: group.tier,
          detector: group.detector,
          packageName: group.packageName,
          findingCount: group.findings.length,
          issueId,
          dryRun: false,
        });
      } catch (err) {
        summary.errors.push({ title, error: String(err) });
      }
    }

    const packageIssueCount = pkg.issues.filter((i) => i.tier > maxTier).length;
    summary.skipped += packageIssueCount;
  }

  return summary;
}
