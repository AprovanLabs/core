/**
 * Core types for the model data source plugin interface.
 *
 * These types define the contract between 3rd-party data plugins and the
 * model selection engine (APR-205). Plugins are read-only data providers;
 * they surface benchmarks, pricing, and availability information but do
 * NOT make routing or selection decisions — that logic lives in APR-205.
 */

/**
 * Task complexity tier (1 = simplest, 5 = most demanding).
 * Mirrors the complexity scoring system used across Aprovan agents.
 *
 * Rough guidelines:
 *   1 — trivial / well-defined single-step tasks
 *   2 — straightforward multi-step tasks
 *   3 — moderately complex tasks requiring reasoning
 *   4 — hard tasks requiring frontier capabilities
 *   5 — research / highest-complexity work
 */
export type ComplexityTier = 1 | 2 | 3 | 4 | 5;

/** Pricing for a model in USD. All amounts are per 1K tokens. */
export interface ModelPricing {
  /** Cost per 1K input (prompt) tokens */
  inputPer1kTokens: number;
  /** Cost per 1K output (completion) tokens */
  outputPer1kTokens: number;
}

/**
 * Benchmark scores sourced from an external data provider.
 * All numeric scores are normalised to 0–100 unless otherwise noted.
 */
export interface ModelBenchmarks {
  /** General coding ability (e.g. HumanEval, SWE-bench) */
  coding?: number;
  /** General reasoning (e.g. MMLU, GPQA) */
  reasoning?: number;
  /** Math (e.g. MATH, AIME) */
  math?: number;
  /** Instruction following / chat (e.g. MT-Bench) */
  instruction?: number;
  /** Median output throughput in tokens per second */
  tokensPerSecond?: number;
  /** Median time-to-first-token in milliseconds */
  ttftMs?: number;
}

/** A model entry as returned by a model data plugin */
export interface ModelInfo {
  /**
   * Provider-scoped unique model identifier.
   * Convention: "<provider-slug>/<model-slug>"
   * e.g. "anthropic/claude-sonnet-4-6"
   */
  id: string;
  /** Human-readable model name */
  name: string;
  /** Provider name (e.g. "Anthropic", "OpenAI", "Google") */
  provider: string;
  /** Pricing information (undefined if not reported by this source) */
  pricing?: ModelPricing;
  /** Benchmark scores (undefined if not reported by this source) */
  benchmarks?: ModelBenchmarks;
  /** Maximum context window in tokens */
  contextWindow?: number;
  /** Whether the model is currently available / not deprecated */
  available: boolean;
  /** Arbitrary extra data from the source (e.g. tags, release date) */
  metadata?: Record<string, unknown>;
}

/** Query parameters for recommendation requests */
export interface RecommendationQuery {
  /** Task complexity tier — drives the performance/cost trade-off */
  complexity: ComplexityTier;
  /**
   * Hard cap on cost per 1K output tokens in USD.
   * Models exceeding this are excluded from results.
   */
  maxCostPer1kOutputTokens?: number;
  /** Maximum number of recommendations to return (default: 5) */
  limit?: number;
}

/** A model recommendation produced by a plugin's ranking logic */
export interface ModelRecommendation {
  /** The recommended model */
  model: ModelInfo;
  /**
   * Fit score from 0 to 1 (higher = better match for the query).
   * This is a data-layer score, not a final routing decision.
   */
  score: number;
  /** Human-readable rationale produced by the plugin */
  rationale: string;
}

/**
 * Configuration passed to a plugin at initialisation time.
 * Plugins must not be queried before `init()` has been called.
 */
export interface PluginConfig {
  /** Override the default API endpoint */
  endpoint?: string;
  /** Plugin-specific credentials (API keys, tokens, etc.) */
  credentials?: Record<string, string>;
  /** Additional plugin-specific settings */
  options?: Record<string, unknown>;
}

/**
 * MCP plugin interface for a 3rd-party model data source.
 *
 * Each concrete plugin represents one external data provider (e.g. Artificial
 * Analysis, Chatbot Arena). Plugins expose three query methods that map
 * directly to the draft interface from APR-207:
 *
 *   list_models()                        → listModels()
 *   get_model(id)                        → getModel(id)
 *   get_recommendations(complexity, ...) → getRecommendations(query)
 *
 * **Scaffolding note (APR-207):** Plugin data is not yet wired into model
 * selection decisions. The hook point in `selection-hook.ts` is the intended
 * integration site for APR-205.
 *
 * @example
 * ```typescript
 * const plugin = new ArtificialAnalysisPlugin();
 * await plugin.init({ credentials: { apiKey: process.env.AA_API_KEY ?? "" } });
 * const models = await plugin.listModels();
 * const top = await plugin.getRecommendations({ complexity: 3, limit: 3 });
 * ```
 */
export interface ModelDataPlugin {
  /** Stable unique identifier for this plugin (e.g. "artificial-analysis") */
  readonly id: string;
  /** Human-readable name of the data source */
  readonly name: string;
  /** One-line description of what this data source provides */
  readonly description: string;

  /**
   * Initialise the plugin with its configuration.
   * Must be called exactly once before any query methods.
   */
  init(config: PluginConfig): Promise<void>;

  /**
   * Return all models known to this source with benchmark scores and pricing.
   * Returns an empty array when the source is unavailable or returns no data.
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * Return detailed info for one model by its ID.
   * Returns `null` if the model is not found in this source.
   */
  getModel(id: string): Promise<ModelInfo | null>;

  /**
   * Return a ranked list of model recommendations for the given query.
   *
   * The plugin provides a *data-layer* ranking only. The model selection
   * engine (APR-205) is solely responsible for final routing decisions and
   * may discard, re-rank, or augment these results.
   */
  getRecommendations(query: RecommendationQuery): Promise<ModelRecommendation[]>;
}
