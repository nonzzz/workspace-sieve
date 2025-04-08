import { bench, describe } from 'vitest'
import { createWorkspacePattern, createWorkspacePatternWASM } from '../dist'

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
    const jsSimpleMatcher = createWorkspacePattern(['eslint-*'])
    const wasmSimpleMatcher = createWorkspacePatternWASM(['eslint-*'])

    bench('JS Implementation', () => {
      for (const input of BENCHMARK_INPUTS) {
        jsSimpleMatcher(input)
      }
    })

    bench('WASM Implementation', () => {
      for (const input of BENCHMARK_INPUTS) {
        wasmSimpleMatcher.match(input)
      }
    })

    bench.todo('Cleanup', () => {
      wasmSimpleMatcher.dispose()
    })
  })

  describe('Complex Pattern Matching', () => {
    const complexPattern = ['eslint-*', '!eslint-plugin-*', 'eslint-plugin-react', '*loader']
    const jsComplexMatcher = createWorkspacePattern(complexPattern)
    const wasmComplexMatcher = createWorkspacePatternWASM(complexPattern)

    bench('JS Implementation', () => {
      for (const input of BENCHMARK_INPUTS) {
        jsComplexMatcher(input)
      }
    })

    bench('WASM Implementation', () => {
      for (const input of BENCHMARK_INPUTS) {
        wasmComplexMatcher.match(input)
      }
    })

    bench.todo('Cleanup', () => {
      wasmComplexMatcher.dispose()
    })
  })

  describe('Multiple Matchers Concurrency', () => {
    bench('JS Implementation', () => {
      const matchers = PATTERN_MATCH_MATRIX.map((fixture) => createWorkspacePattern(fixture.matchRule))

      for (const matcher of matchers) {
        for (const input of BENCHMARK_INPUTS) {
          matcher(input)
        }
      }
    })

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
