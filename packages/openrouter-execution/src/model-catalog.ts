import { ModelTier } from './types.js';

export interface CatalogEntry {
  id: string;
  name: string;
  tier: ModelTier;
  /** Preferred OpenRouter provider names for routing (e.g. ['Anthropic', 'OpenAI']) */
  providers: string[];
}

/**
 * Models ordered by preference within each tier.
 * Subscription BYOK keys registered in OpenRouter will be used automatically
 * when the provider matches — no extra per-request config needed.
 */
export const MODEL_CATALOG: Record<ModelTier, CatalogEntry[]> = {
  [ModelTier.FREE]: [
    { id: 'deepseek/deepseek-v4-flash:free', name: 'DeepSeek V4 Flash (Free)', tier: ModelTier.FREE, providers: ['DeepSeek'] },
    { id: 'meta-llama/llama-4-scout:free', name: 'Llama 4 Scout (Free)', tier: ModelTier.FREE, providers: ['Meta'] },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (Free)', tier: ModelTier.FREE, providers: ['Qwen'] },
  ],
  [ModelTier.BUDGET]: [
    { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', tier: ModelTier.BUDGET, providers: ['DeepSeek'] },
    { id: 'anthropic/claude-haiku-4-5', name: 'Claude Haiku 4.5', tier: ModelTier.BUDGET, providers: ['Anthropic'] },
    { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 mini', tier: ModelTier.BUDGET, providers: ['OpenAI'] },
  ],
  [ModelTier.MID_TIER]: [
    { id: 'anthropic/claude-sonnet-4-6', name: 'Claude Sonnet 4.6', tier: ModelTier.MID_TIER, providers: ['Anthropic'] },
    { id: 'openai/gpt-5.2', name: 'GPT-5.2', tier: ModelTier.MID_TIER, providers: ['OpenAI'] },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: ModelTier.MID_TIER, providers: ['Google'] },
  ],
  [ModelTier.FRONTIER]: [
    { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4.6', tier: ModelTier.FRONTIER, providers: ['Anthropic'] },
    { id: 'anthropic/claude-sonnet-4-6:thinking', name: 'Claude Sonnet 4.6 (Thinking)', tier: ModelTier.FRONTIER, providers: ['Anthropic'] },
    { id: 'openai/gpt-5.2', name: 'GPT-5.2', tier: ModelTier.FRONTIER, providers: ['OpenAI'] },
  ],
};
