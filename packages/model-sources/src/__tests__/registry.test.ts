import { describe, it, expect, beforeEach } from "vitest";
import { ModelSourceRegistry } from "../registry.js";
import type {
  ModelDataPlugin,
  ModelInfo,
  ModelRecommendation,
  PluginConfig,
  RecommendationQuery,
} from "../types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeModel(id: string, provider = "Test"): ModelInfo {
  return {
    id,
    name: id,
    provider,
    available: true,
    pricing: { inputPer1kTokens: 0.001, outputPer1kTokens: 0.002 },
    benchmarks: { coding: 70 },
  };
}

class StubPlugin implements ModelDataPlugin {
  readonly id: string;
  readonly name: string;
  readonly description = "Stub plugin for testing";
  private models: ModelInfo[];
  private shouldThrow: boolean;
  initCalled = false;

  constructor(
    id: string,
    models: ModelInfo[] = [],
    shouldThrow = false,
  ) {
    this.id = id;
    this.name = id;
    this.models = models;
    this.shouldThrow = shouldThrow;
  }

  async init(_config: PluginConfig): Promise<void> {
    this.initCalled = true;
  }

  async listModels(): Promise<ModelInfo[]> {
    if (this.shouldThrow) throw new Error("plugin error");
    return this.models;
  }

  async getModel(id: string): Promise<ModelInfo | null> {
    if (this.shouldThrow) throw new Error("plugin error");
    return this.models.find((m) => m.id === id) ?? null;
  }

  async getRecommendations(
    _query: RecommendationQuery,
  ): Promise<ModelRecommendation[]> {
    if (this.shouldThrow) throw new Error("plugin error");
    return this.models.map((m) => ({ model: m, score: 0.5, rationale: "stub" }));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ModelSourceRegistry", () => {
  let reg: ModelSourceRegistry;

  beforeEach(() => {
    reg = new ModelSourceRegistry();
  });

  describe("register / getPlugin / listPluginIds", () => {
    it("registers a plugin and makes it retrievable by ID", () => {
      const plugin = new StubPlugin("p1");
      reg.register(plugin);
      expect(reg.getPlugin("p1")).toBe(plugin);
    });

    it("replaces an existing plugin with the same ID", () => {
      const first = new StubPlugin("p1");
      const second = new StubPlugin("p1");
      reg.register(first);
      reg.register(second);
      expect(reg.getPlugin("p1")).toBe(second);
    });

    it("returns undefined for an unknown plugin ID", () => {
      expect(reg.getPlugin("unknown")).toBeUndefined();
    });

    it("lists all registered plugin IDs", () => {
      reg.register(new StubPlugin("a"));
      reg.register(new StubPlugin("b"));
      expect(reg.listPluginIds()).toEqual(expect.arrayContaining(["a", "b"]));
      expect(reg.listPluginIds()).toHaveLength(2);
    });
  });

  describe("unregister", () => {
    it("removes a registered plugin", () => {
      reg.register(new StubPlugin("p1"));
      reg.unregister("p1");
      expect(reg.getPlugin("p1")).toBeUndefined();
      expect(reg.listPluginIds()).toHaveLength(0);
    });

    it("is a no-op for an unknown plugin ID", () => {
      expect(() => reg.unregister("missing")).not.toThrow();
    });
  });

  describe("initPlugin", () => {
    it("calls init() on the target plugin", async () => {
      const plugin = new StubPlugin("p1");
      reg.register(plugin);
      await reg.initPlugin("p1", {});
      expect(plugin.initCalled).toBe(true);
    });

    it("throws when the plugin ID is not registered", async () => {
      await expect(reg.initPlugin("not-there", {})).rejects.toThrow(
        /Plugin not registered/,
      );
    });
  });

  describe("getAllModels", () => {
    it("merges models from all plugins", async () => {
      reg.register(new StubPlugin("a", [makeModel("m1"), makeModel("m2")]));
      reg.register(new StubPlugin("b", [makeModel("m3")]));
      const models = await reg.getAllModels();
      expect(models).toHaveLength(3);
      expect(models.map((m) => m.id)).toEqual(
        expect.arrayContaining(["m1", "m2", "m3"]),
      );
    });

    it("skips plugins that throw and returns data from healthy ones", async () => {
      reg.register(new StubPlugin("ok", [makeModel("m1")]));
      reg.register(new StubPlugin("bad", [], true));
      const models = await reg.getAllModels();
      expect(models).toHaveLength(1);
      expect(models[0]?.id).toBe("m1");
    });

    it("returns an empty array when no plugins are registered", async () => {
      expect(await reg.getAllModels()).toEqual([]);
    });
  });

  describe("getModel", () => {
    it("returns the model when found in one of the plugins", async () => {
      reg.register(new StubPlugin("a", [makeModel("target")]));
      const result = await reg.getModel("target");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("target");
    });

    it("returns null when no plugin has the model", async () => {
      reg.register(new StubPlugin("a", [makeModel("m1")]));
      expect(await reg.getModel("unknown-model")).toBeNull();
    });

    it("skips failing plugins and searches remaining ones", async () => {
      reg.register(new StubPlugin("bad", [], true));
      reg.register(new StubPlugin("ok", [makeModel("m1")]));
      const result = await reg.getModel("m1");
      expect(result?.id).toBe("m1");
    });
  });

  describe("getRecommendations", () => {
    it("merges and deduplicates recommendations by model ID", async () => {
      const shared = makeModel("shared");
      reg.register(new StubPlugin("a", [shared, makeModel("a-only")]));
      reg.register(new StubPlugin("b", [shared, makeModel("b-only")]));

      const recs = await reg.getRecommendations({ complexity: 3 });
      const ids = recs.map((r) => r.model.id);

      // shared should appear once; both unique models should be present
      expect(ids.filter((id) => id === "shared")).toHaveLength(1);
      expect(ids).toContain("a-only");
      expect(ids).toContain("b-only");
    });

    it("returns results sorted by score descending", async () => {
      // Use a custom plugin to control scores precisely
      const highScorePlugin: ModelDataPlugin = {
        id: "high",
        name: "high",
        description: "",
        init: async () => undefined,
        listModels: async () => [],
        getModel: async () => null,
        getRecommendations: async () => [
          { model: makeModel("high-model"), score: 0.9, rationale: "" },
        ],
      };
      const lowScorePlugin: ModelDataPlugin = {
        id: "low",
        name: "low",
        description: "",
        init: async () => undefined,
        listModels: async () => [],
        getModel: async () => null,
        getRecommendations: async () => [
          { model: makeModel("low-model"), score: 0.2, rationale: "" },
        ],
      };

      reg.register(lowScorePlugin);
      reg.register(highScorePlugin);

      const recs = await reg.getRecommendations({ complexity: 3 });
      expect(recs[0]?.score).toBeGreaterThanOrEqual(recs[1]?.score ?? 0);
    });

    it("skips failing plugins gracefully", async () => {
      reg.register(new StubPlugin("bad", [], true));
      reg.register(new StubPlugin("ok", [makeModel("m1")]));
      const recs = await reg.getRecommendations({ complexity: 1 });
      expect(recs.length).toBeGreaterThan(0);
    });
  });
});
