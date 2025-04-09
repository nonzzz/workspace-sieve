import path from 'path'
import { globSync } from 'tinyglobby'
import type { GlobOptions } from 'tinyglobby'
import type { Package, ProjectManifest, SupportedArchitectures } from './interface'
import { createWorkspacePatternWASM } from './pattern'
import { checkIsInstallable } from './platform'
import { readJsonFile, unique } from './shared'
export interface FindWorkspacePackagesOpts {
  patterns?: string[]
  supportedArchitectures?: SupportedArchitectures
  verbose?: 'info' | 'error' | 'silent'
}

export const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/bower_components/**',
  '**/test/**',
  '**/tests/**'
]

export type PackagesMetadata = Awaited<ReturnType<typeof findWorkspacePackages>>['packagesMetadata']

export async function findWorkspacePackages(wd: string, options?: FindWorkspacePackagesOpts) {
  const globalOpts: GlobOptions = { ...options, cwd: wd, expandDirectories: false }
  if (!globalOpts.ignore) {
    globalOpts.ignore = DEFAULT_IGNORE
  }
  const patterns = serializePattern(options?.patterns || ['.', '**'])
  if ('patterns' in globalOpts) {
    delete globalOpts.patterns
  }
  const paths = globSync(patterns, globalOpts)
  const serializedManifestPaths = unique(paths.map((p) => path.join(wd, p)).sort((a, b) => a > b ? 1 : a < b ? -1 : 0))
  const packagesMetadata = await Promise.all(serializedManifestPaths.map(readPackgeMetadata))
  const supportedArchitectures = Object.assign({
    os: ['current'],
    cpu: ['current'],
    libc: ['current']
  }, options?.supportedArchitectures)
  const errorMsgs: Error[] = []
  try {
    for (const metadata of packagesMetadata) {
      checkIsInstallable(metadata, supportedArchitectures)
    }
  } catch (e) {
    if (options?.verbose) {
      switch (options.verbose) {
        case 'info': {
          console.error(e)
          break
        }
        case 'error': {
          errorMsgs.push(e as Error)
          break
        }
      }
    }
  }
  return { packagesMetadata, errorMsgs }
}

function serializePattern(inputs: string[]) {
  const patterns = []
  for (const pattern of inputs) {
    patterns.push(pattern.replace(/\/?$/, '/package.json'))
    patterns.push(
      pattern.replace(/\/?$/, '/package.json5')
    )
    patterns.push(
      pattern.replace(/\/?$/, '/package.yaml')
    )
  }
  return patterns
}

// I can't find any description of the package manifest format in the npm or yarn documentation.
// It's a special case for pnpm.
async function readPackgeMetadata(manifestPath: string) {
  const b = path.basename(manifestPath)
  switch (b) {
    case 'package.json': {
      const manifest = await readJsonFile<ProjectManifest>(manifestPath)
      return {
        manifest,
        manifestPath,
        dirPath: path.dirname(manifestPath)
      }
    }
    default:
      throw new Error(`Unsupported package manifest: ${b}`)
  }
}

export interface FilterWorkspacePackagesOutput {
  selected: string[]
  unmatchedFilters: string[]
}

// TODO: handle workspace: * and etc...
function createWorkspacePackageGraphics(metadata: PackagesMetadata) {
  const graphics = metadata.reduce((acc, cur) => (acc[cur.dirPath] = cur, acc), {} as Record<string, Package>)
  return graphics
}

export interface FilterOptions extends FindWorkspacePackagesOpts {
  filter?: string[]
  experimental?: { debug: boolean }
}

export interface FilterWorkspaceResult {
  unmatchedFilters: string[]
  matchedProjects: string[]
  matchedGraphics: Record<string, Package>
}

export interface FilterWorkspacePackagesFromDirectoryResult extends FilterWorkspaceResult {
  allProjects: PackagesMetadata
}

export async function filterWorkspacePackagesFromDirectory(
  workspaceRoot: string,
  options?: FilterOptions
): Promise<FilterWorkspacePackagesFromDirectoryResult> {
  const { packagesMetadata: allProjects } = await findWorkspacePackages(workspaceRoot, { ...options, verbose: 'error' })

  const graphics = createWorkspacePackageGraphics(allProjects)

  return {
    allProjects,
    ...filterWorkspacePackagesByGraphics(graphics, options?.filter || [], { experimental: options?.experimental })
  }
}

export interface FilterWorkspacePackagesByGraphicsOptions {
  experimental?: { debug: boolean }
}

export function filterWorkspacePackagesByGraphics(
  packageGraph: Record<string, Package>,
  patterns: string[],
  options?: FilterWorkspacePackagesByGraphicsOptions
): FilterWorkspaceResult {
  if (!patterns.length) {
    return {
      unmatchedFilters: [],
      matchedProjects: [],
      matchedGraphics: {}
    }
  }

  const packageIds = Object.keys(packageGraph)
  const unmatchedFilters = new Set<string>()
  const matchedProjects = new Set<string>()
  const matchedPaths = new Set<string>()
  const matchedGraphics: Record<string, Package> = {}

  const combinedMatcher = createWorkspacePatternWASM(patterns, options?.experimental?.debug || false)

  for (const id of packageIds) {
    const pkg = packageGraph[id]
    const pkgName = pkg.manifest.name
    const dirName = path.basename(pkg.dirPath)
    if (matchedPaths.has(pkg.dirPath)) {
      continue
    }
    if (pkgName && combinedMatcher.match(pkgName)) {
      matchedProjects.add(pkgName)
      matchedGraphics[dirName] = pkg
      matchedPaths.add(pkg.dirPath)
    }
    if (combinedMatcher.match(dirName)) {
      matchedProjects.add(pkgName || dirName)
      matchedGraphics[dirName] = pkg
      matchedPaths.add(pkg.dirPath)
    }
  }
  combinedMatcher.dispose()

  for (const pattern of patterns) {
    const singleMatcher = createWorkspacePatternWASM([pattern], options?.experimental?.debug || false)
    const hasMatch = packageIds.some((id) => {
      const pkg = packageGraph[id]
      const pkgName = pkg.manifest.name
      const dirName = path.basename(pkg.dirPath)
      return (pkgName && singleMatcher.match(pkgName)) || singleMatcher.match(dirName)
    })
    if (!hasMatch) {
      unmatchedFilters.add(pattern)
    }
    singleMatcher.dispose()
  }

  return {
    unmatchedFilters: Array.from(unmatchedFilters),
    matchedProjects: Array.from(matchedProjects),
    matchedGraphics
  }
}

export { searchForPackageRoot, searchForWorkspaceRoot } from './find-workspace'
export { createWorkspacePatternWASM } from './pattern'

export * from './interface'
