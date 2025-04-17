import ansis from 'ansis'

interface PatternWASM {
  memory: WebAssembly.Memory
  createMatcherContext: () => number
  initLogger: () => void
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

const WASM_PAGE_SIZE = 1024 * 64
const OFFSET_PADDING = 1024
const MAX_RAW_TEXT_SIZE = 1024 * 1024 * 16

interface ZigENV extends WebAssembly.ModuleImports {
  _print_js_str: (ptr: number, len: number) => void
}
// Detailed definition is in the zig/logger.zig file
type LoggerLevel = 0 | 1 | 2 | 3

const LOG_LEVEL_ANSIS: Record<LoggerLevel, { icon: string, color: typeof ansis }> = {
  0: { icon: '\u2699', color: ansis.cyan },
  1: { icon: '\u2714', color: ansis.green },
  2: { icon: '\u26A0', color: ansis.yellow },
  3: { icon: '\u2716', color: ansis.red }
}

function createZigEnv(instanceId: string) {
  let instance: Instance | undefined

  const not = () => !instance || !instance.debugMode

  const getInstance = (i: Instance | undefined): i is Instance => {
    if (!instance) {
      instance = instances.get(instanceId)
      if (not()) {
        return false
      }
    }
    return !not()
  }

  return <ZigENV> {
    _print_js_str: (ptr, len) => {
      if (!getInstance(instance)) {
        return
      }
      const mem = new Uint8Array(instance.module.memory.buffer)
      const message = textDecoder.decode(mem.subarray(ptr, ptr + len))
      const [levelStr, content] = message.split('|')
      const { color, icon } = LOG_LEVEL_ANSIS[+levelStr as LoggerLevel]
      console.log(`${icon} ${color(content)}`)
    }
  }
}

let compiledWASM: WebAssembly.Module | undefined

function loadWASM(debug: boolean) {
  const instanceId = `wasm_${++instanceCounter}`

  if (!compiledWASM) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    compiledWASM = new WebAssembly.Module(bytes)
  }
  const compiled = compiledWASM
  const env = createZigEnv(instanceId)
  const module = new WebAssembly.Instance(compiled, { env }).exports as unknown as PatternWASM
  instances.set(instanceId, {
    module,
    debugMode: debug
  })

  return { instanceId, module, debug }
}

// In zig part, the str is defined as a slice in C style.
function initMatcherContext(module: PatternWASM, patterns: string[], debug = false) {
  const maxPatternLen = Math.max(...patterns.map((p) => p.length))
  const maxPatternLenBytes = Math.ceil(maxPatternLen / WASM_PAGE_SIZE) * WASM_PAGE_SIZE
  const maxRawTextSize = Math.min(MAX_RAW_TEXT_SIZE, maxPatternLenBytes)

  if (maxPatternLen > maxRawTextSize) {
    throw new Error(`Pattern length exceeds maximum size of ${maxRawTextSize} bytes`)
  }
  // grow memory
  const growSize = Math.ceil((maxPatternLen + OFFSET_PADDING) / WASM_PAGE_SIZE)

  if (growSize > 1) {
    module.memory.grow(growSize)
    if (debug) {
      console.log(`Memory grown by ${growSize} pages (${growSize * WASM_PAGE_SIZE} bytes)`)
    }
  }

  module.initLogger()
  const contextPtr = module.createMatcherContext()
  const mem = new Uint8Array(module.memory.buffer)
  //  0-1024 maybe wasm reserved characters.
  let offset = OFFSET_PADDING
  const lengths = new Uint32Array(patterns.length)

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    const encoded = textEncoder.encode(pattern)
    mem.set(encoded, offset)
    mem[offset + encoded.length] = 0 // null terminator
    lengths[i] = encoded.length
    offset += encoded.length + 1
  }
  const lengthsPtr = INPUT_MEMORY_OFFSET + 2048
  mem.set(new Uint8Array(lengths.buffer), lengthsPtr)

  const matcherId = module.initMatcher(contextPtr, OFFSET_PADDING, lengthsPtr, patterns.length)
  return { matcherId, contextPtr }
}

function createMatcher(patterns: string[], debug = false) {
  const { instanceId, module, debug: debugMode } = loadWASM(debug)
  const { matcherId, contextPtr } = initMatcherContext(module, patterns, debugMode)

  let lastMatcherRawTextSize = 0

  return {
    match: (input: string): boolean => {
      const maxInputLenBytes = Math.ceil(input.length / WASM_PAGE_SIZE) * WASM_PAGE_SIZE
      const maxRawTextSize = Math.min(MAX_RAW_TEXT_SIZE, maxInputLenBytes)
      if (maxInputLenBytes > maxRawTextSize) {
        throw new Error(`Input length exceeds maximum size of ${maxRawTextSize} bytes`)
      }
      const len = maxInputLenBytes + OFFSET_PADDING
      const growSize = Math.ceil((maxInputLenBytes + OFFSET_PADDING) / WASM_PAGE_SIZE)
      if (growSize > 1 && len > lastMatcherRawTextSize) {
        module.memory.grow(growSize)
        if (debugMode) {
          console.log(`Memory grown by ${growSize} pages (${growSize * WASM_PAGE_SIZE} bytes)`)
        }
        lastMatcherRawTextSize = len
      }
      const mem = new Uint8Array(module.memory.buffer)

      const { written } = textEncoder.encodeInto(input, mem.subarray(INPUT_MEMORY_OFFSET, INPUT_MEMORY_OFFSET + maxRawTextSize))

      return !!module.matchPattern(contextPtr, matcherId, INPUT_MEMORY_OFFSET, written)
    },

    dispose: () => {
      module.disposeMatcher(contextPtr, matcherId)
      module.destroyMatcherContext(contextPtr)
      instances.delete(instanceId)
      lastMatcherRawTextSize = 0
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
