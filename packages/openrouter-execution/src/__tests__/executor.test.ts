import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execute } from '../executor.js';
import { ModelTier, ExecutionError } from '../types.js';

const TEST_CONFIG = {
  openRouterApiKey: 'test-key',
  appName: 'AprovanLabs Test',
  maxBudgetUsd: 0.1,
  maxRetries: 1,
};

function makeSuccessResponse(model = 'deepseek/deepseek-v4-flash:free', content = 'Hello!'): object {
  return {
    id: 'test-id',
    model,
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0.001 },
  };
}

describe('execute', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes complexity=1 to a free model', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(makeSuccessResponse()), { status: 200 }));

    const result = await execute(
      { prompt: 'Hello', complexity: 1, costQualityTradeoff: 0 },
      TEST_CONFIG,
    );

    expect(result.tier).toBe(ModelTier.FREE);
    expect(result.fallbackUsed).toBe(false);
    expect(result.text).toBe('Hello!');

    const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.model).toContain(':free');
  });

  it('routes complexity=4, tradeoff=8 to frontier tier', async () => {
    const model = 'anthropic/claude-opus-4-6';
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(makeSuccessResponse(model, 'Deep answer')), { status: 200 }),
    );

    const result = await execute(
      { prompt: 'Hard task', complexity: 4, costQualityTradeoff: 8 },
      TEST_CONFIG,
    );

    expect(result.tier).toBe(ModelTier.FRONTIER);
    const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.model).toBe(model);
  });

  it('falls back to second model when first returns 500', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }))
      .mockResolvedValueOnce(new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }))
      // First model exhausted (maxRetries=1, so 2 attempts) → fallback to second model
      .mockResolvedValueOnce(new Response(JSON.stringify(makeSuccessResponse('anthropic/claude-haiku-4-5', 'Fallback reply')), { status: 200 }));

    const result = await execute(
      { prompt: 'Test', complexity: 3, costQualityTradeoff: 0 },
      TEST_CONFIG,
    );

    expect(result.fallbackUsed).toBe(true);
    expect(result.text).toBe('Fallback reply');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('includes provider preferences in request body', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(makeSuccessResponse('anthropic/claude-sonnet-4-6')), { status: 200 }),
    );

    await execute({ prompt: 'Mid task', complexity: 3, costQualityTradeoff: 7 }, TEST_CONFIG);

    const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.provider).toBeDefined();
    expect(body.provider.allow_fallbacks).toBe(true);
    expect(Array.isArray(body.provider.order)).toBe(true);
  });

  it('includes max_price when budget is configured', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(makeSuccessResponse()), { status: 200 }),
    );

    await execute({ prompt: 'Budget test', complexity: 1, costQualityTradeoff: 0 }, TEST_CONFIG);

    const body = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.max_price).toEqual({ total: 0.1 });
  });

  it('throws ExecutionError with CONFIG_ERROR when API key is missing', async () => {
    await expect(
      execute({ prompt: 'Test', complexity: 1, costQualityTradeoff: 0 }),
    ).rejects.toMatchObject({ code: 'CONFIG_ERROR' });
  });

  it('returns usage stats from response', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(makeSuccessResponse()), { status: 200 }),
    );

    const result = await execute(
      { prompt: 'Stats test', complexity: 1, costQualityTradeoff: 0 },
      TEST_CONFIG,
    );

    expect(result.usage).toMatchObject({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      estimatedCost: 0.001,
    });
  });

  it('throws ExecutionError when all models fail', async () => {
    fetchSpy.mockResolvedValue(
      new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' }),
    );

    await expect(
      execute({ prompt: 'Doom', complexity: 1, costQualityTradeoff: 0 }, TEST_CONFIG),
    ).rejects.toBeInstanceOf(ExecutionError);
  });
});
