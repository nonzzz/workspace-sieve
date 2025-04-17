import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import fs from 'fs'
import { builtinModules } from 'module'
import path from 'path'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'
import { swc } from 'rollup-plugin-swc3'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default defineConfig([
  {
    input: 'src/index.ts',
    output: [
      { dir: 'dist', format: 'esm', exports: 'named', entryFileNames: '[name].mjs' },
      { dir: 'dist', format: 'cjs', exports: 'named', entryFileNames: '[name].js' }
    ],
    external: [...builtinModules, 'tinyglobby', 'ansis'],
    plugins: [
      replace({
        b64: JSON.stringify(fs.readFileSync(path.join(__dirname, 'zig-out', 'zig-lib.wasm'), 'base64'))
      }),
      nodeResolve(),
      swc()
    ]
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()]
  }
])
