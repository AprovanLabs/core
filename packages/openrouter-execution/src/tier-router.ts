import { ModelTier, type ComplexityScore, type CostQualityTradeoff } from './types.js';

/**
 * Maps a complexity score and cost-quality tradeoff to a model tier.
 *
 * Complexity defines the base tier; tradeoff nudges into adjacent tiers:
 *   0-3 = cost-priority (stay cheap or go cheaper)
 *   4-6 = balanced (follow base complexity)
 *   7-10 = quality-priority (upgrade one tier when possible)
 *
 * Free models are always tried first for complexity ≤ 2 unless tradeoff ≥ 7.
 */
export function resolveTier(
  complexity: ComplexityScore,
  tradeoff: CostQualityTradeoff,
): ModelTier {
  if (complexity <= 2) {
    return tradeoff >= 7 ? ModelTier.BUDGET : ModelTier.FREE;
  }
  if (complexity === 3) {
    return tradeoff >= 7 ? ModelTier.MID_TIER : ModelTier.BUDGET;
  }
  if (complexity === 4) {
    return tradeoff >= 7 ? ModelTier.FRONTIER : ModelTier.MID_TIER;
  }
  // complexity === 5: always frontier regardless of tradeoff
  return ModelTier.FRONTIER;
}
