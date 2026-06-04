export type ScanProfile = "objective" | "full" | "ci";

export interface DesloppifyIssue {
  tier: number;
  category: string;
  message: string;
  file: string;
  line: number | null;
  detector: string;
  id: string;
  status: string;
  confidence: string;
}

export interface PackageResult {
  name: string;
  path: string;
  score: {
    overall: number;
    objective: number;
    strict: number;
  };
  issues: DesloppifyIssue[];
}

export interface ScanResult {
  repo: string;
  profile: ScanProfile;
  timestamp: string;
  packages: PackageResult[];
}

export interface RunnerOptions {
  repo: string;
  packages?: string[];
  profile?: ScanProfile;
  exclusions?: string[];
  output?: string;
  stateDir?: string;
}

export interface IssueCreatorOptions {
  input: string;
  repo: string;
  parent?: string;
  project?: string;
  minTier?: number;
  dryRun?: boolean;
  groupBy?: "detector" | "file" | "package";
}

export interface IssueGroup {
  title: string;
  description: string;
  tier: number;
  detector: string;
  findings: DesloppifyIssue[];
}
