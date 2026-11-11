/**
 * capture/captureAsync keep the original exception as `cause` (TASK-058, audit A6),
 * `cause` accepts any value, and native Error causes serialize with their code.
 * @module tests/capture-cause
 */

import { describe, expect, it } from "bun:test"
import { errorSet, isErr } from "../src/index.ts"
import { errCause } from "./support/err-cause.ts"

const DbError = errorSet("CaptureCause.DbError", [
  "query_failed",
  "unavailable",
]).init<{
  message: string
}>()
const RootError = errorSet("CaptureCause.RootError", ["root"]).init()

class SqliteError extends Error {
  readonly code = "SQLITE_BUSY"
  readonly errno = 5
  constructor(message: string) {
    super(message)
    this.name = "SqliteError"
  }
}

const toQueryFailed = (e: Error) =>
  DbError.query_failed`${"message"}`({ message: e.message })

const causeOf = (value: unknown): unknown => {
  expect(DbError(value)).toBe(true)
  return (value as { cause?: unknown }).cause
}

describe("capture attaches the caught value as cause", () => {
  it("sync throw: the original Error instance", () => {
    const root = new TypeError("root")
    const result = DbError.capture(() => {
      throw root
    }, toQueryFailed)
    expect(causeOf(result)).toBe(root)
    expect((result as { message: string }).message).toBe("root")
  })

  it("async rejection", async () => {
    const root = new Error("rejected")
    const result = await DbError.captureAsync(
      () => Promise.reject(root),
      toQueryFailed
    )
    expect(causeOf(result)).toBe(root)
  })

  it("sync throw inside an async function", async () => {
    const root = new RangeError("thrown synchronously")
    // biome-ignore lint/suspicious/useAwait: the throw happens before any await on purpose
    const result = await DbError.captureAsync(async () => {
      throw root
    }, toQueryFailed)
    expect(causeOf(result)).toBe(root)
  })

  it("an Error subclass keeps code and errno, and serializes its code", () => {
    const root = new SqliteError("database is locked")
    const result = DbError.capture(() => {
      throw root
    }, toQueryFailed)
    const cause = causeOf(result) as SqliteError
    expect(cause).toBe(root)
    expect(cause.code).toBe("SQLITE_BUSY")
    expect(cause.errno).toBe(5)
    expect(JSON.parse(JSON.stringify(result)).cause).toEqual({
      name: "SqliteError",
      message: "database is locked",
      code: "SQLITE_BUSY",
    })
  })

  it("a thrown plain object: original value as cause, readable message", () => {
    const thrown = { status: 503, reason: "maintenance" }
    const result = DbError.capture(() => {
      throw thrown
    }, toQueryFailed)
    expect(causeOf(result)).toBe(thrown)
    expect((result as { message: string }).message).toBe(
      '{"status":503,"reason":"maintenance"}'
    )
  })

  it("a thrown string: message is the string itself", () => {
    // Third-party code can throw anything; the test needs a real string throw
    const thrown: unknown = "connection reset"
    const result = DbError.capture(() => {
      throw thrown
    }, toQueryFailed)
    expect(causeOf(result)).toBe("connection reset")
    expect((result as { message: string }).message).toBe("connection reset")
  })

  it("renders cyclic objects, bigints, primitives and unserializable values safely", () => {
    const cyclic: Record<string, unknown> = { id: 1n }
    cyclic.self = cyclic
    const unserializable = {
      toJSON() {
        throw new Error("no")
      },
    }
    const messageFor = (thrown: unknown): string => {
      const result = DbError.capture(() => {
        throw thrown
      }, toQueryFailed)
      return (result as { message: string }).message
    }
    expect(messageFor(cyclic)).toBe('{"id":"1","self":"[Circular]"}')
    expect(messageFor(42)).toBe("42")
    expect(messageFor(undefined)).toBe("undefined")
    expect(messageFor(null)).toBe("null")
    expect(messageFor(unserializable)).toBe("[object Object]")
    expect(messageFor(Object.create(null))).toBe("{}")
  })

  it("keeps a cause the mapper set", () => {
    const own = RootError.root`Own cause`
    const result = DbError.capture(
      () => {
        throw new Error("ignored")
      },
      e =>
        DbError.query_failed`${"message"}`(
          { message: e.message },
          { cause: own }
        )
    )
    expect(causeOf(result)).toBe(own)
  })

  it("a callable no-context mapper result gets the cause through its call", () => {
    const root = new Error("down")
    const result = DbError.capture(
      () => {
        throw root
      },
      () => DbError.unavailable`Database unavailable`
    )
    expect(DbError.unavailable(result)).toBe(true)
    expect(typeof result).toBe("object")
    expect((result as { cause?: unknown }).cause).toBe(root)
  })

  it("does not modify the mapper's error object", () => {
    const mapped = DbError.query_failed`${"message"}`({ message: "x" })
    const result = DbError.capture(
      () => {
        throw new Error("boom")
      },
      () => mapped
    )
    expect(result).not.toBe(mapped)
    expect("cause" in mapped).toBe(false)
    expect(Object.keys(result as object)).toEqual([
      "set",
      "kind",
      "message",
      "data",
      "cause",
    ])
    expect(String(result)).toBe(String(mapped))
  })

  it("returns the result unchanged when nothing throws", async () => {
    expect(DbError.capture(() => 1, toQueryFailed)).toBe(1)
    expect(
      await DbError.captureAsync(() => Promise.resolve(2), toQueryFailed)
    ).toBe(2)
  })
})

describe("cause accepts any value", () => {
  it("native Errors and plain values are accepted as cause", () => {
    const native = new Error("native")
    const fromNative = DbError.query_failed`${"message"}`(
      { message: "a" },
      { cause: native }
    )
    const fromValue = DbError.unavailable`Down`.with({
      cause: { retryInMs: 500 },
    })
    expect(fromNative.cause).toBe(native)
    expect(fromValue.cause).toEqual({ retryInMs: 500 })
    expect(isErr(fromNative.cause)).toBe(false)
  })

  it("errorset causes still narrow with isErr", () => {
    const inner = RootError.root`Inner`
    const outer = DbError.unavailable`Outer`.with({ cause: inner })
    expect(errCause(outer.cause).kind).toBe("root")
    expect(() => errCause("not an error")).toThrow(
      "expected an errorset error as cause"
    )
  })
})
