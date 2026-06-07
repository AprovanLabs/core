/**
 * @aprovan/devtools/quality
 *
 * Shared quality configuration and utilities for Aprovan projects.
 *
 * Provides the base desloppify exclusion list that repos can extend rather than
 * duplicating. Import this in your `.desloppifyrc` or tooling setup:
 *
 * @example
 * import { BASE_QUALITY_EXCLUSIONS } from "@aprovan/devtools/quality";
 */

export { DEFAULT_EXCLUSIONS as BASE_QUALITY_EXCLUSIONS } from "./desloppify/exclusions.js";
export { formatExclusions } from "./desloppify/exclusions.js";
export type {
  ScanProfile,
  DesloppifyIssue,
  PackageResult,
  ScanResult,
  RunnerOptions,
} from "./desloppify/types.js";
