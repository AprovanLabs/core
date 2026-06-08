/**
 * Types for the model selection engine.
 *
 * The engine maps a task's complexity score (1-5) to the best available model,
 * applying a priority order: free → subscription (prepaid) → paid (budget → mid-tier → frontier → premium).
 */

/** Complexity score assigned to a task at creation time (1 = trivial, 5 = expert). */
export type ComplexityScore = 1 | 2 | 3 | 4 | 5;

/** Quality/cost tier for a model. */
export type ModelTier = "free" | "budget" | "mid-tier" | "frontier" | "premium";

/** How a model invocation is billed. */
export type PlanType = "free_tier" | "subscription" | "paid";

/** A single routing option: a model reachable via a specific billing path. */
export interface ModelEntry {
  /** Provider-specific model ID passed to the API (e.g. "anthropic/claude-opus-4-6"). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** API provider (e.g. "anthropic", "openai", "openrouter", "google"). */
  provider: string;
  /** Quality tier of this model. */
  tier: ModelTier;
  /** How calls to this model are billed. */
  planType: PlanType;
  /**
   * If planType is "subscription", the subscription plan that covers this model
   * (e.g. "opencode", "claude"). Must match SubscriptionQuota.planName.
   */
  subscriptionPlan?: string;
}

/** Runtime quota state for a subscription plan. */
export interface SubscriptionQuota {
  /** Plan name (must match ModelEntry.subscriptionPlan). */
  planName: string;
  /** Whether this plan currently has quota available. */
  hasAvailableQuota: boolean;
  /** Remaining units (tokens, requests, etc.) — informational only. */
  remainingUnits?: number;
}

/**
 * Plugin interface for injecting 3rd-party model scoring data (e.g. Artificial Analysis, Chatbot Arena).
 *
 * Scaffolded for future MCP integration. The engine calls registered plugins to collect
 * external performance/cost data, but does NOT weight it in selection decisions yet.
 * Once 3rd-party data sources are validated, the weighting logic can be added here.
 */
export interface ScoringPlugin {
  /** Unique plugin identifier. */
  name: string;
  /**
   * Fetch external performance or cost data for the given model IDs.
   * Returns a map of modelId → arbitrary metadata.
   */
  getModelData(
    modelIds: string[],
  ): Promise<Record<string, Record<string, unknown>>>;
}

/** Input to the model selection engine. */
export interface SelectionInput {
  /** Complexity score for the task (1-5). */
  complexityScore: ComplexityScore;
  /**
   * Current quota state for subscription plans.
   * If omitted, subscription plans are treated as having no available quota.
   * Pass `[{ planName, hasAvailableQuota: true }]` to enable subscription routing.
   */
  quotaState?: SubscriptionQuota[];
  /**
   * 3rd-party scoring plugins (MCP integration points).
   * Data is collected but NOT yet weighted in selection decisions.
   */
  plugins?: ScoringPlugin[];
  /**
   * Optional override catalog. Defaults to DEFAULT_CATALOG.
   * Primarily for testing and future dynamic catalog injection.
   */
  catalog?: ModelEntry[];
}

/** Result returned by the model selection engine. */
export interface SelectionResult {
  /** Provider-specific model ID to pass to the API. */
  modelId: string;
  /** API provider. */
  provider: string;
  /** Quality tier of the selected model. */
  tier: ModelTier;
  /** Billing path for this model. */
  planType: PlanType;
  /** Subscription plan name if planType is "subscription". */
  subscriptionPlan?: string;
  /** Human-readable explanation of the selection decision. */
  reasoning: string;
}
