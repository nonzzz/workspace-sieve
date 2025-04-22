import { createWorkspacePatternWASM } from '../dist/index.mjs'

const p = createWorkspacePatternWASM(['a-b-c'], true)

const x = 'aabbcc'.repeat(1000000)

console.log(`${(x.length / 1024 / 1024).toFixed(4)} MB`)

console.log(p.match(x)) // false
