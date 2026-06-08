import type { ModelEntry } from "./types.js";

/**
 * Default model catalog.
 *
 * Ordered within each tier by preference (best cost-to-quality ratio first).
 * Each entry is a unique routing option: same model ID may appear multiple times
 * under different plan types (free_tier, subscription, paid).
 *
 * Selection priority applied by the engine:
 *   1. free_tier  (if complexity ≤ 2)
 *   2. subscription  (if quota available)
 *   3. paid  (budget → mid-tier → frontier → premium, in tier order)
 */
export const DEFAULT_CATALOG: ModelEntry[] = [
  // ─── Free tier (OpenRouter free models) ──────────────────────────────────
  {
    id: "deepseek/deepseek-v4-flash:free",
    name: "DeepSeek V4 Flash (Free)",
    provider: "openrouter",
    tier: "free",
    planType: "free_tier",
  },
  {
    id: "meta-llama/llama-4-scout:free",
    name: "Llama 4 Scout (Free)",
    provider: "openrouter",
    tier: "free",
    planType: "free_tier",
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder (Free)",
    provider: "openrouter",
    tier: "free",
    planType: "free_tier",
  },

  // ─── Subscription: OpenCode plan ─────────────────────────────────────────
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    tier: "budget",
    planType: "subscription",
    subscriptionPlan: "opencode",
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    tier: "mid-tier",
    planType: "subscription",
    subscriptionPlan: "opencode",
  },

  // ─── Subscription: Claude plan ───────────────────────────────────────────
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    tier: "budget",
    planType: "subscription",
    subscriptionPlan: "claude",
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    tier: "mid-tier",
    planType: "subscription",
    subscriptionPlan: "claude",
  },
  {
    id: "anthropic/claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    tier: "premium",
    planType: "subscription",
    subscriptionPlan: "claude",
  },

  // ─── Budget paid ─────────────────────────────────────────────────────────
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "openrouter",
    tier: "budget",
    planType: "paid",
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    tier: "budget",
    planType: "paid",
  },
  {
    id: "openai/gpt-4.1-mini",
    name: "GPT-4.1 mini",
    provider: "openai",
    tier: "budget",
    planType: "paid",
  },

  // ─── Mid-tier paid ───────────────────────────────────────────────────────
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    tier: "mid-tier",
    planType: "paid",
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    tier: "mid-tier",
    planType: "paid",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    tier: "mid-tier",
    planType: "paid",
  },

  // ─── Frontier paid ───────────────────────────────────────────────────────
  {
    id: "anthropic/claude-sonnet-4-6:thinking",
    name: "Claude Sonnet 4.6 (Extended Thinking)",
    provider: "anthropic",
    tier: "frontier",
    planType: "paid",
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    tier: "frontier",
    planType: "paid",
  },

  // ─── Premium paid ────────────────────────────────────────────────────────
  {
    id: "anthropic/claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
    tier: "premium",
    planType: "paid",
  },
  {
    id: "google/gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    provider: "google",
    tier: "premium",
    planType: "paid",
  },
];
