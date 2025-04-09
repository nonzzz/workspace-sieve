import path from 'path'
import url from 'url'
import { describe, expect, it } from 'vitest'
import { filterWorkspacePackagesByGraphics, filterWorkspacePackagesFromDirectory, findWorkspacePackages } from '../dist'
import type { Package } from '../src/interface'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

describe('Find Workspace Packages', () => {
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

describe('Filter Workspace Packages From Directory', () => {
  it('pattern', async () => {
    const manyPkgsPath = path.join(__dirname, 'fixtures/many-pkgs')
    const { unmatchedFilters, matchedProjects } = await filterWorkspacePackagesFromDirectory(manyPkgsPath, {
      patterns: ['components/*'],
      filter: ['!fold-1', 'fold-3'],
      experimental: { debug: false }
    })
    expect(unmatchedFilters).toStrictEqual(['!fold-1', 'fold-3'])
    expect(matchedProjects.length).toBe(0)
  })
  it('not same name', async () => {
    const manyPkgsPath = path.join(__dirname, 'fixtures/not-same')
    const { unmatchedFilters, matchedProjects } = await filterWorkspacePackagesFromDirectory(manyPkgsPath, {
      filter: ['find-p', '@scope/find~x', 'find.p']
    })
    expect(matchedProjects).toStrictEqual(['find.p', '@scope/find~x'])
    expect(unmatchedFilters).toStrictEqual([])
  })
})

describe('Filer Workspace Packages By Graphics', () => {
  it('scope mode', () => {
    const graphics: Record<string, Package> = {
      'components/fold-1': {
        dirPath: 'components/fold-1',
        manifest: {
          name: '@scope/fold-1'
        }
      },
      'components/fold-2': {
        dirPath: 'components/fold-2',
        manifest: {
          name: '@scope/fold-2'
        }
      },
      'components/fold-3': {
        dirPath: 'components/fold-3',
        manifest: {
          name: '@types/fold-3'
        }
      }
    }
    const { matchedProjects } = filterWorkspacePackagesByGraphics(graphics, ['@scope/*', '*fold*'], { experimental: { debug: false } })
    expect(matchedProjects).toStrictEqual(['@scope/fold-1', '@scope/fold-2', '@types/fold-3'])
  })
  it('global pattern', () => {
    const graphics: Record<string, Package> = {
      'components/fold-1': {
        dirPath: 'components/fold-1',
        manifest: {
          name: '@scope/fold-1'
        }
      },
      'components/fold-2': {
        dirPath: 'components/fold-2',
        manifest: {
          name: '@scope/fold-2'
        }
      },
      'components/fold-3': {
        dirPath: 'components/fold-3',
        manifest: {
          name: '@types/fold-3'
        }
      }
    }
    const { matchedProjects } = filterWorkspacePackagesByGraphics(graphics, ['*'])
    expect(matchedProjects).toStrictEqual(['@scope/fold-1', '@scope/fold-2', '@types/fold-3'])
  })
})
