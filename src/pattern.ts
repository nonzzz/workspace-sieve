// Pattern wasm ver

interface PatternWASM {
  memory: WebAssembly.Memory
  createMatcherContext: () => number
  destroyMatcherContext: (contextPtr: number) => void
  initMatcher: (contextPtr: number, patternsPtr: number, patternsLen: number, count: number) => number
  matchPattern: (contextPtr: number, matcherId: number, inputPtr: number, inputLen: number) => number
  disposeMatcher: (contextPtr: number, matcherId: number) => void
}

interface Instance {
  module: PatternWASM
  debugMode: boolean
}

const instances = new Map<string, Instance>()
let instanceCounter = 0

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const INPUT_MEMORY_OFFSET = 1024 * 4
const INITIAL_BUFFER_SIZE = 8192
const MAX_BUFFER_SIZE = 1024 * 1024 * 16

function createZigEnv(instanceId: string) {
  return {
    logString: (ptr: number, len: number) => {
      const instance = instances.get(instanceId)
      if (!instance || !instance.debugMode) { return }
      const memory = new Uint8Array(instance.module.memory.buffer)
      const logText = textDecoder.decode(memory.subarray(ptr, ptr + len))
      console.log(`[Instance ${instanceId} DEBUG]: ${logText}`)
    },
    logBytes: (ptr: number, len: number) => {
      const instance = instances.get(instanceId)
      if (!instance || !instance.debugMode) { return }

      const memory = new Uint8Array(instance.module.memory.buffer)
      const bytes = Array.from(memory.subarray(ptr, ptr + len))
      console.log(
        `[Instance ${instanceId} BYTES]: ${bytes.join(', ')} (ASCII: '${
          bytes.map((b) => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join('')
        }')`
      )
    },
    isDebugEnabled: () => {
      const instance = instances.get(instanceId)
      return instance ? instance.debugMode : false
    }
  }
}

function loadWASM(debug: boolean) {
  const instanceId = `wasm_${++instanceCounter}`
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const compiled = new WebAssembly.Module(bytes)
  const env = createZigEnv(instanceId)
  const module = new WebAssembly.Instance(compiled, { env }).exports as unknown as PatternWASM
  instances.set(instanceId, {
    module,
    debugMode: debug
  })

  return { instanceId, module, debug }
}

function writeStringsToMemory(
  module: PatternWASM,
  strings: string[],
  debugMode: boolean
): { ptr: number, lengths: number[] } {
  const memoryOffset = 1024
  const mem = new Uint8Array(module.memory.buffer)
  const lengths: number[] = []

  const encodedStrings = strings.map((str) => textEncoder.encode(str))

  let offset = memoryOffset
  for (const encoded of encodedStrings) {
    mem.set(encoded, offset)
    mem[offset + encoded.length] = 0 // null terminator
    lengths.push(encoded.length)

    if (debugMode) {
      const written = Array.from(mem.slice(offset, offset + encoded.length))
        .map((b) => String.fromCharCode(b)).join('')
      console.log(`[JS Written]: "${written}"`)
    }

    offset += encoded.length + 1
  }

  return { ptr: memoryOffset, lengths }
}

function createMatcher(patterns: string[], debug = false) {
  const { instanceId, module, debug: debugMode } = loadWASM(debug)

  const contextPtr = module.createMatcherContext()
  const { ptr, lengths } = writeStringsToMemory(module, patterns, debugMode)

  const lengthsArray = new Uint32Array(lengths)
  const lengthsPtr = INPUT_MEMORY_OFFSET + 2048
  let mem = new Uint8Array(module.memory.buffer)
  mem.set(new Uint8Array(lengthsArray.buffer), lengthsPtr)

  const matcherId = module.initMatcher(contextPtr, ptr, lengthsPtr, patterns.length)

  let bufferSize = INITIAL_BUFFER_SIZE
  let inputBuffer: Uint8Array | null = new Uint8Array(bufferSize)

  return {
    match: (input: string): boolean => {
      const estimatedSize = input.length * 4 // UTF-8 can be up to 4 bytes per char

      if (estimatedSize > bufferSize && estimatedSize < MAX_BUFFER_SIZE) {
        bufferSize = Math.min(MAX_BUFFER_SIZE, Math.pow(2, Math.ceil(Math.log2(estimatedSize))))
        inputBuffer = new Uint8Array(bufferSize)
      }

      let encodedLen: number

      if (estimatedSize <= bufferSize) {
        const result = textEncoder.encodeInto(input, inputBuffer!)
        encodedLen = result.written || 0
      } else {
        const encoded = textEncoder.encode(input)
        encodedLen = encoded.length

        if (mem.buffer !== module.memory.buffer) {
          mem = new Uint8Array(module.memory.buffer)
        }

        mem.set(encoded, INPUT_MEMORY_OFFSET)
        return !!module.matchPattern(contextPtr, matcherId, INPUT_MEMORY_OFFSET, encodedLen)
      }

      if (mem.buffer !== module.memory.buffer) {
        mem = new Uint8Array(module.memory.buffer)
      }

      mem.set(inputBuffer!.subarray(0, encodedLen), INPUT_MEMORY_OFFSET)
      return !!module.matchPattern(contextPtr, matcherId, INPUT_MEMORY_OFFSET, encodedLen)
    },

    dispose: () => {
      module.disposeMatcher(contextPtr, matcherId)
      module.destroyMatcherContext(contextPtr)
      instances.delete(instanceId)
      inputBuffer = null
    }
  }
}

export function createWorkspacePatternWASM(patterns: string[], debug = false) {
  const matcher = createMatcher(patterns, debug)
  return {
    match: (input: string) => matcher.match(input),
    dispose: () => matcher.dispose()
  }
}
