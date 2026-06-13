import { describe, it, expect, beforeEach } from "vitest";
import { ArtificialAnalysisPlugin } from "../plugins/artificial-analysis.js";

describe("ArtificialAnalysisPlugin", () => {
  let plugin: ArtificialAnalysisPlugin;

  beforeEach(() => {
    plugin = new ArtificialAnalysisPlugin();
  });

  describe("metadata", () => {
    it("has the expected id", () => {
      expect(plugin.id).toBe("artificial-analysis");
    });

    it("has a non-empty name and description", () => {
      expect(plugin.name.length).toBeGreaterThan(0);
      expect(plugin.description.length).toBeGreaterThan(0);
    });
  });

  describe("before init()", () => {
    it("listModels() throws if not initialised", async () => {
      await expect(plugin.listModels()).rejects.toThrow(/initialised/);
    });

    it("getModel() throws if not initialised", async () => {
      await expect(plugin.getModel("any")).rejects.toThrow(/initialised/);
    });

    it("getRecommendations() throws if not initialised", async () => {
      await expect(
        plugin.getRecommendations({ complexity: 1 }),
      ).rejects.toThrow(/initialised/);
    });
  });

  describe("after init()", () => {
    beforeEach(async () => {
      await plugin.init({ credentials: { apiKey: "test-key" } });
    });

    describe("listModels()", () => {
      it("returns a non-empty array of models", async () => {
        const models = await plugin.listModels();
        expect(models.length).toBeGreaterThan(0);
      });

      it("each model has required fields", async () => {
        const models = await plugin.listModels();
        for (const model of models) {
          expect(typeof model.id).toBe("string");
          expect(model.id.length).toBeGreaterThan(0);
          expect(typeof model.name).toBe("string");
          expect(typeof model.provider).toBe("string");
          expect(typeof model.available).toBe("boolean");
        }
      });
    });

    describe("getModel()", () => {
      it("returns the model for a known ID", async () => {
        const models = await plugin.listModels();
        const first = models[0];
        if (first === undefined) throw new Error("no stub models");

        const result = await plugin.getModel(first.id);
        expect(result).not.toBeNull();
        expect(result?.id).toBe(first.id);
      });

      it("returns null for an unknown model ID", async () => {
        const result = await plugin.getModel("not-a-real-model-id");
        expect(result).toBeNull();
      });
    });

    describe("getRecommendations()", () => {
      it("returns an array of recommendations", async () => {
        const recs = await plugin.getRecommendations({ complexity: 3 });
        expect(Array.isArray(recs)).toBe(true);
      });

      it("each recommendation has model, score, and rationale", async () => {
        const recs = await plugin.getRecommendations({ complexity: 2 });
        for (const rec of recs) {
          expect(rec.model).toBeDefined();
          expect(typeof rec.score).toBe("number");
          expect(rec.score).toBeGreaterThanOrEqual(0);
          expect(rec.score).toBeLessThanOrEqual(1);
          expect(typeof rec.rationale).toBe("string");
        }
      });

      it("respects the limit parameter", async () => {
        const recs = await plugin.getRecommendations({
          complexity: 3,
          limit: 2,
        });
        expect(recs.length).toBeLessThanOrEqual(2);
      });

      it("excludes models that exceed the budget cap", async () => {
        // Very low budget should exclude expensive models
        const recs = await plugin.getRecommendations({
          complexity: 1,
          maxCostPer1kOutputTokens: 0.001, // lower than all stub models
        });
        for (const rec of recs) {
          const cost = rec.model.pricing?.outputPer1kTokens;
          if (cost !== undefined) {
            expect(cost).toBeLessThanOrEqual(0.001);
          }
        }
      });

      it("returns results sorted by score descending", async () => {
        const recs = await plugin.getRecommendations({ complexity: 4 });
        for (let i = 1; i < recs.length; i++) {
          const prev = recs[i - 1];
          const curr = recs[i];
          if (prev !== undefined && curr !== undefined) {
            expect(prev.score).toBeGreaterThanOrEqual(curr.score);
          }
        }
      });

      it("includes complexity tier in the rationale string", async () => {
        const recs = await plugin.getRecommendations({ complexity: 3 });
        for (const rec of recs) {
          expect(rec.rationale).toContain("3");
        }
      });
    });
  });

  describe("init() with endpoint override", () => {
    it("accepts a custom endpoint without throwing", async () => {
      await expect(
        plugin.init({ endpoint: "https://custom.example.com/v1" }),
      ).resolves.not.toThrow();
    });
  });
});
