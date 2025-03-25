/* eslint-disable @typescript-eslint/no-unused-vars */
// Pattern for workspace syntax
// **
// * means wildcards
// ! means ignore

type State = 'START' | 'NORMAL' | 'SCOPE' | 'DOUBLE_STAR' | 'MATCH' | 'NO_MATCH'

export function createWorkspacePattern(patterns: string[]) {
  if (!patterns.length) {
    return (_: string) => false
  }

  const compiled = patterns.map((p) => ({
    pattern: p.replace(/^!/, ''),
    isNegative: p.startsWith('!')
  }))

  return (input: string): boolean => {
    return compiled.every((p) => p.isNegative !== matchWithState(input, p.pattern))
  }
}

function matchWithState(input: string, pattern: string): boolean {
  let state: State = 'START'
  let inputIdx = 0
  let patternIdx = 0
  let backtrackInput = -1
  let backtrackPattern = -1

  if (pattern === '*') {
    return true
  }

  while (inputIdx < input.length) {
    const inputChar = input[inputIdx]
    const patternChar = pattern[patternIdx]
    console.log(inputChar, patternChar, state)
    switch (state) {
      case 'START': {
        if (inputChar === '@' && patternChar === '@') {
          state = 'SCOPE'
          inputIdx++
          patternIdx++
        } else if (patternChar === '*' && pattern[patternIdx + 1] === '*') {
          state = 'DOUBLE_STAR'
          backtrackInput = inputIdx
          backtrackPattern = patternIdx + 2
          patternIdx += 2
        } else if (patternChar === '*') {
          if (inputChar === '@') {
            return false
          }
          state = 'NORMAL'
          inputIdx++
          patternIdx++
        } else if (inputChar === patternChar) {
          state = 'NORMAL'
          inputIdx++
          patternIdx++
        } else {
          return false
        }
        break
      }

      case 'SCOPE': {
        console.log('wa?')
        if (inputChar === '/' && patternChar === '/') {
          state = 'NORMAL'
          inputIdx++
          patternIdx++
        } else if (patternChar === '*') {
          if (inputChar === '/') {
            state = 'NORMAL'
            patternIdx++
          } else {
            inputIdx++
          }
        } else if (inputChar === patternChar) {
          inputIdx++
          patternIdx++
        } else {
          return false
        }
        break
      }

      case 'NORMAL': {
        if (patternIdx >= pattern.length) {
          return false
        }
        if (patternChar === '*' && pattern[patternIdx + 1] === '*') {
          backtrackInput = inputIdx
          backtrackPattern = patternIdx + 2
          patternIdx += 2
          state = 'DOUBLE_STAR'
        } else if (patternChar === '*') {
          inputIdx++
          patternIdx++
        } else if (inputChar === patternChar) {
          inputIdx++
          patternIdx++
        } else {
          if (backtrackInput >= 0) {
            inputIdx = ++backtrackInput
            patternIdx = backtrackPattern
            state = 'DOUBLE_STAR'
          } else {
            return false
          }
        }
        break
      }

      case 'DOUBLE_STAR': {
        if (patternIdx >= pattern.length) {
          return true
        }
        if (inputChar === pattern[patternIdx]) {
          state = 'NORMAL'
        } else {
          inputIdx++
        }
        break
      }
    }
  }

  while (
    patternIdx < pattern.length &&
    pattern[patternIdx] === '*' &&
    pattern[patternIdx + 1] === '*'
  ) {
    patternIdx += 2
  }

  return patternIdx >= pattern.length && inputIdx >= input.length
}
