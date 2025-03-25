import { describe, expect, it } from 'vitest'
import { createWorkspacePattern } from '../src/pattern'

interface PatternMatchMatrix {
  matchRule: string[]
  expected: Array<{ input: string, state: boolean }>
}

const PATTERN_MATCH_MATRIX: PatternMatchMatrix[] = [
  //   {
  //     matchRule: ['*'],
  //     expected: [
  //       { input: '@eslint/plugin-foo', state: true },
  //       { input: 'express', state: true }
  //     ]
  //   },
  {
    matchRule: ['*plugin*'],
    expected: [
      { input: '@eslint/plugin-foo', state: false }
      //   { input: 'express', state: false }
    ]
  }
]

describe('Workspace Pattern Matcher', () => {
  it('match matrix', () => {
    for (const fixture of PATTERN_MATCH_MATRIX) {
      const matcher = createWorkspacePattern(fixture.matchRule)
      for (const { input, state } of fixture.expected) {
        expect(matcher(input)).toBe(state)
      }
    }
  })
})
