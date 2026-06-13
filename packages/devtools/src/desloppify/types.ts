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
  /** Set when the package scan failed; score will be zeroed. */
  error?: string;
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
