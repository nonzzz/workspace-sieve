import type { Package, PackageGraph, SupportedArchitectures } from './interface'

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

export interface WorkspaceFilter {
  filter: string
  followProdDepsOnly: boolean
}

export interface FilterPackagesResult<P extends Package> {
  allProjectsGraph: PackageGraph<P>
  selectedProjectsGraph: PackageGraph<P>
  unmatchedFilters: string[]
}

// export function filterPackages<P extends Package>(pkgs: P[], filter: WorkspaceFilter, options?: FilterPackagesOptions) {}

function loadWASM() {
  if (wasm) {
    return
  }
  const bytes = Uint8Array.from(atob(lexSelector), (x) => x.charCodeAt(0))
  const compiled = new WebAssembly.Module(bytes)
  wasm = new WebAssembly.Instance(compiled).exports as typeof wasm
}

export interface ParsePackageSelector {
  input: string
  prefix: string
}

export function parsePackageSelector(options: ParsePackageSelector) {
  if (!wasm) {
    loadWASM()
  }
  const memoryView = new Uint8Array(wasm.memory.buffer)
  const { written } = TextEncode.encodeInto(JSON.stringify(options), memoryView)
  const output = wasm.parse_pkg_selector(0, written)
  return new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, 0, output))
}

export interface FilterPackageFromDirOptions extends FilterPackagesOptions {
  engineStrict?: boolean
  nodeVersion?: string
  patterns?: string[]
  supportedArchitectures?: SupportedArchitectures
}

export function filterPackagesFromDir(workspaceDir: string, filter: WorkspaceFilter[], options: FilterPackageFromDirOptions) {
  //
}
