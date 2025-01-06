import type { Package, PackageGraph, WorkspaceFilter } from './interface'

declare const lexSelector: string

let wasm: typeof import('./lex-selector.wasm')

const TextEncode = new TextEncoder()

export interface FilterPackagesOptions {
  linkWorkspacePackages?: boolean
  prefix: string
  workspaceDir: string
  testPattern?: string[]
  changedFilesIgnorePattern?: string[]
  useGlobDirFiltering?: boolean
  sharedWorkspaceLockfile?: boolean
}

export interface FilterPackagesResult<P extends Package> {
  allProjectsGraph: PackageGraph<P>
  selectedProjectsGraph: PackageGraph<P>
  unmatchedFilters: string[]
}

export function filterPackages<P extends Package>(pkgs: P[], filter: WorkspaceFilter, options?: FilterPackagesOptions) {}

function loadWASM() {
  if (wasm) {
    return
  }
  const bytes = Uint8Array.from(atob(lexSelector), (x) => x.charCodeAt(0))
  const compiled = new WebAssembly.Module(bytes)
  wasm = new WebAssembly.Instance(compiled).exports as typeof wasm
}

export function parsePacakgeSelector(options: any) {
  if (!wasm) {
    loadWASM()
  }
  const memoryView = new Uint8Array(wasm.memory.buffer)
  const { written } = TextEncode.encodeInto(JSON.stringify(options), memoryView)
  const output = wasm.parse_pkg_selector(0, written)
  return new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, 0, output))
}
