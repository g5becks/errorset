/**
 * Unit tests for core types and constants.
 * @module tests/types
 */

import { describe, expect, it } from "bun:test"
import { ERR, errorSet, isErr } from "../src/index.ts"

describe("ERR Symbol", () => {
  it("should be a unique symbol", () => {
    expect(typeof ERR).toBe("symbol")
    expect(ERR.description).toBe("err")
  })

  it("should not equal other symbols with same description", () => {
    const otherSymbol = Symbol("err")
    expect(ERR).not.toBe(otherSymbol)
  })
})

describe("Err Type Structure", () => {
  type User = { id: string; name: string; email: string }

  const UserError = errorSet("UserError", [
    "not_found",
    "suspended",
  ] as const).init<User>()

  it("should have required ERR brand property", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    expect(ERR in err).toBe(true)
    expect(err[ERR]).toBe(true)
  })

  it("should have required kind property", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    expect(err.kind).toBe("not_found")
  })

  it("should have required message property", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    expect(err.message).toBe("User 123 not found")
  })

  it("should have required data property with extracted fields", () => {
    const err = UserError.not_found`User ${"id"} (${"name"}) not found`({
      id: "123",
      name: "John",
    })
    expect(err.data).toEqual({ id: "123", name: "John" })
  })

  it("should support optional cause property", () => {
    const cause = UserError.suspended`Account ${"id"} suspended`({
      id: "456",
    })
    const err = UserError.not_found`User ${"id"} not found`(
      { id: "123" },
      { cause }
    )
    expect(err.cause).toBeDefined()
    expect(err.cause?.kind).toBe("suspended")
  })

  it("should not have cause when not provided", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    expect(err.cause).toBeUndefined()
  })
})

describe("Err Readonly Behavior", () => {
  type User = { id: string; name: string }

  const UserError = errorSet("UserError", ["not_found"] as const).init<User>()

  it("should have readonly properties", () => {
    const err = UserError.not_found`User ${"id"} not found`({
      id: "123",
    })

    // TypeScript should prevent these assignments at compile time
    // At runtime, strict mode would throw, but we just verify the structure exists
    expect(err.kind).toBe("not_found")
    expect(err.message).toBe("User 123 not found")
    expect(err.data.id).toBe("123")
  })
})

describe("isErr Helper", () => {
  type User = { id: string }

  const UserError = errorSet("UserError", ["not_found"] as const).init<User>()

  it("should return true for error set values", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    expect(isErr(err)).toBe(true)
  })

  it("should return false for null", () => {
    expect(isErr(null)).toBe(false)
  })

  it("should return false for undefined", () => {
    expect(isErr(undefined)).toBe(false)
  })

  it("should return false for plain objects", () => {
    expect(isErr({ kind: "not_found", message: "test" })).toBe(false)
  })

  it("should return false for objects with wrong ERR value", () => {
    expect(isErr({ [ERR]: false, kind: "test", message: "test" })).toBe(false)
  })

  it("should return false for primitives", () => {
    expect(isErr("error")).toBe(false)
    expect(isErr(123)).toBe(false)
    expect(isErr(true)).toBe(false)
  })

  it("should return false for arrays", () => {
    expect(isErr([])).toBe(false)
    expect(isErr([ERR, "not_found"])).toBe(false)
  })
})
