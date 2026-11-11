/**
 * XError.from() rehydrates errors that crossed JSON, structuredClone, workers or HTTP
 * (TASK-065, audit A5).
 * @module tests/rehydration
 */

import { afterEach, describe, expect, it } from "bun:test"
import { configure, ERR, ERR_PROTOCOL, errorSet, isErr } from "../src/index.ts"

type User = { id: string; name: string }

const UserError = errorSet("Rehydrate.UserError", [
  "not_found",
  "invalid",
]).init<User>()
const OtherError = errorSet("Rehydrate.OtherError", ["not_found"]).init<User>()
const DbError = errorSet("Rehydrate.DbError", ["timeout"]).init()

const viaJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

const restores: (() => void)[] = []
afterEach(() => {
  for (const restore of restores.splice(0)) {
    restore()
  }
})

describe("from() round-trips", () => {
  const template = () =>
    UserError.not_found`User ${"id"} not found`({ id: "1" })
  const noContext = () => UserError.invalid`Invalid user`

  it.each([
    ["JSON", viaJson],
    ["structuredClone", structuredClone],
  ] as const)(
    "template error via %s recovers every guard",
    (_label, transport) => {
      const original = template()
      const copy = transport(original)
      expect(UserError(copy)).toBe(false)

      const restored = UserError.from(copy)
      expect(restored).toBeDefined()
      expect(isErr(restored)).toBe(true)
      expect(UserError(restored)).toBe(true)
      expect(UserError.not_found(restored)).toBe(true)
      expect(restored instanceof UserError).toBe(true)
      expect(UserError.invalid(restored)).toBe(false)
      expect(OtherError(restored)).toBe(false)
      expect(JSON.stringify(restored)).toBe(JSON.stringify(original))
      expect(String(restored)).toBe(String(original))
      expect(Object.keys(restored as object)).toEqual(Object.keys(original))
      expect((restored as { [ERR]: unknown })[ERR]).toBe(ERR_PROTOCOL)
    }
  )

  it.each([
    ["JSON", viaJson],
    ["structuredClone", structuredClone],
  ] as const)(
    "no-context error via %s comes back with .with()",
    (_label, transport) => {
      const original = noContext()
      const restored = UserError.from(transport(original))
      expect(UserError.invalid(restored)).toBe(true)
      expect(JSON.stringify(restored)).toBe(JSON.stringify(original))
      const withCause = restored?.kind === "invalid" ? restored : undefined
      const derived = (
        withCause as unknown as { with: (o: { cause: unknown }) => unknown }
      ).with({ cause: "x" })
      expect(UserError.invalid(derived)).toBe(true)
      expect((derived as { cause: unknown }).cause).toBe("x")
    }
  )

  it("narrows the result to the set's error type", () => {
    const restored = UserError.from(viaJson(template()))
    if (restored === undefined) {
      throw new Error("expected an error")
    }
    expect(restored.set).toBe("Rehydrate.UserError")
    expect(restored.kind).toBe("not_found")
    expect(restored.data.id).toBe("1")
  })

  it("returns a frozen error with frozen data, without freezing the input", () => {
    const parsed = viaJson(template()) as { data: object }
    const restored = UserError.from(parsed) as unknown as {
      message: string
      data: { id: string }
    }
    expect(Object.isFrozen(restored)).toBe(true)
    expect(Object.isFrozen(restored.data)).toBe(true)
    expect(Object.isFrozen(parsed)).toBe(false)
    expect(Object.isFrozen(parsed.data)).toBe(false)
    expect(restored.data).not.toBe(parsed.data)
    expect(() => {
      restored.message = "changed"
    }).toThrow(TypeError)
  })

  it("keeps timestamp from the input instead of creating a new one", () => {
    restores.push(configure({ includeTimestamp: true }))
    const original = template() as unknown as { timestamp: number }
    const restored = UserError.from({
      ...(viaJson(original) as object),
      timestamp: 1234,
    }) as unknown as { timestamp: number }
    expect(restored.timestamp).toBe(1234)
    const without = UserError.from({
      set: "Rehydrate.UserError",
      kind: "not_found",
      message: "m",
      data: {},
    }) as object
    expect("timestamp" in without).toBe(false)
  })

  it("does not capture a stack even when includeStack is on", () => {
    restores.push(configure({ includeStack: true }))
    const restored = UserError.from(viaJson(template())) as object
    expect("stack" in restored).toBe(false)
  })

  it("returns an error of this set unchanged", () => {
    const original = template()
    expect(UserError.from(original)).toBe(original)
  })
})

describe("from() causes", () => {
  it("keeps the cause as data; the cause's own set rehydrates it", () => {
    const inner = DbError.timeout`Query timed out`
    const outer = UserError.not_found`User ${"id"} not found`(
      { id: "1" },
      { cause: inner }
    )
    const restored = UserError.from(viaJson(outer))
    expect(UserError(restored)).toBe(true)
    const { cause } = restored as { cause?: unknown }
    expect(cause).toEqual(viaJson(inner))
    expect(DbError(cause)).toBe(false)
    expect(DbError.timeout(DbError.from(cause))).toBe(true)
  })

  it("keeps a structured-cloned native Error cause", () => {
    const outer = UserError.invalid`Invalid`.with({
      cause: new RangeError("r"),
    })
    const restored = UserError.from(structuredClone(outer))
    const { cause } = restored as { cause?: unknown }
    expect(cause).toBeInstanceOf(RangeError)
    expect((cause as Error).message).toBe("r")
  })

  it("omits cause when it is undefined or absent", () => {
    const restored = UserError.from({
      set: "Rehydrate.UserError",
      kind: "invalid",
      message: "m",
      data: {},
      cause: undefined,
    }) as object
    expect("cause" in restored).toBe(false)
  })
})

describe("from() rejects input that is not an error of this set", () => {
  const valid = {
    set: "Rehydrate.UserError",
    kind: "not_found",
    message: "User 1 not found",
    data: { id: "1" },
  }

  it("accepts the valid baseline", () => {
    expect(UserError.from(valid)).toBeDefined()
  })

  it.each([
    ["wrong set (same kind name)", { ...valid, set: "Rehydrate.OtherError" }],
    ["unknown kind", { ...valid, kind: "suspended" }],
    ["inherited kind name", { ...valid, kind: "toString" }],
    [
      "missing set",
      { kind: valid.kind, message: valid.message, data: valid.data },
    ],
    [
      "missing kind",
      { set: valid.set, message: valid.message, data: valid.data },
    ],
    ["missing message", { set: valid.set, kind: valid.kind, data: valid.data }],
    [
      "missing data",
      { set: valid.set, kind: valid.kind, message: valid.message },
    ],
    ["non-string message", { ...valid, message: 42 }],
    ["null data", { ...valid, data: null }],
    ["array data", { ...valid, data: ["1"] }],
    ["string data", { ...valid, data: "1" }],
    ["non-number timestamp", { ...valid, timestamp: "2026-11-10" }],
  ])("%s", (_label, input) => {
    expect(UserError.from(input)).toBeUndefined()
  })

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "not_found"],
    ["a number", 42],
    ["an array", []],
    ["a function", () => undefined],
  ] as const)("non-object input: %s", (_label, input) => {
    expect(UserError.from(input)).toBeUndefined()
  })

  it("rejects another set's live error", () => {
    expect(UserError.from(OtherError.not_found`x`)).toBeUndefined()
  })

  it("ignores extra fields", () => {
    const restored = UserError.from({ ...valid, extra: 1, stack: "s" })
    expect(Object.keys(restored as object)).toEqual([
      "set",
      "kind",
      "message",
      "data",
    ])
  })
})
