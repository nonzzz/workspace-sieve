import { createWorkspacePatternWASM } from '../dist/index.mjs'

const p = createWorkspacePatternWASM(['aaa/b-*'], true)

console.log(p.match('aaa/b-1')) // true
console.log(p.match('aaa/cb-2')) // false

const pp = createWorkspacePattern(['aaa/b-*', 'aaa/cb-*'], false)

console.log(pp.match('aaa/b-1')) // true
