import { MODEL_CATALOG } from './model-catalog.js';
import { OpenRouterClient, type ChatMessage } from './openrouter-client.js';
import { resolveTier } from './tier-router.js';
import { ExecutionError, type ExecutionRequest, type ExecutionResult } from './types.js';

export interface ExecutorConfig {
  openRouterApiKey: string;
  appName?: string;
  appURL?: string;
  timeoutMs?: number;
  /**
   * Per-request credit budget cap in USD.
   * Requests that would exceed this total price are rejected by OpenRouter.
   * Default: $0.50.
   */
  maxBudgetUsd?: number;
  /**
   * Max retry attempts per model on retryable errors (rate-limit, timeout, 5xx).
   * Default: 2.
   */
  maxRetries?: number;
}

function loadConfig(): ExecutorConfig {
  const apiKey = process.env['OPENROUTER_API_KEY'];
  if (!apiKey) {
    throw new ExecutionError(
      'OPENROUTER_API_KEY environment variable is required',
      'CONFIG_ERROR',
      false,
      false,
    );
  }
  const budgetStr = process.env['OPENROUTER_MAX_BUDGET_USD'];
  return {
    openRouterApiKey: apiKey,
    appName: process.env['OPENROUTER_APP_NAME'] ?? 'AprovanLabs',
    appURL: process.env['OPENROUTER_APP_URL'] ?? 'https://aprovan.com',
    maxBudgetUsd: budgetStr ? parseFloat(budgetStr) : 0.5,
    maxRetries: 2,
  };
}

function buildMessages(req: ExecutionRequest): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (req.systemPrompt) {
    messages.push({ role: 'system', content: req.systemPrompt });
  }
  messages.push({ role: 'user', content: req.prompt });
  return messages;
}

/**
 * Executes a prompt against the best available model for the given complexity
 * and cost-quality tradeoff, routing through OpenRouter with BYOK-first
 * provider preferences and automatic fallback across models in the tier.
 *
 * Routing priority within each tier:
 *   1. First model in catalog (BYOK subscription key used automatically by OpenRouter)
 *   2. Subsequent models as fallback if first fails
 *
 * For complexity ≤ 2, routes to free models first unless tradeoff ≥ 7.
 */
export async function execute(
  request: ExecutionRequest,
  config?: ExecutorConfig,
): Promise<ExecutionResult> {
  const cfg = config ?? loadConfig();
  const client = new OpenRouterClient({
    apiKey: cfg.openRouterApiKey,
    appName: cfg.appName,
    appURL: cfg.appURL,
    timeoutMs: cfg.timeoutMs,
  });

  const tier = resolveTier(request.complexity, request.costQualityTradeoff);
  const models = MODEL_CATALOG[tier];
  const messages = buildMessages(request);
  const maxRetries = cfg.maxRetries ?? 2;

  let lastError: ExecutionError | undefined;
  let fallbackUsed = false;

  for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
    const model = models[modelIdx]!;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.complete({
          model: model.id,
          messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens,
          provider: {
            order: model.providers,
            allow_fallbacks: true,
          },
          ...(cfg.maxBudgetUsd != null && {
            max_price: { total: cfg.maxBudgetUsd },
          }),
        });

        const choice = response.choices[0];
        if (!choice) {
          throw new ExecutionError('Empty response from model', 'EMPTY_RESPONSE', true, true);
        }

        return {
          text: choice.message.content,
          model: response.model,
          provider: model.providers[0] ?? 'openrouter',
          tier,
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
                estimatedCost: response.usage.cost,
              }
            : undefined,
          finishReason: choice.finish_reason,
          fallbackUsed,
          fallbackReason: fallbackUsed
            ? `Primary model unavailable, using ${model.name}`
            : undefined,
        };
      } catch (err) {
        const execErr =
          err instanceof ExecutionError
            ? err
            : new ExecutionError(
                String(err instanceof Error ? err.message : err),
                'UNEXPECTED',
                false,
                false,
                err instanceof Error ? err : undefined,
              );

        lastError = execErr;

        if (!execErr.retryable || attempt >= maxRetries) break;
      }
    }

    // All retries for this model exhausted — try next as fallback
    fallbackUsed = true;
  }

  throw lastError ??
    new ExecutionError('All models in tier exhausted', 'ALL_FAILED', false, false);
}
