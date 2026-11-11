/**
 * Edge cases pinned by tests (TASK-074, audit Q6).
 * The HasDuplicates size limit is covered in tests/types/large-sets.test-d.ts.
 * @module tests/edge-cases
 */

import { afterEach, describe, expect, it } from "bun:test"
import { configure, errorSet, resetConfig } from "../src/index.ts"

type User = { id: string; name: string }
const UserError = errorSet("EdgeCases.UserError", ["a", "b"]).init<User>()
const user: User = { id: "u1", name: "Ann" }

afterEach(() => {
  resetConfig()
})

describe("template keys", () => {
  it("a key repeated in the template renders each time and is stored once", () => {
    const err = UserError.a`${"id"} and again ${"id"} (${"name"})`(user)
    expect(err.message).toBe("u1 and again u1 (Ann)")
    expect(err.data).toEqual({ id: "u1", name: "Ann" })
    expect(Object.keys(err.data)).toEqual(["id", "name"])
  })

  it("a key missing from the entity at runtime (untyped call) renders undefined", () => {
    type Creator = (entity: object) => { message: string; data: object }
    const untyped = UserError.a as unknown as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => Creator
    const err = untyped`User ${"id"} has ${"missing"}`({ id: "u1" })
    expect(err.message).toBe("User u1 has undefined")
    // The key is present with an undefined value (and so is dropped by JSON)
    expect(Object.keys(err.data)).toEqual(["id", "missing"])
    expect(JSON.stringify(err.data)).toBe('{"id":"u1"}')
  })
})

describe("template detection", () => {
  it("a kind guard called with an array that has a raw property returns false", () => {
    const lookalike = Object.assign(["x"], { raw: ["x"] })
    expect(UserError.a(lookalike as unknown)).toBe(false)
    expect(UserError.a(Object.assign([], { raw: [] }) as unknown)).toBe(false)
  })

  it("guards stay guards after templates were seen (call-site caches)", () => {
    expect(UserError(UserError.a`x ${"id"}`(user))).toBe(true)
    expect(UserError(UserError.a`static`)).toBe(true)
    for (const value of [undefined, null, [], {}, "a", 0]) {
      expect(UserError.a(value)).toBe(false)
    }
  })

  it("only frozen strings arrays are treated as templates", () => {
    // Real TemplateStringsArrays are frozen (with a frozen raw); a hand-made frozen
    // look-alike is indistinguishable and is treated as a template
    const frozen = Object.freeze(
      Object.assign(["static"], { raw: Object.freeze(["static"]) })
    )
    const created = UserError.a(frozen as never) as unknown
    expect(UserError.a(created)).toBe(true)
  })
})

describe("stack capture", () => {
  it("includeStack without Error.captureStackTrace creates errors without a stack", () => {
    const original = Error.captureStackTrace
    Reflect.deleteProperty(Error, "captureStackTrace")
    try {
      configure({ includeStack: true })
      const err = UserError.a`x ${"id"}`(user)
      const noContext = UserError.b`static`
      expect("stack" in err).toBe(false)
      expect("stack" in noContext).toBe(false)
      expect(Object.keys(err)).toEqual(["set", "kind", "message", "data"])
      expect(UserError(err)).toBe(true)
    } finally {
      Error.captureStackTrace = original
    }
  })

  it("restores Error.stackTraceLimit after capturing", () => {
    const limit = Error.stackTraceLimit
    configure({ includeStack: true, stackDepth: 3 })
    UserError.a`x ${"id"}`(user)
    expect(Error.stackTraceLimit).toBe(limit)
  })
})
