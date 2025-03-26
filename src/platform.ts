// We should respect pnpm's detection of binary files on different platforms.
import child_process from 'child_process'
import type { PackageMetadata } from './interface'
export interface SupportedArchitectures {
  os?: string[]
  cpu?: string[]
  libc?: string[]
}

const { platform: currentPlatform, arch: currentArch } = process

function getCurrentLibc(): string {
  if (currentPlatform !== 'linux') { return 'unknown' }
  try {
    const lddOutput = child_process.execSync('ldd --version 2>&1', { encoding: 'utf8' })
    return lddOutput.includes('musl') ? 'musl' : 'glibc'
  } catch {
    return 'glibc'
  }
}

export function checkIsInstallable(metadata: PackageMetadata, supportedArchitectures: SupportedArchitectures) {
  return ensurePlatform(metadata.dirPath, supportedArchitectures)
}

function ensurePlatform(packageName: string, supportedArchitectures: SupportedArchitectures) {
  const { os = ['current'], cpu = ['current'], libc = ['current'] } = supportedArchitectures
  const resolvedOs = os.map((o) => o === 'current' ? currentPlatform : o)
  const resolvedCpu = cpu.map((c) => c === 'current' ? currentArch : c)
  const resolvedLibc = libc.map((l) => l === 'current' ? getCurrentLibc() : l)
  if (!resolvedOs.includes(currentPlatform)) {
    throw new Error(
      `Package "${packageName}" is not compatible with current platform (${currentPlatform}). ` +
        `Supported platforms are: ${resolvedOs.join(', ')}`
    )
  }
  if (!resolvedCpu.includes(currentArch)) {
    throw new Error(
      `Package "${packageName}" is not compatible with current CPU architecture (${currentArch}). ` +
        `Supported architectures are: ${resolvedCpu.join(', ')}`
    )
  }
  if (currentPlatform === 'linux') {
    const currentLibc = getCurrentLibc()
    if (!resolvedLibc.includes(currentLibc)) {
      throw new Error(
        `Package "${packageName}" is not compatible with current libc (${currentLibc}). ` +
          `Supported libc types are: ${resolvedLibc.join(', ')}`
      )
    }
  }
}
