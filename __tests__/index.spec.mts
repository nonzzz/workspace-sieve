import path from 'path'
import { describe, expect, it } from 'vitest'
import { filterWorkspacePackagesFromDirectory, findWorkspacePackages } from '../src'

const __dirname = new URL('.', import.meta.url).pathname

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
      filter: ['!fold-1', 'fold-3']
    })
    expect(unmatchedFilters).toStrictEqual(['fold-3'])
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
