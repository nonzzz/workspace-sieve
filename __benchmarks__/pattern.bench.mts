import { createMatcher } from '@pnpm/matcher'
import { bench, describe } from 'vitest'
import { createWASMWorkspacePattern, createWorkspacePattern as createJSWorkspacePattern } from '../dist/index.mjs'
import { WorkspacePatternsMethods } from '../src/pattern'

function createPnpmWorkspacePattern(patterns: string[]): WorkspacePatternsMethods {
  const matcher = createMatcher(patterns)
  return {
    match: (input: string) => matcher(input),
    destroy: () => {/* @pnpm/matcher no need this */}
  }
}

function generateLargeInputs(): string[] {
  const prefixes = ['@types', '@babel', '@vue', '@nuxt', '@rollup', '@vite', '@testing-library']
  const suffixes = ['plugin', 'loader', 'config', 'preset', 'utils', 'core', 'cli', 'dev']
  const names = ['react', 'vue', 'angular', 'svelte', 'webpack', 'vite', 'rollup', 'esbuild']

  const inputs: string[] = []

  for (const prefix of prefixes) {
    for (const name of names) {
      inputs.push(`${prefix}/${name}`)
      inputs.push(`${prefix}/${name}-${suffixes[Math.floor(Math.random() * suffixes.length)]}`)
    }
  }

  for (const name of names) {
    for (const suffix of suffixes) {
      inputs.push(`${name}-${suffix}`)
      inputs.push(`eslint-${name}-${suffix}`)
      inputs.push(`babel-${name}-${suffix}`)
    }
  }

  for (let i = 0; i < 100; i++) {
    inputs.push(`random-package-${i}`)
    inputs.push(`test-${i}`)
    inputs.push(`@scope/package-${i}`)
  }

  return inputs
}

const scenarios = {
  simple: {
    patterns: ['react', 'vue', 'angular'],
    inputs: [
      'react',
      'vue-router',
      'angular-core',
      'lodash',
      'webpack',
      'typescript',
      'babel',
      'eslint',
      'prettier',
      'jest'
    ]
  },

  medium: {
    patterns: [
      '@types/*',
      '@babel/*',
      'eslint-*',
      '!eslint-config-*',
      '*-plugin',
      'webpack-*'
    ],
    inputs: [
      '@types/node',
      '@types/react',
      '@babel/core',
      '@babel/preset-env',
      'eslint-plugin-react',
      'eslint-config-airbnb',
      'webpack-plugin',
      'rollup-plugin',
      'vite-plugin-react',
      'webpack-dev-server',
      'webpack-cli',
      'random-package'
    ]
  },

  complex: {
    patterns: [
      '@types/*',
      '@babel/*',
      'eslint-*',
      '!eslint-config-*',
      '*-plugin',
      '*-loader',
      'test-*',
      '!test-utils',
      '@scope/package-*',
      'webpack-*',
      'rollup-*',
      '@rollup/*',
      'vite-*',
      '@vite/*'
    ],
    inputs: [
      '@types/node',
      '@types/react',
      '@babel/core',
      '@babel/preset-env',
      'eslint-plugin-react',
      'eslint-config-airbnb',
      'webpack-plugin',
      'rollup-plugin',
      'test-runner',
      'test-utils',
      '@scope/package-utils',
      '@scope/other-package',
      'webpack-dev-server',
      'rollup-plugin-typescript',
      '@rollup/plugin-json',
      'vite-plugin-vue',
      '@vite/plugin-react',
      'random-package',
      'another-lib'
    ]
  },

  largescale: {
    patterns: [
      '@types/*',
      '@babel/*',
      'eslint-*',
      '!eslint-config-*',
      '*-plugin',
      '*-loader',
      'webpack-*',
      'rollup-*',
      '@rollup/*',
      'vite-*',
      '@vite/*',
      'postcss-*',
      'tailwind*',
      'react-*',
      'vue-*',
      '@vue/*',
      'next-*',
      'nuxt-*',
      '@nuxt/*',
      'test-*',
      'jest-*',
      'vitest-*',
      '@testing-library/*',
      'cypress-*',
      'playwright-*'
    ],
    inputs: generateLargeInputs()
  }
}

describe('Pattern Matching Performance', () => {
  describe('Simple Patterns', () => {
    const { patterns, inputs } = scenarios.simple

    bench('WASM - Simple patterns', () => {
      const matcher = createWASMWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('JS - Simple patterns', () => {
      const matcher = createJSWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('PNPM - Simple patterns', () => {
      const matcher = createPnpmWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })
  })

  describe('Medium Complexity Patterns', () => {
    const { patterns, inputs } = scenarios.medium

    bench('WASM - Medium patterns', () => {
      const matcher = createWASMWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('JS - Medium patterns', () => {
      const matcher = createJSWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('PNPM - Medium patterns', () => {
      const matcher = createPnpmWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })
  })

  describe('Complex Patterns', () => {
    const { patterns, inputs } = scenarios.complex

    bench('WASM - Complex patterns', () => {
      const matcher = createWASMWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('JS - Complex patterns', () => {
      const matcher = createJSWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('PNPM - Complex patterns', () => {
      const matcher = createPnpmWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })
  })

  describe('Large Scale Patterns', () => {
    const { patterns, inputs } = scenarios.largescale

    bench('WASM - Large scale', () => {
      const matcher = createWASMWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('JS - Large scale', () => {
      const matcher = createJSWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('PNPM - Large scale', () => {
      const matcher = createPnpmWorkspacePattern(patterns)
      for (const input of inputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })
  })

  describe('Matcher Creation Overhead', () => {
    bench('WASM - Create and destroy matcher (simple)', () => {
      const matcher = createWASMWorkspacePattern(scenarios.simple.patterns)
      matcher.destroy()
    })

    bench('JS - Create and destroy matcher (simple)', () => {
      const matcher = createJSWorkspacePattern(scenarios.simple.patterns)
      matcher.destroy()
    })

    bench('PNPM - Create and destroy matcher (simple)', () => {
      const matcher = createPnpmWorkspacePattern(scenarios.simple.patterns)
      matcher.destroy()
    })
  })

  describe('Matcher Creation Overhead (Complex)', () => {
    bench('WASM - Create and destroy matcher (complex)', () => {
      const matcher = createWASMWorkspacePattern(scenarios.complex.patterns)
      matcher.destroy()
    })

    bench('JS - Create and destroy matcher (complex)', () => {
      const matcher = createJSWorkspacePattern(scenarios.complex.patterns)
      matcher.destroy()
    })

    bench('PNPM - Create and destroy matcher (complex)', () => {
      const matcher = createPnpmWorkspacePattern(scenarios.complex.patterns)
      matcher.destroy()
    })
  })

  describe('Single Match Performance', () => {
    bench('WASM - Single match (reused matcher)', () => {
      const matcher = createWASMWorkspacePattern(scenarios.complex.patterns)
      matcher.match('@types/react')
      matcher.destroy()
    })

    bench('JS - Single match (reused matcher)', () => {
      const matcher = createJSWorkspacePattern(scenarios.complex.patterns)
      matcher.match('@types/react')
      matcher.destroy()
    })

    bench('PNPM - Single match (reused matcher)', () => {
      const matcher = createPnpmWorkspacePattern(scenarios.complex.patterns)
      matcher.match('@types/react')
      matcher.destroy()
    })
  })

  describe('Edge Cases', () => {
    const edgePatterns = ['*', '!*', '**/*', '@*/*', '*-*-*', '!@types/*']
    const edgeInputs = [
      '',
      'a',
      '@',
      '@/',
      '@types/',
      '@types/node',
      'very-long-package-name-with-many-segments',
      'package-with-numbers-123',
      'UPPERCASE-PACKAGE',
      'package.with.dots'
    ]

    bench('WASM - Edge cases', () => {
      const matcher = createWASMWorkspacePattern(edgePatterns)
      for (const input of edgeInputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('JS - Edge cases', () => {
      const matcher = createJSWorkspacePattern(edgePatterns)
      for (const input of edgeInputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })

    bench('PNPM - Edge cases', () => {
      const matcher = createPnpmWorkspacePattern(edgePatterns)
      for (const input of edgeInputs) {
        matcher.match(input)
      }
      matcher.destroy()
    })
  })

  describe('Performance Comparison Tests', () => {
    const comparisonPatterns = ['@types/*', '!@types/node', '*-plugin', 'eslint-*']
    const comparisonInputs = [
      '@types/react',
      '@types/node',
      'webpack-plugin',
      'eslint-config-airbnb',
      'random-package'
    ]

    bench('WASM - Performance comparison', () => {
      const matcher = createWASMWorkspacePattern(comparisonPatterns)
      for (let i = 0; i < 1000; i++) {
        for (const input of comparisonInputs) {
          matcher.match(input)
        }
      }
      matcher.destroy()
    })

    bench('JS - Performance comparison', () => {
      const matcher = createJSWorkspacePattern(comparisonPatterns)
      for (let i = 0; i < 1000; i++) {
        for (const input of comparisonInputs) {
          matcher.match(input)
        }
      }
      matcher.destroy()
    })

    bench('PNPM - Performance comparison', () => {
      const matcher = createPnpmWorkspacePattern(comparisonPatterns)
      for (let i = 0; i < 1000; i++) {
        for (const input of comparisonInputs) {
          matcher.match(input)
        }
      }
      matcher.destroy()
    })
  })
})

describe.skip('Memory Usage Analysis', () => {
  bench('WASM - Memory stress test', () => {
    const matchers: WorkspacePatternsMethods[] = []
    for (let i = 0; i < 100; i++) {
      matchers.push(createWASMWorkspacePattern(scenarios.complex.patterns))
    }

    for (const matcher of matchers) {
      for (const input of scenarios.complex.inputs) {
        matcher.match(input)
      }
    }

    for (const matcher of matchers) {
      matcher.destroy()
    }
  })

  bench('JS - Memory stress test', () => {
    const matchers = []
    for (let i = 0; i < 100; i++) {
      matchers.push(createJSWorkspacePattern(scenarios.complex.patterns))
    }

    for (const matcher of matchers) {
      for (const input of scenarios.complex.inputs) {
        matcher.match(input)
      }
    }

    for (const matcher of matchers) {
      matcher.destroy()
    }
  })

  bench('PNPM - Memory stress test', () => {
    const matchers = []
    for (let i = 0; i < 100; i++) {
      matchers.push(createPnpmWorkspacePattern(scenarios.complex.patterns))
    }

    for (const matcher of matchers) {
      for (const input of scenarios.complex.inputs) {
        matcher.match(input)
      }
    }

    for (const matcher of matchers) {
      matcher.destroy()
    }
  })
})
