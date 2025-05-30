import { bench, describe } from 'vitest'
import { createWorkspacePattern } from '../src/js-pattern'

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

const BENCHMARK_INPUTS = generateInputs(1000)

describe('Pattern Matcher Benchmark', () => {
  describe('Simple Pattern Matching', () => {
    const simpleMatcher = createWorkspacePattern(['eslint-*'])

    bench('JS Implementation', () => {
      for (const input of BENCHMARK_INPUTS) {
        simpleMatcher(input)
      }
    })
  })

  describe('Complex Pattern Matching', () => {
    const complexPattern = ['eslint-*', '!eslint-plugin-*', 'eslint-plugin-react', '*loader']
    const complexMatcher = createWorkspacePattern(complexPattern)

    bench('JS Implementation', () => {
      for (const input of BENCHMARK_INPUTS) {
        complexMatcher(input)
      }
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
  })
})
