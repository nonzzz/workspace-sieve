import fs from 'fs'
import * as memdisk from 'memdisk'
import path from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import { searchForWorkspaceRoot } from '../src/find-workspace'
import type { ProjectManifest } from '../src/interface'

const namespace = 'workspace-sieve-suite-'

function createDisk(p: string) {
  const dir = memdisk.create.sync(namespace + p, 64 * 1024 * 1024, { quiet: false })

  fs.mkdirSync(dir, { recursive: true })

  const destroy = () => {
    memdisk.destroy.sync(dir, { quiet: false })
  }

  return { destroy, dir }
}

interface WorkspaceManifestDescription {
  kind: 'pnpm' | 'lerna' | 'npm' | 'yarn'
  manifest: ProjectManifest
  configurationPath?: string
}

const WORKSPACES_MATRIX: WorkspaceManifestDescription[] = [
  { kind: 'yarn', manifest: { name: 'yarn', version: '1.0.0', workspaces: ['packages/*'] } },
  { kind: 'npm', manifest: { name: 'npm', version: '1.0.0', workspaces: ['packages/*'] } },
  { kind: 'lerna', manifest: { name: 'lerna', version: '1.0.0', private: true }, configurationPath: 'lerna.json' },
  { kind: 'pnpm', manifest: { name: 'pnpm', version: '1.0.0' }, configurationPath: 'pnpm-workspace.yaml' }
]

describe('Find Workspace', () => {
  if (process.platform === 'win32') {
    it.skip('Memdisk operations are not supported on Windows~', () => {})
    return
  }
  const { dir, destroy } = createDisk('find-workspace')

  afterAll(() => {
    destroy()
  })

  it('find workspace root', () => {
    for (const { kind, manifest, configurationPath } of WORKSPACES_MATRIX) {
      const workspaceDir = path.join(dir, kind)
      fs.mkdirSync(workspaceDir, { recursive: true })
      fs.writeFileSync(`${workspaceDir}/package.json`, JSON.stringify(manifest, null, 2))
      if (configurationPath) {
        fs.writeFileSync(`${workspaceDir}/${configurationPath}`, JSON.stringify(manifest, null, 2))
      }
      const childDir = path.join(workspaceDir, 'child')
      fs.mkdirSync(childDir, { recursive: true })
    }
    const originalCwd = process.cwd()

    for (const { kind, configurationPath } of WORKSPACES_MATRIX) {
      const workspaceRoot = path.join(dir, kind)
      const workspaceChildDir = path.join(workspaceRoot, 'child')
      process.chdir(workspaceChildDir)
      const currentDir = process.cwd()
      expect(currentDir).toBe(workspaceChildDir)
      const result = searchForWorkspaceRoot(workspaceChildDir)
      expect(result).toBe(workspaceRoot)
      if (configurationPath) {
        const configPath = path.join(workspaceRoot, configurationPath)
        expect(fs.existsSync(configPath)).toBe(true)
      }
      process.chdir(originalCwd)
    }
  })
})
