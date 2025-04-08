import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    watch: false,
    testTimeout: 36000,
    coverage: {
      include: [
        '__tests__/**/*.{test,spec}.ts'
      ],
      exclude: [
        '**/node_modules/**',
        '**/examples/**',
        '**/dist/**'
      ]
    },
    benchmark: {
      outputJson: './bench-results.json',
      include: ['**/__benchmarks__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
    },
    environment: 'node'
  }
})
