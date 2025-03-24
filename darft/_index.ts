// Support pnpm and yarn workspace

import type { Package, PackageGraph, PackageSelector, SupportedArchitectures } from './interface'

export interface WorkspaceFilter {
  filter: string
  followProdDepsOnly: boolean
}
export interface FilterPackagesOptions {
  linkWorkspacePackages?: boolean
  prefix: string
  workspaceDir: string
  testPattern?: string[]
  changedFilesIgnorePattern?: string[]
  useGlobDirFiltering?: boolean
  sharedWorkspaceLockfile?: boolean
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

export function filterPackages() {}

export interface FindWorkspacePackagesOpts {
  patterns?: string[]
  engineStrict?: boolean
  packageManagerStrict?: boolean
  packageManagerStrictVersion?: boolean
  nodeVersion?: string
  sharedWorkspaceLockfile?: boolean
  supportedArchitectures?: SupportedArchitectures
}

export function findWorkspacePackages(workspaceRoot: string, opts?: FindWorkspacePackagesOpts) {
  //
}

export function filterWorkspacePackages<P extends Package>(packageGraph: PackageGraph<P>, packageSelectors: PackageSelector[], opts: {
  workspaceDir: string,
  testPattern?: string[],
  changedFilesIgnorePattern?: string[],
  useGlobDirFiltering?: boolean
}) {
}
