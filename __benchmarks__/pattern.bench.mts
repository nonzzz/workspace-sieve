import { afterAll, bench, describe } from 'vitest'
import { createWorkspacePatternWASM } from '../dist'

interface PatternMatchMatrix {
  matchRule: string[]
  expected: Array<{ input: string, state: boolean }>
}

const PATTERN_MATCH_MATRIX: PatternMatchMatrix[] = [
  {
    matchRule: ['*'],
    expected: [
      { input: '@eslint/plugin-foo', state: true },
      { input: 'express', state: true }
    ]
  },
  {
    matchRule: ['eslint-*'],
    expected: [
      { input: 'eslint-plugin-foo', state: true },
      { input: '@eslint/plugin-x', state: false }
    ]
  },
  {
    matchRule: ['*plugin*'],
    expected: [
      { input: '@eslint/plugin-foo', state: true },
      { input: 'express', state: false }
    ]
  },
  {
    matchRule: ['eslint-*', '!eslint-plugin-bar'],
    expected: [
      { input: 'eslint-plugin-foo', state: true },
      { input: 'eslint-plugin-bar', state: false }
    ]
  },
  {
    matchRule: ['!eslint-plugin-bar', 'eslint-*'],
    expected: [
      { input: 'eslint-plugin-foo', state: true },
      { input: 'eslint-plugin-bar', state: true }
    ]
  }
]

const generateInputs = (count: number): string[] => {
  const inputs: string[] = []
  const prefixes = ['eslint-', 'webpack-', 'babel-', '@vue/', '@react/', 'rollup-', 'vite-']
  const types = ['plugin', 'config', 'preset', 'loader', 'parser', 'core']
  const suffixes = ['-js', '-ts', '-jsx', '-vue', '-svelte', '-react', '']

  for (let i = 0; i < count; i++) {
    const prefix = prefixes[i % prefixes.length]
    const type = types[Math.floor(i / prefixes.length) % types.length]
    const suffix = suffixes[i % suffixes.length]
    inputs.push(`${prefix}${type}${suffix}-${i}`)
  }

  return inputs
}

const BENCHMARK_INPUTS = generateInputs(10000)

describe('Pattern Matcher Benchmark', () => {
  describe('Simple Pattern Matching', () => {
    const wasmSimpleMatcher = createWorkspacePatternWASM(['eslint-*'])

    bench('WASM Implementation', () => {
      for (const input of BENCHMARK_INPUTS) {
        wasmSimpleMatcher.match(input)
      }
    })

    afterAll(() => {
      wasmSimpleMatcher.dispose()
    })
  })

  describe('Complex Pattern Matching', () => {
    const complexPattern = ['eslint-*', '!eslint-plugin-*', 'eslint-plugin-react', '*loader']
    const wasmComplexMatcher = createWorkspacePatternWASM(complexPattern)

    bench('WASM Implementation', () => {
      for (const input of BENCHMARK_INPUTS) {
        wasmComplexMatcher.match(input)
      }
    })

    afterAll(() => {
      wasmComplexMatcher.dispose()
    })
  })

  describe('Multiple Matchers Concurrency', () => {
    bench('WASM Implementation', () => {
      const matchers = PATTERN_MATCH_MATRIX.map((fixture) => createWorkspacePatternWASM(fixture.matchRule))

      for (const matcher of matchers) {
        for (const input of BENCHMARK_INPUTS) {
          matcher.match(input)
        }
      }

      for (const matcher of matchers) {
        matcher.dispose()
      }
    })
  })
})
