import { DEFAULT_CATALOG } from "./catalog.js";
import type {
  ComplexityScore,
  ModelEntry,
  ModelTier,
  SelectionInput,
  SelectionResult,
  SubscriptionQuota,
} from "./types.js";

/**
 * Numeric rank for each tier. Higher = more capable and more expensive.
 * Used to determine whether a model meets the minimum required tier for a complexity score.
 */
const TIER_RANK: Record<ModelTier, number> = {
  free: 0,
  budget: 1,
  "mid-tier": 2,
  frontier: 3,
  premium: 4,
};

/**
 * Minimum tier required from paid/subscription models for each complexity score.
 * Free-tier models are eligible for complexity 1-2 regardless of this table.
 */
const COMPLEXITY_MIN_TIER: Record<ComplexityScore, ModelTier> = {
  1: "budget",
  2: "budget",
  3: "mid-tier",
  4: "frontier",
  5: "premium",
};

/**
 * Returns true if the model entry is eligible to handle the given complexity score.
 *
 * Free-tier models: eligible for complexity 1 or 2 only.
 * Subscription / paid models: eligible when their tier rank >= the minimum tier rank
 * required for the complexity score.
 */
function isEligible(model: ModelEntry, complexity: ComplexityScore): boolean {
  if (model.planType === "free_tier") {
    return complexity <= 2;
  }
  const minTier = COMPLEXITY_MIN_TIER[complexity];
  return TIER_RANK[model.tier] >= TIER_RANK[minTier];
}

/**
 * Builds a priority key for sorting eligible models.
 *
 * Selection priority (ascending = preferred first):
 *   0 – free_tier
 *   1 – subscription (sunk cost, prefer over paid)
 *   2 – paid  (sorted internally by tier rank, cheapest first)
 */
function priorityKey(
  model: ModelEntry,
  availablePlans: Set<string>,
): number | null {
  if (model.planType === "free_tier") return 0;

  if (model.planType === "subscription") {
    const plan = model.subscriptionPlan ?? "";
    if (availablePlans.has(plan)) return 1;
    return null; // quota unavailable — skip
  }

  // paid: sort by tier (cheapest first within paid bucket)
  return 2 + TIER_RANK[model.tier];
}

/**
 * Selects the best model for a task given its complexity score and current quota state.
 *
 * Selection priority order:
 *   1. Free models  (OpenRouter free tier) — complexity ≤ 2 only
 *   2. Subscription plans with available quota — sunk cost, prefer over pay-as-you-go
 *   3. Budget paid models  — complexity 1-3
 *   4. Mid-tier paid models — complexity 3-4
 *   5. Frontier paid models — complexity 4
 *   6. Premium paid models  — complexity 5
 *
 * 3rd-party plugin data (ScoringPlugin) is collected but NOT weighted yet.
 * Once data sources are validated, weighting can be introduced in this function.
 *
 * @throws {Error} if no eligible model is found (should not happen with the default catalog).
 */
export function selectModel(input: SelectionInput): SelectionResult {
  const catalog = input.catalog ?? DEFAULT_CATALOG;
  const { complexityScore, quotaState = [], plugins = [] } = input;

  // Build the set of subscription plans that currently have available quota.
  const availablePlans = new Set<string>(
    (quotaState as SubscriptionQuota[])
      .filter((q) => q.hasAvailableQuota)
      .map((q) => q.planName),
  );

  // Scaffold: invoke plugins to collect external data (not yet weighted).
  if (plugins.length > 0) {
    const modelIds = catalog.map((m) => m.id);
    void Promise.all(plugins.map((p) => p.getModelData(modelIds))).catch(
      () => {
        // Plugin errors must never block model selection.
      },
    );
  }

  // Filter eligible models and compute priority keys.
  const candidates: Array<{ model: ModelEntry; priority: number }> = [];
  for (const model of catalog) {
    if (!isEligible(model, complexityScore)) continue;
    const priority = priorityKey(model, availablePlans);
    if (priority === null) continue; // subscription with no quota
    candidates.push({ model, priority });
  }

  if (candidates.length === 0) {
    throw new Error(
      `No eligible model found for complexity score ${complexityScore}. ` +
        `Check that the catalog contains entries for tier >= ${COMPLEXITY_MIN_TIER[complexityScore]}.`,
    );
  }

  // Sort by priority (ascending), then by catalog order (stable) within the same priority.
  candidates.sort((a, b) => a.priority - b.priority);
  const { model, priority } = candidates[0]!;

  const reasoning = buildReasoning(model, priority, complexityScore);

  return {
    modelId: model.id,
    provider: model.provider,
    tier: model.tier,
    planType: model.planType,
    ...(model.subscriptionPlan !== undefined && {
      subscriptionPlan: model.subscriptionPlan,
    }),
    reasoning,
  };
}

function buildReasoning(
  model: ModelEntry,
  priority: number,
  complexity: ComplexityScore,
): string {
  if (priority === 0) {
    return (
      `Selected free-tier model "${model.name}" (complexity ${complexity} ≤ 2; ` +
      `no cost incurred).`
    );
  }
  if (priority === 1) {
    return (
      `Selected subscription model "${model.name}" via plan "${model.subscriptionPlan}" ` +
      `(prepaid quota available; sunk cost preferred over pay-as-you-go).`
    );
  }
  return (
    `Selected paid model "${model.name}" at ${model.tier} tier ` +
    `(required tier for complexity ${complexity}: ${COMPLEXITY_MIN_TIER[complexity]}).`
  );
}
