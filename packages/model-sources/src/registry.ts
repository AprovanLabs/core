/**
 * Plugin registry for model data sources.
 *
 * Maintains a live collection of registered ModelDataPlugin instances and
 * provides aggregate query methods. The registry itself does not make
 * selection decisions — it is a data-layer aggregator.
 *
 * **Scaffolding note (APR-207):** Data returned by this registry is not yet
 * consumed by the model selection engine. The integration hook lives in
 * `selection-hook.ts` and will be activated by APR-205.
 */

import type {
  ModelDataPlugin,
  ModelInfo,
  ModelRecommendation,
  PluginConfig,
  RecommendationQuery,
} from "./types.js";

/**
 * In-memory registry for {@link ModelDataPlugin} instances.
 *
 * @example
 * ```typescript
 * import { registry } from "@aprovan/model-sources";
 * import { ArtificialAnalysisPlugin } from "@aprovan/model-sources";
 *
 * registry.register(new ArtificialAnalysisPlugin());
 * await registry.initPlugin("artificial-analysis", {
 *   credentials: { apiKey: process.env.AA_API_KEY ?? "" },
 * });
 *
 * const models = await registry.getAllModels();
 * ```
 */
export class ModelSourceRegistry {
  private readonly plugins = new Map<string, ModelDataPlugin>();

  /**
   * Register a plugin. If a plugin with the same `id` is already
   * registered it will be replaced.
   */
  register(plugin: ModelDataPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Remove a plugin from the registry by its ID.
   * No-op if the plugin is not registered.
   */
  unregister(id: string): void {
    this.plugins.delete(id);
  }

  /**
   * Retrieve a registered plugin by ID.
   * Returns `undefined` if no plugin with that ID is registered.
   */
  getPlugin(id: string): ModelDataPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Return the IDs of all currently registered plugins.
   */
  listPluginIds(): string[] {
    return [...this.plugins.keys()];
  }

  /**
   * Initialise a specific registered plugin with the given config.
   * Throws if the plugin ID is not registered.
   */
  async initPlugin(id: string, config: PluginConfig): Promise<void> {
    const plugin = this.plugins.get(id);
    if (plugin === undefined) {
      throw new Error(`Plugin not registered: "${id}"`);
    }
    await plugin.init(config);
  }

  /**
   * Query every registered plugin for its full model list and merge results.
   *
   * Plugins that throw (e.g. because they have not been initialised) are
   * silently skipped so that one failing source does not block the rest.
   */
  async getAllModels(): Promise<ModelInfo[]> {
    const results: ModelInfo[] = [];
    for (const plugin of this.plugins.values()) {
      try {
        const models = await plugin.listModels();
        results.push(...models);
      } catch {
        // Plugin unavailable or not initialised — skip silently
      }
    }
    return results;
  }

  /**
   * Search all registered plugins for a model with the given ID.
   * Returns the first match found, or `null` if no plugin knows the model.
   */
  async getModel(modelId: string): Promise<ModelInfo | null> {
    for (const plugin of this.plugins.values()) {
      try {
        const info = await plugin.getModel(modelId);
        if (info !== null) return info;
      } catch {
        // Plugin unavailable — continue searching others
      }
    }
    return null;
  }

  /**
   * Collect recommendations from all registered plugins for the given query,
   * deduplicate by model ID (keeping the highest score), and return results
   * sorted by score descending.
   */
  async getRecommendations(
    query: RecommendationQuery,
  ): Promise<ModelRecommendation[]> {
    const all: ModelRecommendation[] = [];

    for (const plugin of this.plugins.values()) {
      try {
        const recs = await plugin.getRecommendations(query);
        all.push(...recs);
      } catch {
        // Plugin unavailable — continue
      }
    }

    // Deduplicate: for each model ID keep the highest-scoring entry
    const byModelId = new Map<string, ModelRecommendation>();
    for (const rec of all) {
      const existing = byModelId.get(rec.model.id);
      if (existing === undefined || rec.score > existing.score) {
        byModelId.set(rec.model.id, rec);
      }
    }

    return [...byModelId.values()].sort((a, b) => b.score - a.score);
  }
}

/**
 * Shared singleton registry.
 *
 * Suitable for most use cases. Consumers that need strict isolation
 * (e.g. tests) should instantiate `new ModelSourceRegistry()` directly.
 */
export const registry = new ModelSourceRegistry();
