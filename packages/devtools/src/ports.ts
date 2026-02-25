/**
 * Port allocation utilities for running multiple dev instances.
 *
 * Allocates a base port and sequential offsets for related services.
 * If a port range is in use, jumps to the next range (base + increment).
 *
 * @example
 * ```typescript
 * import { allocatePorts } from '@aprovan/devtools/ports';
 *
 * const ports = await allocatePorts({
 *   base: 3700,
 *   count: 3,
 *   increment: 10,
 * });
 * // First instance: { base: 3700, ports: [3700, 3701, 3702] }
 * // Second instance: { base: 3710, ports: [3710, 3711, 3712] }
 * ```
 */

import { createServer } from "node:net";

export interface PortAllocationOptions {
  /** Starting port number */
  base: number;
  /** Number of consecutive ports to allocate */
  count: number;
  /** Jump increment when base is occupied (default: 10) */
  increment?: number;
  /** Maximum attempts before giving up (default: 10) */
  maxAttempts?: number;
}

export interface PortAllocation {
  /** The allocated base port */
  base: number;
  /** Array of allocated ports [base, base+1, ...] */
  ports: number[];
}

/**
 * Check if a specific port is available.
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function arePortsAvailable(
  base: number,
  count: number,
): Promise<boolean> {
  const checks = Array.from({ length: count }, (_, i) =>
    isPortAvailable(base + i),
  );
  const results = await Promise.all(checks);
  return results.every(Boolean);
}

/**
 * Allocate a range of consecutive ports.
 *
 * Finds an available base port and reserves `count` consecutive ports.
 * If the base range is occupied, tries base + increment, and so on.
 */
export async function allocatePorts(
  options: PortAllocationOptions,
): Promise<PortAllocation> {
  const { base, count, increment = 10, maxAttempts = 10 } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateBase = base + attempt * increment;
    if (await arePortsAvailable(candidateBase, count)) {
      return {
        base: candidateBase,
        ports: Array.from({ length: count }, (_, i) => candidateBase + i),
      };
    }
  }

  throw new Error(
    `Failed to allocate ${count} ports after ${maxAttempts} attempts starting from ${base}`,
  );
}

/**
 * Get the next available port starting from a given port.
 */
export async function getAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > startPort + 100) {
      throw new Error(`No available port found starting from ${startPort}`);
    }
  }
  return port;
}

/**
 * Service port offsets for common configurations.
 *
 * Usage:
 * ```typescript
 * const ports = await allocatePorts({ base: 3700, count: 3 });
 * const clientPort = ports.ports[SERVICE_OFFSETS.client];
 * const stitcheryPort = ports.ports[SERVICE_OFFSETS.stitchery];
 * ```
 */
export const SERVICE_OFFSETS = {
  /** Main client/frontend (offset 0) */
  client: 0,
  /** Stitchery backend service (offset 1) */
  stitchery: 1,
  /** Copilot proxy (offset 2) */
  copilotProxy: 2,
  /** Additional services (offset 3+) */
  extra: 3,
} as const;
