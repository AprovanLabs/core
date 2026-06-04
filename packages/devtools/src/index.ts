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
