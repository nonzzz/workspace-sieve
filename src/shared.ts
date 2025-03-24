import fs from 'fs'
import fsp from 'fs/promises'

// MIT License
// Copyright (c) Vite

export function tryStatSync(file: string): fs.Stats | undefined {
  try {
    // The "throwIfNoEntry" is a performance optimization for cases where the file does not exist
    return fs.statSync(file, { throwIfNoEntry: false })
  } catch {
    // Ignore errors
  }
}

export function isFileReadable(filename: string): boolean {
  if (!tryStatSync(filename)) {
    return false
  }

  try {
    // Check if current process has read permission to the file
    fs.accessSync(filename, fs.constants.R_OK)

    return true
  } catch {
    return false
  }
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const content = await fsp.readFile(filePath, 'utf8')
  return JSON.parse(content) as T
}
