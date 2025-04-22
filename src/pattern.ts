import ansis from 'ansis'

type PatternMatcher = (
  patterns_ptr: number,
  patterns_len_ptr: number,
  patterns_count: number,
  input_ptr: number,
  input_len: number
) => number
interface PatternWASM {
  memory: WebAssembly.Memory
  patternMatch: PatternMatcher
  initLogger: () => void
}

type Ref<T> = { current: T | null }

interface Mod {
  wasm: PatternWASM
  debug: boolean
}

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

const textDecoder = new TextDecoder()

function createEnvWASM(modRef: Ref<Mod>) {
  return <ZigENV> {
    _print_js_str(ptr, len) {
      if (!modRef.current) {
        return
      }
      if (!modRef.current.debug) {
        return
      }
      const msg = textDecoder.decode(modRef.current.wasm.memory.buffer.slice(ptr, ptr + len))
      const [level, content] = msg.split('|')
      const { color, icon } = LOG_LEVEL_ANSIS[+level as LoggerLevel]
      console.log(`${icon} ${color(content)}`)
    }
  }
}

let compiledWASM: WebAssembly.Module | undefined

const Magic = {
  IS_LE: new Uint8Array(new Uint16Array([1]).buffer)[0] === 1,
  MAX_RAW_TEXT: 1024 * 1024 * 8,
  PAGE_SIZE: 1024 * 64,
  PADDING: 1024
}

// Note: This impl repsect C style string.
// eg:
// pass abc should be as abc\0
const utf16 = {
  encode: (str: string, dest: WebAssembly.Memory, offset: number): number => {
    offset = (offset + 1) & ~1
    const view = new Uint16Array(dest.buffer, offset, str.length + 1)
    const len = str.length
    for (let i = 0; i < len; i++) {
      view[i] = str.charCodeAt(i)
    }
    view[len] = 0

    if (!Magic.IS_LE) {
      for (let i = 0; i <= len; i++) {
        const value = view[i]
        view[i] = ((value & 0xff) << 8) | ((value >> 8) & 0xff)
      }
    }
    return (len + 1) * 2
  }
}

function loadWASM(debug: boolean) {
  if (!compiledWASM) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    compiledWASM = new WebAssembly.Module(bytes)
  }
  const mod: Ref<Mod> = { current: null }
  const env = createEnvWASM(mod)
  const instance = new WebAssembly.Instance(compiledWASM, { env }).exports as unknown as PatternWASM
  mod.current = { wasm: instance, debug }

  return mod
}

export interface WorkspacePatternsMethods {
  match: (input: string) => boolean
}

function createMatcher(mod: Ref<Mod>, patterns: string[]) {
  return {
    match: (input: string) => {
      if (!mod.current) {
        throw new Error('WASM module not loaded')
      }

      const { totalTextLen } = [...patterns, input].reduce((acc, text) => {
        if (text.length > Magic.MAX_RAW_TEXT) {
          throw new Error(`Text length exceeds maximum size of ${Magic.MAX_RAW_TEXT} bytes`)
        }
        return {
          totalTextLen: acc.totalTextLen + text.length
        }
      }, { totalTextLen: 0 })
      const { wasm, debug } = mod.current
      // Align the text len based on 2 bytes
      const alignedTextLen = totalTextLen % 2 === 0 ? totalTextLen : totalTextLen + 1
      const extraMem = Magic.PADDING + alignedTextLen * 4 - wasm.memory.buffer.byteLength
      if (extraMem > 0) {
        const page = Math.ceil(extraMem / Magic.PAGE_SIZE)
        wasm.memory.grow(page)
        if (debug) {
          console.log(`Memory grown by ${page} pages (${page * Magic.PAGE_SIZE} bytes)`)
        }
      }
      let offset = Magic.PADDING
      offset = (offset + 3) & ~3
      const patternsPtr = offset
      const patternLengths = new Uint32Array(patterns.length)
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i]
        const bytesWritten = utf16.encode(pattern, wasm.memory, offset)
        patternLengths[i] = pattern.length
        offset += bytesWritten
        offset = (offset + 3) & ~3
      }
      const patternsLenPtr = offset
      const patternsLenView = new Uint8Array(patternLengths.buffer)
      const mem = new Uint8Array(wasm.memory.buffer)
      for (let i = 0; i < patternsLenView.length; i++) {
        mem[patternsLenPtr + i] = patternsLenView[i]
      }
      const mem = new Uint8Array(module.memory.buffer)

      const inputPtr = patternsLenPtr + patternsLenView.length

      const bytesWritten = utf16.encode(input, wasm.memory, inputPtr)
      const inputLen = bytesWritten / 2

      wasm.initLogger()
      return !!wasm.patternMatch(patternsPtr, patternsLenPtr, patterns.length, inputPtr, inputLen)
    }
  }
}

export function createWorkspacePattern(patterns: string[], debug = false): WorkspacePatternsMethods {
  const mod = loadWASM(debug)
  const matcher = createMatcher(mod, patterns)

  return {
    match: (input) => matcher.match(input)
  }
}
