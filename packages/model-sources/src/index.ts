/**
 * @aprovan/model-sources
 *
 * MCP plugin interface for 3rd-party model performance data sources.
 *
 * Provides:
 * - `ModelDataPlugin` — interface every data-source plugin must implement
 * - `ModelSourceRegistry` — in-memory registry for managing plugins
 * - `registry` — shared singleton registry instance
 * - `noopSelectionHook` / `createRegistryHook` — hook point for APR-205
 * - `ArtificialAnalysisPlugin` — reference implementation (stub data)
 *
 * **Scaffolding note (APR-207):** Plugin data is not yet wired into model
 * selection decisions. See `selection-hook.ts` for the integration site.
 */

// Types
export type {
  ComplexityTier,
  ModelPricing,
  ModelBenchmarks,
  ModelInfo,
  RecommendationQuery,
  ModelRecommendation,
  PluginConfig,
  ModelDataPlugin,
} from "./types.js";

// Registry
export { ModelSourceRegistry, registry } from "./registry.js";

// APR-205 hook point
export type { ModelSelectionHook } from "./selection-hook.js";
export { noopSelectionHook, createRegistryHook } from "./selection-hook.js";

// Reference plugins
export { ArtificialAnalysisPlugin } from "./plugins/artificial-analysis.js";
