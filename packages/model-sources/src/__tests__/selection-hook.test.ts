import { describe, it, expect } from "vitest";
import {
  noopSelectionHook,
  createRegistryHook,
} from "../selection-hook.js";
import { ModelSourceRegistry } from "../registry.js";
import type {
  ModelDataPlugin,
  ModelInfo,
  ModelRecommendation,
  PluginConfig,
} from "../types.js";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeModel(id: string): ModelInfo {
  return {
    id,
    name: id,
    provider: "Test",
    available: true,
  };
}

function makePlugin(
  id: string,
  recs: ModelRecommendation[],
): ModelDataPlugin {
  return {
    id,
    name: id,
    description: "",
    init: async (_config: PluginConfig) => undefined,
    listModels: async () => [],
    getModel: async () => null,
    getRecommendations: async () => recs,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("noopSelectionHook", () => {
  it("returns an empty array regardless of query", async () => {
    const reg = new ModelSourceRegistry();
    const result = await noopSelectionHook({ complexity: 3 }, reg);
    expect(result).toEqual([]);
  });

  it("does not call any registry methods", async () => {
    const reg = new ModelSourceRegistry();
    reg.register(
      makePlugin("p1", [
        { model: makeModel("m1"), score: 0.9, rationale: "" },
      ]),
    );
    const result = await noopSelectionHook({ complexity: 3 }, reg);
    // Even with a registered plugin, noop always returns []
    expect(result).toEqual([]);
  });
});

describe("createRegistryHook", () => {
  it("returns a hook that queries the bound registry", async () => {
    const reg = new ModelSourceRegistry();
    reg.register(
      makePlugin("p1", [
        { model: makeModel("m1"), score: 0.8, rationale: "great" },
      ]),
    );

    const hook = createRegistryHook(reg);
    const result = await hook({ complexity: 2 }, reg);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.model.id).toBe("m1");
  });

  it("uses the registry captured at creation time, ignoring the passed registry arg", async () => {
    const capturedReg = new ModelSourceRegistry();
    capturedReg.register(
      makePlugin("from-captured", [
        { model: makeModel("captured-model"), score: 0.7, rationale: "" },
      ]),
    );

    const otherReg = new ModelSourceRegistry();
    otherReg.register(
      makePlugin("from-other", [
        { model: makeModel("other-model"), score: 0.9, rationale: "" },
      ]),
    );

    const hook = createRegistryHook(capturedReg);
    // Pass otherReg as the second arg — hook should use capturedReg
    const result = await hook({ complexity: 3 }, otherReg);

    const ids = result.map((r) => r.model.id);
    expect(ids).toContain("captured-model");
    expect(ids).not.toContain("other-model");
  });

  it("returns an empty array when the registry has no plugins", async () => {
    const reg = new ModelSourceRegistry();
    const hook = createRegistryHook(reg);
    const result = await hook({ complexity: 1 }, reg);
    expect(result).toEqual([]);
  });
});
