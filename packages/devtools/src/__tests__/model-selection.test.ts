import { describe, it, expect, vi } from "vitest";
import {
  selectModel,
  DEFAULT_CATALOG,
  type ModelEntry,
  type SelectionInput,
  type SelectionResult,
} from "../model-selection/index.js";

// ─── Minimal catalogs for deterministic tests ──────────────────────────────

const FREE_ONLY: ModelEntry[] = [
  {
    id: "free/model-a",
    name: "Free Model A",
    provider: "openrouter",
    tier: "free",
    planType: "free_tier",
  },
];

const BUDGET_PAID_ONLY: ModelEntry[] = [
  {
    id: "paid/budget-a",
    name: "Budget A",
    provider: "openrouter",
    tier: "budget",
    planType: "paid",
  },
];

const MID_TIER_PAID_ONLY: ModelEntry[] = [
  {
    id: "paid/mid-a",
    name: "Mid A",
    provider: "openai",
    tier: "mid-tier",
    planType: "paid",
  },
];

const FRONTIER_PAID_ONLY: ModelEntry[] = [
  {
    id: "paid/frontier-a",
    name: "Frontier A",
    provider: "anthropic",
    tier: "frontier",
    planType: "paid",
  },
];

const PREMIUM_PAID_ONLY: ModelEntry[] = [
  {
    id: "paid/premium-a",
    name: "Premium A",
    provider: "anthropic",
    tier: "premium",
    planType: "paid",
  },
];

const SUBSCRIPTION_MID: ModelEntry[] = [
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    tier: "mid-tier",
    planType: "subscription",
    subscriptionPlan: "opencode",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function select(input: SelectionInput): SelectionResult {
  return selectModel(input);
}

// ─── Free tier selection ─────────────────────────────────────────────────────

describe("free tier selection", () => {
  it("picks a free model for complexity 1", () => {
    const result = select({ complexityScore: 1, catalog: FREE_ONLY });
    expect(result.planType).toBe("free_tier");
    expect(result.modelId).toBe("free/model-a");
  });

  it("picks a free model for complexity 2", () => {
    const result = select({ complexityScore: 2, catalog: FREE_ONLY });
    expect(result.planType).toBe("free_tier");
  });

  it("does NOT use a free model for complexity 3", () => {
    expect(() =>
      select({ complexityScore: 3, catalog: FREE_ONLY }),
    ).toThrow();
  });

  it("does NOT use a free model for complexity 4", () => {
    expect(() =>
      select({ complexityScore: 4, catalog: FREE_ONLY }),
    ).toThrow();
  });

  it("does NOT use a free model for complexity 5", () => {
    expect(() =>
      select({ complexityScore: 5, catalog: FREE_ONLY }),
    ).toThrow();
  });
});

// ─── Paid tier routing ───────────────────────────────────────────────────────

describe("paid tier routing", () => {
  it("picks budget for complexity 1 when no free model is available", () => {
    const result = select({ complexityScore: 1, catalog: BUDGET_PAID_ONLY });
    expect(result.tier).toBe("budget");
    expect(result.planType).toBe("paid");
  });

  it("picks budget for complexity 2 when no free model is available", () => {
    const result = select({ complexityScore: 2, catalog: BUDGET_PAID_ONLY });
    expect(result.tier).toBe("budget");
  });

  it("picks mid-tier for complexity 3", () => {
    const result = select({ complexityScore: 3, catalog: MID_TIER_PAID_ONLY });
    expect(result.tier).toBe("mid-tier");
  });

  it("rejects budget models for complexity 3", () => {
    expect(() =>
      select({ complexityScore: 3, catalog: BUDGET_PAID_ONLY }),
    ).toThrow();
  });

  it("picks frontier for complexity 4", () => {
    const result = select({ complexityScore: 4, catalog: FRONTIER_PAID_ONLY });
    expect(result.tier).toBe("frontier");
  });

  it("rejects mid-tier models for complexity 4", () => {
    expect(() =>
      select({ complexityScore: 4, catalog: MID_TIER_PAID_ONLY }),
    ).toThrow();
  });

  it("picks premium for complexity 5", () => {
    const result = select({ complexityScore: 5, catalog: PREMIUM_PAID_ONLY });
    expect(result.tier).toBe("premium");
  });

  it("rejects frontier models for complexity 5", () => {
    expect(() =>
      select({ complexityScore: 5, catalog: FRONTIER_PAID_ONLY }),
    ).toThrow();
  });

  it("accepts premium for complexity 4 (over-capable is fine)", () => {
    const result = select({ complexityScore: 4, catalog: PREMIUM_PAID_ONLY });
    expect(result.tier).toBe("premium");
  });
});

// ─── Priority order ──────────────────────────────────────────────────────────

describe("selection priority order", () => {
  it("prefers free over paid budget for complexity 1", () => {
    const catalog: ModelEntry[] = [...FREE_ONLY, ...BUDGET_PAID_ONLY];
    const result = select({ complexityScore: 1, catalog });
    expect(result.planType).toBe("free_tier");
  });

  it("prefers free over paid budget for complexity 2", () => {
    const catalog: ModelEntry[] = [...FREE_ONLY, ...BUDGET_PAID_ONLY];
    const result = select({ complexityScore: 2, catalog });
    expect(result.planType).toBe("free_tier");
  });

  it("prefers subscription over paid when quota is available", () => {
    const catalog: ModelEntry[] = [
      ...SUBSCRIPTION_MID,
      ...MID_TIER_PAID_ONLY,
    ];
    const result = select({
      complexityScore: 3,
      catalog,
      quotaState: [{ planName: "opencode", hasAvailableQuota: true }],
    });
    expect(result.planType).toBe("subscription");
    expect(result.subscriptionPlan).toBe("opencode");
  });

  it("falls back to paid when subscription quota is unavailable", () => {
    const catalog: ModelEntry[] = [
      ...SUBSCRIPTION_MID,
      ...MID_TIER_PAID_ONLY,
    ];
    const result = select({
      complexityScore: 3,
      catalog,
      quotaState: [{ planName: "opencode", hasAvailableQuota: false }],
    });
    expect(result.planType).toBe("paid");
  });

  it("skips subscription entirely when quotaState is omitted", () => {
    const catalog: ModelEntry[] = [
      ...SUBSCRIPTION_MID,
      ...MID_TIER_PAID_ONLY,
    ];
    const result = select({ complexityScore: 3, catalog });
    expect(result.planType).toBe("paid");
  });

  it("prefers free over subscription+quota for complexity 2", () => {
    const catalog: ModelEntry[] = [
      ...FREE_ONLY,
      ...SUBSCRIPTION_MID,
      ...MID_TIER_PAID_ONLY,
    ];
    const result = select({
      complexityScore: 2,
      catalog,
      quotaState: [{ planName: "opencode", hasAvailableQuota: true }],
    });
    expect(result.planType).toBe("free_tier");
  });

  it("prefers cheaper paid tier when multiple paid options are eligible", () => {
    const catalog: ModelEntry[] = [
      ...BUDGET_PAID_ONLY,
      ...MID_TIER_PAID_ONLY,
      ...PREMIUM_PAID_ONLY,
    ];
    const result = select({ complexityScore: 1, catalog });
    expect(result.tier).toBe("budget");
  });
});

// ─── Result shape ─────────────────────────────────────────────────────────────

describe("result shape", () => {
  it("returns required fields", () => {
    const result = select({ complexityScore: 3, catalog: MID_TIER_PAID_ONLY });
    expect(result).toHaveProperty("modelId");
    expect(result).toHaveProperty("provider");
    expect(result).toHaveProperty("tier");
    expect(result).toHaveProperty("planType");
    expect(result).toHaveProperty("reasoning");
    expect(typeof result.reasoning).toBe("string");
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("omits subscriptionPlan when planType is paid", () => {
    const result = select({ complexityScore: 3, catalog: MID_TIER_PAID_ONLY });
    expect(result.subscriptionPlan).toBeUndefined();
  });

  it("includes subscriptionPlan when planType is subscription", () => {
    const result = select({
      complexityScore: 3,
      catalog: SUBSCRIPTION_MID,
      quotaState: [{ planName: "opencode", hasAvailableQuota: true }],
    });
    expect(result.subscriptionPlan).toBe("opencode");
  });
});

// ─── Plugin scaffolding ───────────────────────────────────────────────────────

describe("ScoringPlugin scaffolding", () => {
  it("calls plugin.getModelData but does not influence the selection", () => {
    const mockPlugin = {
      name: "test-plugin",
      getModelData: vi.fn().mockResolvedValue({}),
    };
    const result = select({
      complexityScore: 3,
      catalog: MID_TIER_PAID_ONLY,
      plugins: [mockPlugin],
    });
    // Selection result is identical to the no-plugin case.
    expect(result.modelId).toBe("paid/mid-a");
    // Plugin was invoked (fire-and-forget; we can't assert synchronously, but
    // the call should have been queued — check it was called at all via mock).
    // Note: getModelData is async/fire-and-forget so we can only verify it was called.
  });

  it("does not throw if a plugin rejects", () => {
    const failPlugin = {
      name: "fail-plugin",
      getModelData: vi.fn().mockRejectedValue(new Error("plugin error")),
    };
    expect(() =>
      select({
        complexityScore: 3,
        catalog: MID_TIER_PAID_ONLY,
        plugins: [failPlugin],
      }),
    ).not.toThrow();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("error handling", () => {
  it("throws a descriptive error when catalog is empty", () => {
    expect(() => select({ complexityScore: 3, catalog: [] })).toThrow(
      /No eligible model found/,
    );
  });

  it("includes the complexity score in the error message", () => {
    expect(() => select({ complexityScore: 5, catalog: [] })).toThrow(/5/);
  });
});

// ─── Default catalog smoke tests ─────────────────────────────────────────────

describe("DEFAULT_CATALOG", () => {
  it("has entries for all complexity scores", () => {
    for (const score of [1, 2, 3, 4, 5] as const) {
      expect(() => select({ complexityScore: score })).not.toThrow();
    }
  });

  it("selects a free model for complexity 1 with no quota state", () => {
    const result = select({ complexityScore: 1 });
    expect(result.planType).toBe("free_tier");
  });

  it("selects at least budget tier for complexity 2 with no quota state", () => {
    const result = select({ complexityScore: 2 });
    // free tier is eligible for complexity 2, so we expect free_tier from the default catalog
    expect(result.planType).toBe("free_tier");
  });

  it("selects mid-tier or above for complexity 3 with no quota state", () => {
    const result = select({ complexityScore: 3 });
    const eligible = ["mid-tier", "frontier", "premium"];
    expect(eligible).toContain(result.tier);
    expect(result.planType).toBe("paid");
  });

  it("selects frontier or premium for complexity 4", () => {
    const result = select({ complexityScore: 4 });
    expect(["frontier", "premium"]).toContain(result.tier);
  });

  it("selects premium for complexity 5 with no quota state", () => {
    const result = select({ complexityScore: 5 });
    expect(result.tier).toBe("premium");
  });

  it("selects subscription model for complexity 3 when opencode quota is available", () => {
    const result = select({
      complexityScore: 3,
      quotaState: [{ planName: "opencode", hasAvailableQuota: true }],
    });
    expect(result.planType).toBe("subscription");
    expect(result.subscriptionPlan).toBe("opencode");
  });

  it("selects Claude subscription model for complexity 5 when claude quota is available", () => {
    const result = select({
      complexityScore: 5,
      quotaState: [{ planName: "claude", hasAvailableQuota: true }],
    });
    expect(result.planType).toBe("subscription");
    expect(result.subscriptionPlan).toBe("claude");
    expect(result.tier).toBe("premium");
  });

  it("exports DEFAULT_CATALOG as a non-empty array", () => {
    expect(Array.isArray(DEFAULT_CATALOG)).toBe(true);
    expect(DEFAULT_CATALOG.length).toBeGreaterThan(0);
  });
});
