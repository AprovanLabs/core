/**
 * Hook point for injecting plugin data into the model selection engine.
 *
 * APR-205 (model selection engine) will call the hook with a complexity
 * query and receive ranked recommendations sourced from registered plugins.
 * The engine is solely responsible for combining these recommendations with
 * its own scoring logic and making the final routing decision.
 *
 * **Scaffolding note (APR-207):** The hook exists but is wired to a no-op
 * by default. To activate, APR-205 should call `createRegistryHook(registry)`
 * during engine initialisation and replace the no-op reference.
 *
 * @example Activating plugin data in APR-205:
 * ```typescript
 * import { createRegistryHook, registry } from "@aprovan/model-sources";
 *
 * // Engine setup
 * const pluginHook = createRegistryHook(registry);
 *
 * // Inside model selection logic
 * const pluginRecs = await pluginHook({ complexity: task.complexity });
 * // … merge pluginRecs with internal scoring
 * ```
 */

import type { ModelRecommendation, RecommendationQuery } from "./types.js";
import type { ModelSourceRegistry } from "./registry.js";

/**
 * Signature for the plugin data hook consumed by the model selection engine.
 *
 * @param query   - Complexity tier and optional budget constraint.
 * @param registry - The registry to query (passed by the engine so the hook
 *                   can be used with any registry instance, including mocks).
 */
export type ModelSelectionHook = (
  query: RecommendationQuery,
  registry: ModelSourceRegistry,
) => Promise<ModelRecommendation[]>;

/**
 * Default no-op hook.
 *
 * Returns an empty array — plugin data is not consulted.
 * Used until APR-205 replaces this with `createRegistryHook(registry)`.
 */
export const noopSelectionHook: ModelSelectionHook = async (
  _query: RecommendationQuery,
  _registry: ModelSourceRegistry,
): Promise<ModelRecommendation[]> => {
  return [];
};

/**
 * Build a live selection hook backed by the given registry.
 *
 * The returned function queries the registry for recommendations and returns
 * them sorted by score descending. Plugins that fail are silently skipped
 * (handled internally by `ModelSourceRegistry.getRecommendations`).
 *
 * @param registry - The plugin registry to query when the hook is invoked.
 */
export function createRegistryHook(
  registry: ModelSourceRegistry,
): ModelSelectionHook {
  return async (
    query: RecommendationQuery,
    _registry: ModelSourceRegistry,
  ): Promise<ModelRecommendation[]> => {
    return registry.getRecommendations(query);
  };
}
