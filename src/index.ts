// For yarn and pnpm
// Just a minimal subset implementation. More complex selectors will be add in the future.
import path from 'path'
import { globSync } from 'tinyglobby'
import type { GlobOptions } from 'tinyglobby'
import type { Package, PackageGraph, PackageSelector, ProjectManifest, ProjectRootDir, SupportedArchitectures } from './interface'
import { checkIsInstallable } from './platform'
import { readJsonFile, unique } from './shared'
export interface FindWorkspacePackagesOpts {
  patterns?: string[]
  engineStrict?: boolean
  packageManagerStrict?: boolean
  packageManagerStrictVersion?: boolean
  nodeVersion?: string
  sharedWorkspaceLockfile?: boolean
  supportedArchitectures?: SupportedArchitectures
  verbose?: 'info' | 'error' | 'silent'
}

export const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/bower_components/**',
  '**/test/**',
  '**/tests/**'
]

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

export async function filterWorkspacePackages<P extends Package>(
  workspaceRoot: string,
  packageGraph: PackageGraph<P>,
  packageSelectors: PackageSelector[]
): Promise<FilterWorkspacePackagesOutput> {
  //
  const [excludeSelectors, includeSelectors] = packageSelectors.reduce((acc, cur) => {
    if (cur.exclude) {
      acc[0].push(cur)
    } else {
      acc[1].push(cur)
    }
    return acc
  }, [[], []] as [PackageSelector[], PackageSelector[]])
  // const r = filterGraph.bind(null, packageGraph, { workspaceDir: workspaceRoot })
  const include = includeSelectors.length === 0
    ? { selected: Object.keys(packageGraph), unmatchedFilters: [] }
    : await filterGraph(packageGraph, { workspaceDir: workspaceRoot }, includeSelectors)
  const exclude = await filterGraph(packageGraph, { workspaceDir: workspaceRoot }, excludeSelectors)
}

interface FilterGraphOptions {
  workspaceDir: string
  testPattern?: string[]
  changedFilesIgnorePattern?: string[]
  useGlobDirFiltering?: boolean
}

async function filterGraph<P extends Package>(pkgGraph: PackageGraph<P>, opts: FilterGraphOptions, packageSelectors: PackageSelector[]) {
  const unmatchedFilters: string[] = []
  for (const selector of packageSelectors) {
    let entryPackages: ProjectRootDir[] | null = null
    if (selector.diff) {
      //
    } else if (selector.parentDir) {
      //
    }
    if (selector.namePattern) {
      //
    }

    if (selector.namePattern) {
      if (entryPackages === null) {
        entryPackages = []
      } else {
        entryPackages = []
      }
    }

    if (entryPackages == null) {
      throw new Error(`Unsupported package selector: ${JSON.stringify(selector)}`)
    }

    if (Array.isArray(entryPackages) && entryPackages.length === 0) {
      if (selector.namePattern) {
        unmatchedFilters.push(selector.namePattern)
      }
    }
  }
}
