/**
 * Reference plugin: Artificial Analysis (https://artificialanalysis.ai).
 *
 * Artificial Analysis publishes independent benchmark scores, pricing, and
 * latency measurements for frontier models. Their free tier allows up to
 * 1 000 requests/day.
 *
 * **This is a scaffold / reference implementation (APR-207).**
 * The three query methods (`listModels`, `getModel`, `getRecommendations`)
 * currently return static stub data so that consumers and tests can exercise
 * the interface without a live API key.
 *
 * To activate the real integration once APR-205 is ready:
 *   1. Replace the stub bodies with actual `fetch` calls (see the TODO
 *      comments inside each method).
 *   2. Map the API response shape to `ModelInfo` using `mapApiModel`.
 *   3. Provide a real API key via `PluginConfig.credentials.apiKey`.
 *
 * Real API endpoints (reference):
 *   GET  /v1/models          → listModels
 *   GET  /v1/models/:id      → getModel
 */

import type {
  ModelDataPlugin,
  ModelInfo,
  ModelRecommendation,
  ModelPricing,
  ModelBenchmarks,
  PluginConfig,
  RecommendationQuery,
  ComplexityTier,
} from "../types.js";

export class ArtificialAnalysisPlugin implements ModelDataPlugin {
  readonly id = "artificial-analysis";
  readonly name = "Artificial Analysis";
  readonly description =
    "Independent model benchmarks, pricing, and latency data from artificialanalysis.ai";

  private apiKey = "";
  private endpoint = "https://api.artificialanalysis.ai/v1";
  private initialized = false;

  async init(config: PluginConfig): Promise<void> {
    if (config.endpoint !== undefined) {
      this.endpoint = config.endpoint;
    }
    this.apiKey = config.credentials?.["apiKey"] ?? "";
    this.initialized = true;
  }

  async listModels(): Promise<ModelInfo[]> {
    this.assertInitialized();
    // TODO (APR-205): Replace stub with real API call, e.g.:
    //   const res = await fetch(`${this.endpoint}/models`, {
    //     headers: { Authorization: `Bearer ${this.apiKey}` },
    //   });
    //   if (!res.ok) return [];
    //   const data: unknown = await res.json();
    //   return parseApiModels(data);
    void this.endpoint; // referenced by TODO above — suppress unused lint
    void this.apiKey;   // referenced by TODO above — suppress unused lint
    return STUB_MODELS;
  }

  async getModel(id: string): Promise<ModelInfo | null> {
    this.assertInitialized();
    // TODO (APR-205): Replace stub with real API call, e.g.:
    //   const res = await fetch(
    //     `${this.endpoint}/models/${encodeURIComponent(id)}`,
    //     { headers: { Authorization: `Bearer ${this.apiKey}` } },
    //   );
    //   if (res.status === 404) return null;
    //   if (!res.ok) return null;
    //   return parseApiModel(await res.json());
    return STUB_MODELS.find((m) => m.id === id) ?? null;
  }

  async getRecommendations(
    query: RecommendationQuery,
  ): Promise<ModelRecommendation[]> {
    this.assertInitialized();
    const models = await this.listModels();
    return rankModels(models, query);
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `${this.name} plugin must be initialised before use. Call init() first.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Internal ranking helpers
// ---------------------------------------------------------------------------

function rankModels(
  models: ModelInfo[],
  query: RecommendationQuery,
): ModelRecommendation[] {
  const limit = query.limit ?? 5;

  const candidates = models.filter((m) => {
    if (!m.available) return false;
    if (
      query.maxCostPer1kOutputTokens !== undefined &&
      m.pricing !== undefined &&
      m.pricing.outputPer1kTokens > query.maxCostPer1kOutputTokens
    ) {
      return false;
    }
    return true;
  });

  const scored: ModelRecommendation[] = candidates.map((m) => ({
    model: m,
    score: computeScore(m, query.complexity),
    rationale: buildRationale(m, query.complexity),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function computeScore(model: ModelInfo, complexity: ComplexityTier): number {
  // Blend normalised coding benchmark with an inverse cost term.
  // Higher complexity → weight performance more; lower complexity → weight cost more.
  const benchScore = (model.benchmarks?.coding ?? 50) / 100;
  const perfWeight = complexity / 5;

  const rawCost = model.pricing?.outputPer1kTokens;
  // Normalise cost: 0 $/1K → costScore 1.0; $0.02/1K → costScore 0.0
  const costScore =
    rawCost !== undefined ? Math.max(0, 1 - rawCost / 0.02) : 0.5;

  return benchScore * perfWeight + costScore * (1 - perfWeight);
}

function buildRationale(
  model: ModelInfo,
  complexity: ComplexityTier,
): string {
  const parts: string[] = [`complexity tier ${complexity}`];

  if (model.benchmarks?.coding !== undefined) {
    parts.push(`coding score ${model.benchmarks.coding}/100`);
  }
  if (model.pricing !== undefined) {
    parts.push(`$${model.pricing.outputPer1kTokens}/1K output tokens`);
  }
  if (model.benchmarks?.tokensPerSecond !== undefined) {
    parts.push(`${model.benchmarks.tokensPerSecond} tok/s`);
  }

  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Stub data
//
// Representative values as of mid-2025 (not real-time).
// Replace with actual API responses once APR-205 integrates this plugin.
// ---------------------------------------------------------------------------

function makeModel(
  id: string,
  name: string,
  provider: string,
  pricing: ModelPricing,
  benchmarks: ModelBenchmarks,
  contextWindow: number,
): ModelInfo {
  return { id, name, provider, pricing, benchmarks, contextWindow, available: true };
}

const STUB_MODELS: ModelInfo[] = [
  makeModel(
    "anthropic/claude-haiku-4-5",
    "Claude Haiku 4.5",
    "Anthropic",
    { inputPer1kTokens: 0.0008, outputPer1kTokens: 0.004 },
    { coding: 68, reasoning: 72, tokensPerSecond: 140, ttftMs: 350 },
    200_000,
  ),
  makeModel(
    "anthropic/claude-sonnet-4-6",
    "Claude Sonnet 4.6",
    "Anthropic",
    { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 },
    { coding: 84, reasoning: 87, tokensPerSecond: 95, ttftMs: 520 },
    200_000,
  ),
  makeModel(
    "openai/gpt-4.1-mini",
    "GPT-4.1 mini",
    "OpenAI",
    { inputPer1kTokens: 0.0004, outputPer1kTokens: 0.0016 },
    { coding: 65, reasoning: 70, tokensPerSecond: 130, ttftMs: 300 },
    128_000,
  ),
  makeModel(
    "google/gemini-2.5-flash",
    "Gemini 2.5 Flash",
    "Google",
    { inputPer1kTokens: 0.0005, outputPer1kTokens: 0.0015 },
    { coding: 75, reasoning: 80, tokensPerSecond: 120, ttftMs: 400 },
    1_000_000,
  ),
  makeModel(
    "openai/gpt-4.1",
    "GPT-4.1",
    "OpenAI",
    { inputPer1kTokens: 0.002, outputPer1kTokens: 0.008 },
    { coding: 80, reasoning: 83, tokensPerSecond: 100, ttftMs: 450 },
    128_000,
  ),
];
