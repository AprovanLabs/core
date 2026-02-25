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
