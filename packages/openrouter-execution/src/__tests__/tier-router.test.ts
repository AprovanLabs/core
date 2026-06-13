import { describe, it, expect } from 'vitest';
import { resolveTier } from '../tier-router.js';
import { ModelTier } from '../types.js';

describe('resolveTier', () => {
  describe('free tier (complexity ≤ 2, tradeoff < 7)', () => {
    it('complexity=1, tradeoff=0 → FREE', () => {
      expect(resolveTier(1, 0)).toBe(ModelTier.FREE);
    });
    it('complexity=2, tradeoff=6 → FREE', () => {
      expect(resolveTier(2, 6)).toBe(ModelTier.FREE);
    });
  });

  describe('quality upgrade from free tier (tradeoff ≥ 7)', () => {
    it('complexity=1, tradeoff=7 → BUDGET', () => {
      expect(resolveTier(1, 7)).toBe(ModelTier.BUDGET);
    });
    it('complexity=2, tradeoff=10 → BUDGET', () => {
      expect(resolveTier(2, 10)).toBe(ModelTier.BUDGET);
    });
  });

  describe('medium complexity', () => {
    it('complexity=3, tradeoff=0 → BUDGET', () => {
      expect(resolveTier(3, 0)).toBe(ModelTier.BUDGET);
    });
    it('complexity=3, tradeoff=6 → BUDGET', () => {
      expect(resolveTier(3, 6)).toBe(ModelTier.BUDGET);
    });
    it('complexity=3, tradeoff=7 → MID_TIER', () => {
      expect(resolveTier(3, 7)).toBe(ModelTier.MID_TIER);
    });
    it('complexity=3, tradeoff=10 → MID_TIER', () => {
      expect(resolveTier(3, 10)).toBe(ModelTier.MID_TIER);
    });
  });

  describe('high complexity', () => {
    it('complexity=4, tradeoff=0 → MID_TIER', () => {
      expect(resolveTier(4, 0)).toBe(ModelTier.MID_TIER);
    });
    it('complexity=4, tradeoff=6 → MID_TIER', () => {
      expect(resolveTier(4, 6)).toBe(ModelTier.MID_TIER);
    });
    it('complexity=4, tradeoff=7 → FRONTIER', () => {
      expect(resolveTier(4, 7)).toBe(ModelTier.FRONTIER);
    });
  });

  describe('maximum complexity', () => {
    it('complexity=5, tradeoff=0 → FRONTIER', () => {
      expect(resolveTier(5, 0)).toBe(ModelTier.FRONTIER);
    });
    it('complexity=5, tradeoff=10 → FRONTIER', () => {
      expect(resolveTier(5, 10)).toBe(ModelTier.FRONTIER);
    });
  });
});
