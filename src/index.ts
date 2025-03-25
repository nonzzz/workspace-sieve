// For yarn and pnpm
// Just a minimal subset implementation. More complex selectors will be add in the future.
import path from 'path'
import { globSync } from 'tinyglobby'
import type { GlobOptions } from 'tinyglobby'
import type { Package, PackageGraph, ProjectManifest, SupportedArchitectures } from './interface'
import { checkIsInstallable } from './platform'
import { readJsonFile, unique } from './shared'
export interface FindWorkspacePackagesOpts {
  patterns?: string[]
  // engineStrict?: boolean
  // packageManagerStrict?: boolean
  // packageManagerStrictVersion?: boolean
  // nodeVersion?: string
  // sharedWorkspaceLockfile?: boolean
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

// export async function filterWorkspacePackages<P extends Package>(
//   workspaceRoot: string,
//   packageGraph: PackageGraph<P>,
//   packageSelectors: PackageSelector[]
// ): Promise<FilterWorkspacePackagesOutput> {
//   //
//   const [excludeSelectors, includeSelectors] = packageSelectors.reduce((acc, cur) => {
//     if (cur.exclude) {
//       acc[0].push(cur)
//     } else {
//       acc[1].push(cur)
//     }
//     return acc
//   }, [[], []] as [PackageSelector[], PackageSelector[]])
//   // const r = filterGraph.bind(null, packageGraph, { workspaceDir: workspaceRoot })
//   const include = includeSelectors.length === 0
//     ? { selected: Object.keys(packageGraph), unmatchedFilters: [] }
//     : await filterGraph(packageGraph, { workspaceDir: workspaceRoot }, includeSelectors)
//   const exclude = await filterGraph(packageGraph, { workspaceDir: workspaceRoot }, excludeSelectors)
//   console.log(include, exclude)
// }

// interface FilterGraphOptions {
//   workspaceDir: string
//   testPattern?: string[]
//   changedFilesIgnorePattern?: string[]
//   useGlobDirFiltering?: boolean
// }

export function filterWorkspacePackagesByGraphics() {
}

function createWorkspacePackageGraphics(metadata: PackagesMetadata) {
  //
}

export interface FilterOptions extends FindWorkspacePackagesOpts {
  filter?: string[]
}

export interface FilterWorkspaceResult {
  unmatchedFilters: string[]
  matchedProjects: string[]
  matchedGraphics: PackageGraph<Package>
}

export interface FilterWorkspacePackagesFromDirectoryResult extends FilterWorkspaceResult {
  allProjects: PackagesMetadata
}

export async function filterWorkspacePacakgesFromDirectory(
  workspaceRoot: string,
  options?: FilterOptions
): Promise<FilterWorkspacePackagesFromDirectoryResult> {
  const { packagesMetadata: allProjects } = await findWorkspacePackages(workspaceRoot, { ...options, verbose: 'error' })

  // const graphics = createWorkspacePackageGraphics(allProjects)
  return {
    allProjects,
    unmatchedFilters: [],
    matchedProjects: [],
    matchedGraphics: {}
  }
}

// async function filterGraph<P extends Package>(pkgGraph: PackageGraph<P>, opts: FilterGraphOptions, packageSelectors: PackageSelector[]) {
//   const unmatchedFilters: string[] = []
//   for (const selector of packageSelectors) {
//     let entryPackages: ProjectRootDir[] | null = null
//     if (selector.diff) {
//       //
//     } else if (selector.parentDir) {
//       //
//     }
//     if (selector.namePattern) {
//       //
//     }

//     if (selector.namePattern) {
//       if (entryPackages === null) {
//         entryPackages = matchPackages(pkgGraph, selector.namePattern)
//         console.log(entryPackages)
//       } else {
//         console.log('wata?')
//         // entryPackages = matchPackages(pkgGraph, selector.namePattern).filter((id) => entryPackages!.includes(id))
//       }
//     }

//     if (entryPackages == null) {
//       throw new Error(`Unsupported package selector: ${JSON.stringify(selector)}`)
//     }

//     if (Array.isArray(entryPackages) && entryPackages.length === 0) {
//       if (selector.namePattern) {
//         unmatchedFilters.push(selector.namePattern)
//       }
//     }
//   }
//   return {
//     unmatchedFilters
//   }
// }

// function matchPackages<P extends Package>(graph: PackageGraph<P>, pattern: string): ProjectRootDir[] {
//   const matcher = createWorkspacePattern([pattern])
//   const matches = (Object.keys(graph) as ProjectRootDir[]).filter((id) =>
//     graph[id].package.manifest.name && matcher(graph[id].package.manifest.name)
//   )
//   if (matches.length === 0 && !(pattern[0] === '@') && !pattern.includes('/')) {
//     const scopedMatches = matchPackages(graph, `@*/${pattern}`)
//     return scopedMatches.length !== 1 ? [] : scopedMatches
//   }
//   return matches
// }
