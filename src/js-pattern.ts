type MatcherWithIndex = (input: string) => number
type Matcher = (input: string) => boolean

export function createWorkspacePattern(patterns: string[]): Matcher {
  const matcher = createMatcherWithIndex(patterns)
  return (input) => matcher(input) !== -1
}

function createMatcherWithIndex(patterns: string[]): MatcherWithIndex {
  if (patterns.length === 0) { return () => -1 }
  if (patterns.length === 1) { return createSingleMatcher(patterns[0]) }

  const states = patterns.map((pattern) => ({
    pattern,
    isNegative: pattern.startsWith('!'),
    segments: pattern.startsWith('!') ? pattern.slice(1).split('*') : pattern.split('*')
  }))

  return (input: string) => {
    let matchedIndex = -1

    for (let i = 0; i < states.length; i++) {
      const state = states[i]
      const isMatch = matchSegments(input, state.segments)

      if (state.isNegative) {
        if (isMatch) { matchedIndex = -1 }
      } else if (matchedIndex === -1 && isMatch) {
        matchedIndex = i
      }
    }

    return matchedIndex
  }
}

function createSingleMatcher(pattern: string): MatcherWithIndex {
  if (pattern === '*') { return () => 0 }

  const isNegative = pattern.startsWith('!')
  const segments = (isNegative ? pattern.slice(1) : pattern).split('*')

  return (input: string) => {
    const matches = matchSegments(input, segments)
    if (isNegative) { return matches ? -1 : 0 }
    return matches ? 0 : -1
  }
}

function matchSegments(input: string, segments: string[]): boolean {
  if (segments.length === 1) { return input === segments[0] }

  let currentPos = 0

  if (segments[0] !== '') {
    if (!input.startsWith(segments[0])) { return false }
    currentPos = segments[0].length
  }

  for (let i = 1; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (segment === '') { continue }

    const idx = input.indexOf(segment, currentPos)
    if (idx === -1) { return false }
    currentPos = idx + segment.length
  }

  const lastSegment = segments[segments.length - 1]
  return lastSegment === '' || input.endsWith(lastSegment)
}
