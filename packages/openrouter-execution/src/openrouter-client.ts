import { ExecutionError } from './types.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderPreferences {
  /** Ordered list of provider names to prefer (e.g. ['Anthropic', 'OpenAI']). */
  order?: string[];
  /** Allow OpenRouter to try other providers if preferred ones fail. Default true. */
  allow_fallbacks?: boolean;
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  provider?: ProviderPreferences;
  /**
   * Per-request budget cap (USD) to prevent runaway costs.
   * OpenRouter rejects requests that would exceed this total price.
   */
  max_price?: {
    total?: number;
    prompt?: number;
    completion?: number;
  };
}

export interface CompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    /** Actual cost in USD (populated by OpenRouter). */
    cost?: number;
  };
}

export interface OpenRouterClientConfig {
  apiKey: string;
  baseURL?: string;
  /** Application name sent in X-Title header for OpenRouter analytics. */
  appName?: string;
  /** Application URL sent in HTTP-Referer header. */
  appURL?: string;
  timeoutMs?: number;
}

export class OpenRouterClient {
  private readonly baseURL: string;
  private readonly timeoutMs: number;
  private readonly headers: Record<string, string>;

  constructor(config: OpenRouterClientConfig) {
    this.baseURL = config.baseURL ?? OPENROUTER_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...(config.appName ? { 'X-Title': config.appName } : {}),
      ...(config.appURL ? { 'HTTP-Referer': config.appURL } : {}),
    };
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(req),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const retryable = res.status === 429 || res.status >= 500;
        throw new ExecutionError(
          `OpenRouter API error ${res.status} ${res.statusText}: ${body}`,
          res.status === 429 ? 'RATE_LIMIT' : 'API_ERROR',
          retryable,
          retryable,
        );
      }

      return (await res.json()) as CompletionResponse;
    } catch (err) {
      if (err instanceof ExecutionError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ExecutionError('Request timed out', 'TIMEOUT', true, true, err);
      }
      throw new ExecutionError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
        true,
        true,
        err instanceof Error ? err : undefined,
      );
    } finally {
      clearTimeout(timerId);
    }
  }
}
