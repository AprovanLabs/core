import { z } from 'zod';

/**
 * Complexity score from model selection engine (1-5)
 * 1 = very simple, 5 = extremely complex
 */
export const ComplexityScoreSchema = z.number().int().min(1).max(5);
export type ComplexityScore = z.infer<typeof ComplexityScoreSchema>;

/**
 * Cost-quality tradeoff parameter (0-10) from model selection engine
 * 0 = prioritize cost (cheapest), 10 = prioritize quality (best model)
 */
export const CostQualityTradeoffSchema = z.number().int().min(0).max(10);
export type CostQualityTradeoff = z.infer<typeof CostQualityTradeoffSchema>;

/**
 * Model tier based on complexity and cost-quality tradeoff
 */
export enum ModelTier {
  FREE = 'free',           // OpenRouter free models (complexity 1-2)
  BUDGET = 'budget',       // Budget paid models (complexity 2-3)
  MID_TIER = 'mid_tier',   // Mid-tier models (complexity 3-4)
  FRONTIER = 'frontier',   // Frontier models (complexity 5)
}

/**
 * Provider configuration for BYOK and OpenRouter
 */
export const ProviderConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['byok', 'openrouter', 'direct']),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  models: z.array(z.string()),
  priority: z.number().int().min(0).default(0),
  creditBudget: z.number().optional(), // Max credits to spend (for OpenRouter)
  rateLimit: z.object({
    requestsPerMinute: z.number().optional(),
    tokensPerMinute: z.number().optional(),
  }).optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Model configuration within a tier
 */
export const ModelConfigSchema = z.object({
  id: z.string(),
  provider: z.string(),
  tier: z.nativeEnum(ModelTier),
  costPer1kTokens: z.number().optional(), // Input cost
  costPer1kOutputTokens: z.number().optional(), // Output cost
  qualityScore: z.number().min(0).max(10).optional(),
  supportsFreeTier: z.boolean().default(false),
  maxTokens: z.number().optional(),
  capabilities: z.array(z.string()).optional(),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Execution request from model selection engine
 */
export const ExecutionRequestSchema = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  complexity: ComplexityScoreSchema,
  costQualityTradeoff: CostQualityTradeoffSchema,
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  taskType: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

/**
 * Execution result
 */
export const ExecutionResultSchema = z.object({
  text: z.string(),
  model: z.string(),
  provider: z.string(),
  tier: z.nativeEnum(ModelTier),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
    estimatedCost: z.number().optional(),
  }).optional(),
  finishReason: z.string().optional(),
  fallbackUsed: z.boolean().default(false),
  fallbackReason: z.string().optional(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

/**
 * Execution error with retry/fallback info
 */
export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly fallbackSuggested: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

/**
 * Tier routing configuration
 */
export const TierRoutingConfigSchema = z.object({
  tier: z.nativeEnum(ModelTier),
  complexityRange: z.tuple([ComplexityScoreSchema, ComplexityScoreSchema]),
  preferredProviders: z.array(z.string()),
  fallbackProviders: z.array(z.string()),
  minCostQualityTradeoff: z.number().min(0).max(10).optional(),
  maxCostQualityTradeoff: z.number().min(0).max(10).optional(),
});
export type TierRoutingConfig = z.infer<typeof TierRoutingConfigSchema>;