import type { Package, PackageGraph, WorkspaceFilter } from './interface'

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
