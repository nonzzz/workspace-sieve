import replace from '@rollup/plugin-replace'
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { swc } from 'rollup-plugin-swc3'

const defaultWd = process.cwd()

const wasm = fs.readFileSync(path.join(defaultWd, '/src/lex-selector.wasm')).toString('base64')

export default defineConfig([
  {
    input: 'src/index.ts',
    output: [
      { dir: 'dist', format: 'esm', exports: 'named', entryFileNames: '[name].mjs' },
      { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' }
    ],
    plugins: [replace({ lexSelector: JSON.stringify(wasm) }), swc()]
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()]
  }
])
