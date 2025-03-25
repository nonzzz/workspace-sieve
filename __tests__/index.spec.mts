import path from 'path'
import { describe, expect, it } from 'vitest'
import { filterWorkspacePackages, findWorkspacePackages } from '../src'
import type { Package, PackageGraph, ProjectRootDir } from '../src/interface'

const PKGS_GRAPH: PackageGraph<Package> = {
  ['/packages/project-0' as ProjectRootDir]: {
    dependencies: ['/packages/project-1', '/project-5'] as ProjectRootDir[],
    package: {
      rootDir: '/packages/project-0' as ProjectRootDir,
      manifest: {
        name: 'project-0',
        version: '1.0.0',

        dependencies: {
          'is-positive': '1.0.0',
          'project-1': '1.0.0'
        }
      }
    }
  },
  ['/packages/project-1' as ProjectRootDir]: {
    dependencies: ['/project-2', '/project-4'] as ProjectRootDir[],
    package: {
      rootDir: '/packages/project-1' as ProjectRootDir,
      manifest: {
        name: 'project-1',
        version: '1.0.0',

        dependencies: {
          'is-positive': '1.0.0',
          'project-2': '1.0.0',
          'project-4': '1.0.0'
        }
      }
    }
  },
  ['/project-2' as ProjectRootDir]: {
    dependencies: [] as ProjectRootDir[],
    package: {
      rootDir: '/project-2' as ProjectRootDir,
      manifest: {
        name: 'project-2',
        version: '1.0.0',
        dependencies: {
          'is-negative': '1.0.0'
        }
      }
    }
  },
  ['/project-3' as ProjectRootDir]: {
    dependencies: [] as ProjectRootDir[],
    package: {
      rootDir: '/project-3' as ProjectRootDir,
      manifest: {
        name: 'project-3',
        version: '1.0.0',
        dependencies: {
          minimatch: '*'
        }
      }
    }
  },
  ['/project-4' as ProjectRootDir]: {
    dependencies: [] as ProjectRootDir[],
    package: {
      rootDir: '/project-4' as ProjectRootDir,
      manifest: {
        name: 'project-4',
        version: '1.0.0',
        dependencies: {
          'is-positive': '1.0.0'
        }
      }
    }
  },
  ['/project-5' as ProjectRootDir]: {
    dependencies: [] as ProjectRootDir[],
    package: {
      rootDir: '/project-5' as ProjectRootDir,
      manifest: {
        name: 'project-5',
        version: '1.0.0',

        dependencies: {
          'is-positive': '1.0.0'
        }
      }
    }
  },
  ['/project-5/packages/project-6' as ProjectRootDir]: {
    dependencies: [] as ProjectRootDir[],
    package: {
      rootDir: '/project-5/packages/project-6' as ProjectRootDir,
      manifest: {
        name: 'project-6',
        version: '1.0.0',
        dependencies: {
          'is-positive': '1.0.0'
        }
      }
    }
  }
}

const __dirname = new URL('.', import.meta.url).pathname

describe('Find Workspace Packages', () => {
  // it('select only package dependencies (excluding the package itself)', () => {
  //   const { selectedProjectsGraph } = filterWorkspacePackages(PKGS_GRAPH, [
  //     {
  //       excludeSelf: true,
  //       includeDependencies: true,
  //       namePattern: 'project-1'
  //     }
  //   ], { workspaceDir: process.cwd() })
  // })
  it('basic usage', async () => {
    const manyPkgsPath = path.join(__dirname, 'fixtures/many-pkgs/components')
    const { packagesMetadata } = await findWorkspacePackages(manyPkgsPath)
    expect(packagesMetadata.length).toBe(2)
    expect(packagesMetadata[0].manifest.name).toBe('fold-1')
    expect(packagesMetadata[1].manifest.name).toBe('fold-2')
  })
  it('exclude pattern', async () => {
    const manyPkgsPath = path.join(__dirname, 'fixtures/many-pkgs')
    const { packagesMetadata } = await findWorkspacePackages(manyPkgsPath, {
      patterns: ['**', '!components/**']
    })
    expect(packagesMetadata.length).toBe(3)
    expect(packagesMetadata[1].manifest.name).toBe('xx-1')
    expect(packagesMetadata[2].manifest.name).toBe('xx-2')
  })
  it('finds package by * pattern', async () => {
    const manyPkgsPath = path.join(__dirname, 'fixtures/many-pkgs')
    const { packagesMetadata } = await findWorkspacePackages(manyPkgsPath, {
      patterns: ['.', 'components/*']
    })
    expect(packagesMetadata.length).toBe(3)
    expect(packagesMetadata[0].manifest.name).toBe('fold-1')
    expect(packagesMetadata[1].manifest.name).toBe('fold-2')
  })
})

describe('Filter Workspace Packages', () => {
  it('selct only package dependencies (excluding the package itself)', async () => {
    await filterWorkspacePackages(process.cwd(), PKGS_GRAPH, [{
      excludeSelf: true,
      includeDependencies: true,
      namePattern: 'project-1'
    }])
  })
})
