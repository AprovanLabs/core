import type { InlineConfig } from 'vitest'

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

type Preset = 'base' | 'node' | 'browser'

const coverageDefaults: InlineConfig['coverage'] = {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/__tests__/**'],
}

const presets: Record<Preset, InlineConfig> = {
  base: {
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: coverageDefaults,
    globals: false,
  },
  node: {
    environment: 'node',
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: coverageDefaults,
    globals: false,
  },
  browser: {
    environment: 'jsdom',
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: coverageDefaults,
    globals: false,
  },
}

function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target } as Record<string, unknown>
  for (const key of Object.keys(source) as (keyof typeof source)[]) {
    const sourceVal = source[key]
    const targetVal = result[key as string]
    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      targetVal !== null &&
      targetVal !== undefined &&
      typeof sourceVal === 'object' &&
      typeof targetVal === 'object' &&
      !Array.isArray(sourceVal) &&
      !Array.isArray(targetVal)
    ) {
      result[key as string] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      )
    } else if (sourceVal !== undefined) {
      result[key as string] = sourceVal
    }
  }
  return result as T
}

function defineConfigInternal(preset: Preset, overrides: DeepPartial<InlineConfig>): InlineConfig
function defineConfigInternal(overrides: DeepPartial<InlineConfig>): InlineConfig
function defineConfigInternal(
  presetOrOverrides: Preset | DeepPartial<InlineConfig>,
  overrides?: DeepPartial<InlineConfig>,
): InlineConfig {
  if (typeof presetOrOverrides === 'string') {
    return deepMerge(presets[presetOrOverrides], overrides ?? {})
  }
  return deepMerge(presets.base, presetOrOverrides)
}

export const defineConfig = defineConfigInternal
export { presets }
export type { Preset, DeepPartial }
