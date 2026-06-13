/**
 * @aprovan/devtools
 *
 * Shared development utilities for Aprovan projects.
 */

// Port allocation
export {
  allocatePorts,
  isPortAvailable,
  getAvailablePort,
  SERVICE_OFFSETS,
  type PortAllocationOptions,
  type PortAllocation,
} from "./ports.js";

// Desloppify runner
export {
  runDesloppifyScan,
  DEFAULT_EXCLUSIONS,
  formatExclusions,
  type ScanProfile,
  type DesloppifyIssue,
  type PackageResult,
  type ScanResult,
  type RunnerOptions,
} from "./desloppify/index.js";

// Quality subpath re-export (also available at @aprovan/devtools/quality)
export { BASE_QUALITY_EXCLUSIONS } from "./quality.js";

// Model selection engine (also available at @aprovan/devtools/model-selection)
export {
  selectModel,
  DEFAULT_CATALOG,
  type ComplexityScore,
  type ModelEntry,
  type ModelTier,
  type PlanType,
  type ScoringPlugin,
  type SelectionInput,
  type SelectionResult,
  type SubscriptionQuota,
} from "./model-selection/index.js";
