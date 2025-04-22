import { createWorkspacePatternWASM } from '../dist/index.mjs'

const x = 'aabbcc'.repeat(10000)
// 00

console.log(`${(x.length / 1024 / 1024).toFixed(4)} MB`)

const p = createWorkspacePatternWASM([x], true)

// console.log(p.match(x)) // false

console.log(p.match('a'))
