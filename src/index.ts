import path from 'path'
import { globSync } from 'tinyglobby'
import type { GlobOptions } from 'tinyglobby'
import type { Package, ProjectManifest, SupportedArchitectures } from './interface'
import { createWorkspacePattern } from './pattern'
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
    ...filterWorkspacePackagesByGraphics(workspaceRoot, graphics, options?.filter || [])
  }
}

export function filterWorkspacePackagesByGraphics(
  workspaceRoot: string,
  packageGraph: Record<string, Package>,
  patterns: string[]
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
  const matchedGraphics: Record<string, Package> = {}

  const combinedMatcher = createWorkspacePattern(patterns)

  for (const id of packageIds) {
    const pkgName = packageGraph[id].manifest.name || path.basename(id)
    if (combinedMatcher(pkgName)) {
      matchedProjects.add(pkgName)
      matchedGraphics[pkgName] = packageGraph[id]
    }
  }

  for (const pattern of patterns) {
    const singleMatcher = createWorkspacePattern([pattern])
    const hasMatch = packageIds.some((id) => {
      const pkgName = packageGraph[id].manifest.name || path.basename(id)
      return singleMatcher(pkgName)
    })
    if (!hasMatch) {
      unmatchedFilters.add(pattern)
    }
  }

  return {
    unmatchedFilters: Array.from(unmatchedFilters),
    matchedProjects: Array.from(matchedProjects),
    matchedGraphics
  }
}
