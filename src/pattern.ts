export interface WorkspacePatternsMethods {
  match: (input: string) => boolean
  destroy: () => void
}

interface PatternWASM {
  memory: WebAssembly.Memory
  create_pattern_matcher: (pattern_ptr: number, pattern_len: number) => number
  destroy_pattern_matcher: (matcher_ptr: number) => void
  pattern_match: (matcher_ptr: number, input_ptr: number, input_len: number) => boolean
  allocate_memory: (size: number) => number
  free_memory: (ptr: number, size: number) => void
}

interface Mod {
  wasm: PatternWASM
}

type Ref<T> = { current: T }

// @ts-expect-error no types for this module
const mod: Ref<Mod> = { current: null }

const MAX_RAW_TEXT_SIZE = 1024 * 1024 * 5

function loadWASM(): Ref<Mod> {
  if (mod.current) {
    return mod
  }
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const compiledWASM = new WebAssembly.Module(bytes)
  const instance = new WebAssembly.Instance(compiledWASM, {
    env: {
      js_log: (ptr: number, len: number) => {
        if (!mod.current.wasm) {
          return
        }
        const msg = new TextDecoder().decode(new Uint8Array(mod.current.wasm.memory.buffer, ptr, len))
        console.log(`[WASM] ${msg}`)
      }
    }
  }).exports as unknown as PatternWASM
  mod.current = { wasm: instance }
  return mod
}
export function createWASMWorkspacePattern(patterns: string[]): WorkspacePatternsMethods {
  const mod = loadWASM()
  const { wasm } = mod.current

  if (!wasm) {
    throw new Error('WASM module not loaded')
  }

  patterns = patterns.filter((p) => !!p)
  const patternStr = patterns.join('\0')
  const patternBytes = new TextEncoder().encode(patternStr)

  if (patternBytes.length >= MAX_RAW_TEXT_SIZE) {
    throw new Error(`Pattern string exceeds maximum size of ${MAX_RAW_TEXT_SIZE} bytes`)
  }

  const patternPtr = wasm.allocate_memory(patternBytes.length)
  if (!patternPtr) {
    throw new Error('Failed to allocate memory for patterns')
  }

  try {
    const mem = new Uint8Array(wasm.memory.buffer)
    mem.set(patternBytes, patternPtr)

    const matcher = wasm.create_pattern_matcher(patternPtr, patternBytes.length)

    if (!matcher) {
      throw new Error('Failed to create pattern matcher')
    }

    const match = (input: string): boolean => {
      if (!input) {
        return false
      }
      const inputBytes = new TextEncoder().encode(input)

      if (inputBytes.length >= MAX_RAW_TEXT_SIZE) {
        throw new Error(`Input string exceeds maximum size of ${MAX_RAW_TEXT_SIZE} bytes`)
      }

      const inputPtr = wasm.allocate_memory(inputBytes.length)
      if (!inputPtr) {
        throw new Error('Failed to allocate memory for input')
      }

      try {
        const mem = new Uint8Array(wasm.memory.buffer)
        mem.set(inputBytes, inputPtr)
        return !!wasm.pattern_match(matcher, inputPtr, inputBytes.length)
      } finally {
        wasm.free_memory(inputPtr, inputBytes.length)
      }
    }

    const destroy = () => {
      if (matcher) {
        wasm.destroy_pattern_matcher(matcher)
      }
      wasm.free_memory(patternPtr, patternBytes.length)
    }

    return {
      match,
      destroy
    }
  } catch (error) {
    wasm.free_memory(patternPtr, patternBytes.length)
    throw error
  }
}
