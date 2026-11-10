/**
 * Audit Appendix A repros (errorset-audit.md), encoded before the fixes.
 *
 * Each case asserts the behavior the fix must deliver, so today it fails and is marked
 * `test.failing`. Convention: the task that fixes a case changes it to `test` in the
 * same commit. Names are `<auditId> [<fixing task>] <expected behavior>`. At the v0.4.0
 * release only the cases scheduled for v0.5.0 (A5, A9) may still be `test.failing`.
 */

import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync, write } from "bun"
import {
  configure,
  errorSet,
  getConfig,
  merge,
  resetConfig,
} from "../../src/index.ts"

type Ctx = { symbol: string }
type IdCtx = { id: string }

const ROOT = new URL("../../", import.meta.url).pathname
const SOURCE_ENTRY = join(ROOT, "src/index.ts")
const CROSS_COPY_PROBE = join(
  ROOT,
  "tests/regression/fixtures/cross-copy-probe.ts"
)
const TSC = join(ROOT, "node_modules/.bin/tsc")
const RESERVED_RECOVER_MESSAGE = /reserved.*"recover"|"recover".*reserved/iu

afterEach(() => {
  resetConfig()
})

const OrderError = errorSet("OrderError", [
  "invalid_symbol",
  "order_rejected",
]).init<Ctx>()
const PositionError = errorSet("PositionError", [
  "invalid_symbol",
  "fetch_failed",
]).init<Ctx>()

type CrossCopyResult = {
  distinctCopies: boolean
  pluginRecognizesOwn: boolean
  hostIsErr: boolean
  hostSetGuard: boolean
  hostKindGuard: boolean
}

const runCrossCopyProbe = (): CrossCopyResult => {
  const probe = spawnSync([process.execPath, CROSS_COPY_PROBE], {
    stdout: "pipe",
    stderr: "pipe",
  })
  if (probe.exitCode !== 0) {
    throw new Error(`cross-copy probe failed: ${probe.stderr.toString()}`)
  }
  const result = JSON.parse(probe.stdout.toString()) as CrossCopyResult
  // The harness itself must be sound for the assertions below to mean anything.
  expect(result.distinctCopies).toBe(true)
  expect(result.pluginRecognizesOwn).toBe(true)
  return result
}

/** Type-checks `body` (appended to an import of src) and returns tsc's diagnostics. */
const typeCheck = async (
  body: string
): Promise<{ ok: boolean; output: string }> => {
  const directory = await mkdtemp(join(tmpdir(), "errorset-typecheck-"))
  try {
    await write(
      join(directory, "probe.ts"),
      `import { errorSet } from ${JSON.stringify(SOURCE_ENTRY)}\n${body}\n`
    )
    await write(
      join(directory, "tsconfig.json"),
      JSON.stringify({
        extends: join(ROOT, "tsconfig.json"),
        compilerOptions: {
          noEmit: true,
          // types: ["bun"] (inherited) must resolve from the repo, not the temp directory
          typeRoots: [join(ROOT, "node_modules/@types")],
        },
        files: ["probe.ts"],
      })
    )
    const result = spawnSync([TSC, "-p", join(directory, "tsconfig.json")], {
      stdout: "pipe",
      stderr: "pipe",
    })
    return {
      ok: result.exitCode === 0,
      output: `${result.stdout.toString()}${result.stderr.toString()}`,
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

describe("A1 cross-set confusion", () => {
  test("A1 [TASK-055] a set guard rejects another set's error with the same kind", () => {
    const fromPosition = PositionError.invalid_symbol`bad ${"symbol"}`({
      symbol: "X",
    })
    expect(OrderError(fromPosition)).toBe(false)
  })

  test("A1 [TASK-055] a kind guard rejects another set's error with the same kind", () => {
    const fromPosition = PositionError.invalid_symbol`bad ${"symbol"}`({
      symbol: "X",
    })
    expect(OrderError.invalid_symbol(fromPosition)).toBe(false)
  })
})

describe("A2 cross-copy recognition (two separately built copies)", () => {
  test("A2 [TASK-054] isErr from copy A accepts an error created by copy B", () => {
    expect(runCrossCopyProbe().hostIsErr).toBe(true)
  })

  // Passes since the registry-symbol brand; TASK-055 (set identity) must keep it passing.
  test("A2 [TASK-054] set and kind guards from copy A accept copy B's error", () => {
    const result = runCrossCopyProbe()
    expect(result.hostSetGuard).toBe(true)
    expect(result.hostKindGuard).toBe(true)
  })
})

describe("A3 reserved kind names", () => {
  test("A3 [TASK-057] a reserved kind name throws a clear error naming it", () => {
    // @ts-expect-error - reserved kind names are also rejected at compile time
    expect(() => errorSet("S", ["recover"]).init()).toThrow(
      RESERVED_RECOVER_MESSAGE
    )
  })
})

describe("A4 no-context error shape", () => {
  test("A4 [TASK-060] structuredClone of a no-context error succeeds", () => {
    const E = errorSet("E", ["boom"]).init<IdCtx>()
    const noContext = E.boom`static message`
    const clone = structuredClone(noContext) as {
      kind: string
      message: string
    }
    expect(clone.kind).toBe("boom")
    expect(clone.message).toBe("static message")
  })
})

describe("A5 brand lost across serialization (v0.5.0)", () => {
  test.failing("A5 [TASK-065 v0.5.0] XError.from() rehydrates a JSON round-tripped error", () => {
    const E = errorSet("E", ["boom"]).init<IdCtx>()
    const parsed: unknown = JSON.parse(
      JSON.stringify(E.boom`id ${"id"}`({ id: "1" }))
    )
    const { from } = E as unknown as { from: (value: unknown) => unknown }
    expect(E(from(parsed))).toBe(true)
  })
})

describe("A6 capture drops the original error", () => {
  test("A6 [TASK-058] capture attaches the thrown value as the error's cause", () => {
    const C = errorSet("C", ["failed"]).init<{ message: string }>()
    const root = new TypeError("root")
    const result = C.capture(
      () => {
        throw root
      },
      e => C.failed`${"message"}`({ message: e.message })
    )
    expect(C(result)).toBe(true)
    expect((result as { cause?: unknown }).cause).toBe(root)
  })
})

describe("A8 mutable errors", () => {
  test("A8 [TASK-061] writing to an error's message throws", () => {
    const E = errorSet("E", ["boom"]).init<IdCtx>()
    const err = E.boom`id ${"id"}`({ id: "1" }) as { message: string }
    expect(() => {
      err.message = "changed"
    }).toThrow(TypeError)
  })

  test("A8 [TASK-061] writing to an error's data throws", () => {
    const E = errorSet("E", ["boom"]).init<IdCtx>()
    const err = E.boom`id ${"id"}`({ id: "1" }) as { data: { id: string } }
    expect(() => {
      err.data.id = "changed"
    }).toThrow(TypeError)
  })
})

describe("A9 merge duplicates kinds (v0.5.0)", () => {
  test.failing("A9 [TASK-067 v0.5.0] merge lists each kind once", () => {
    expect(merge(OrderError, PositionError).kinds).toEqual([
      "invalid_symbol",
      "order_rejected",
      "fetch_failed",
    ])
  })
})

describe("A10 non-exhaustive recover", () => {
  test("A10 [TASK-056] recover with an empty or partial handler map does not type-check", async () => {
    const body = [
      'const E = errorSet("E", ["boom", "bust"]).init<{ id: string }>()',
      `const err = E.boom\`id \${"id"}\`({ id: "1" })`,
      "const value: string | typeof err = err",
      "export const empty = E.recover(value, {})",
      'export const partial = E.recover(value, { boom: () => "x" })',
    ]
    const result = await typeCheck(body.join("\n"))
    // probe.ts line = 1 (import) + 1-based index in body
    const lineOf = (needle: string): number =>
      body.findIndex(line => line.includes(needle)) + 2
    expect(result.ok).toBe(false)
    expect(result.output).toContain(`probe.ts(${lineOf("recover(value, {})")},`)
    expect(result.output).toContain(`probe.ts(${lineOf("{ boom:")},`)
    expect(result.output.match(/error TS/gu)?.length).toBe(2)
  }, 30_000)
})

describe("A11 no-op configuration", () => {
  test("A11 [TASK-048] includeTimestamp sets a timestamp (fixed in v0.3.1)", () => {
    configure({ includeTimestamp: true })
    const E = errorSet("E", ["boom"]).init<IdCtx>()
    expect(typeof E.boom`id ${"id"}`({ id: "1" }).timestamp).toBe("number")
  })

  test("A11 [TASK-059] the no-op format and colors options no longer exist", () => {
    const config = getConfig() as Record<string, unknown>
    expect("format" in config).toBe(false)
    expect("colors" in config).toBe(false)
  })
})
