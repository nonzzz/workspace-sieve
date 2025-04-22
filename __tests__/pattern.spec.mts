import { describe, expect, it } from 'vitest'
import { createWorkspacePattern } from '../dist'

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
    matchRule: ['a*c'],
    expected: [
      { input: 'abc', state: true }
    ]
  },
  {
    matchRule: ['*-positive'],
    expected: [
      { input: 'is-positive', state: true }
    ]
  },
  {
    matchRule: ['foo', 'bar'],
    expected: [
      { input: 'foo', state: true },
      { input: 'bar', state: true }
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
  },
  {
    matchRule: ['eslint-*', '!eslint-plugin-*', 'eslint-plugin-bar'],
    expected: [
      { input: 'eslint-config-foo', state: true },
      { input: 'eslint-plugin-foo', state: false },
      { input: 'eslint-plugin-bar', state: true }
    ]
  }
]

describe('WASM Pattern Matcher', () => {
  it('match matrix', () => {
    for (const fixture of PATTERN_MATCH_MATRIX) {
      const matcher = createWorkspacePattern(fixture.matchRule)
      for (const { input, state } of fixture.expected) {
        expect(matcher.match(input), `${input} -- ${JSON.stringify(fixture.matchRule)}`).toBe(state)
      }
    }
  })
})
