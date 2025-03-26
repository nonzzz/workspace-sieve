import fsp from 'fs/promises'

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const content = await fsp.readFile(filePath, 'utf8')
  return JSON.parse(content) as T
}
