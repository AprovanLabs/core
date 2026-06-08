import { describe, it, expect } from "vitest";
import {
  isPortAvailable,
  allocatePorts,
  getAvailablePort,
  SERVICE_OFFSETS,
} from "../ports.js";

describe("SERVICE_OFFSETS", () => {
  it("has client at offset 0", () => {
    expect(SERVICE_OFFSETS.client).toBe(0);
  });

  it("has stitchery at offset 1", () => {
    expect(SERVICE_OFFSETS.stitchery).toBe(1);
  });

  it("has copilotProxy at offset 2", () => {
    expect(SERVICE_OFFSETS.copilotProxy).toBe(2);
  });

  it("has extra at offset 3", () => {
    expect(SERVICE_OFFSETS.extra).toBe(3);
  });
});

describe("isPortAvailable", () => {
  it("returns a Promise<boolean>", async () => {
    const result = isPortAvailable(19999);
    expect(result).toBeInstanceOf(Promise);
    const value = await result;
    expect(typeof value).toBe("boolean");
  });

  it("returns true for an unused high port", async () => {
    // Use a high port unlikely to be in use
    const available = await isPortAvailable(59871);
    expect(available).toBe(true);
  });

  it("returns false for a port already in use", async () => {
    const { createServer } = await import("node:net");
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(59872, "127.0.0.1", resolve));
    try {
      const available = await isPortAvailable(59872);
      expect(available).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});

describe("getAvailablePort", () => {
  it("returns the start port when it is available", async () => {
    const port = await getAvailablePort(59880);
    expect(port).toBeGreaterThanOrEqual(59880);
  });

  it("skips occupied ports and returns the next available one", async () => {
    const { createServer } = await import("node:net");
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(59881, "127.0.0.1", resolve));
    try {
      const port = await getAvailablePort(59881);
      expect(port).toBeGreaterThan(59881);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});

describe("allocatePorts", () => {
  it("returns base and consecutive ports", async () => {
    const allocation = await allocatePorts({ base: 59890, count: 3 });
    expect(allocation.base).toBeGreaterThanOrEqual(59890);
    expect(allocation.ports).toHaveLength(3);
    expect(allocation.ports[1]).toBe(allocation.base + 1);
    expect(allocation.ports[2]).toBe(allocation.base + 2);
  });

  it("allocates a single port", async () => {
    const allocation = await allocatePorts({ base: 59900, count: 1 });
    expect(allocation.ports).toHaveLength(1);
    expect(allocation.ports[0]).toBe(allocation.base);
  });

  it("throws after exhausting maxAttempts", async () => {
    // We can't easily make all ports busy, but we can verify it throws with maxAttempts: 0
    await expect(
      allocatePorts({ base: 59910, count: 1, maxAttempts: 0 }),
    ).rejects.toThrow(/Failed to allocate/);
  });

  it("uses custom increment when provided", async () => {
    const allocation = await allocatePorts({
      base: 59920,
      count: 2,
      increment: 20,
    });
    expect(allocation.ports).toHaveLength(2);
    // Base should be a multiple of 20 away from 59920
    expect((allocation.base - 59920) % 20).toBe(0);
  });
});
