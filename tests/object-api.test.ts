/**
 * Unit tests for object-based errorSet API.
 * @module tests/object-api
 */

import { afterEach, describe, expect, it } from "bun:test"
import { configure, errorSet, resetConfig } from "../src/index.ts"

describe("errorSet Object API", () => {
  type User = { id: string; name: string }

  afterEach(() => {
    resetConfig()
  })

  it("should create an error set with object syntax", () => {
    const UserError = errorSet<User>({
      name: "UserError",
      kinds: ["not_found", "suspended"],
    })
    expect(UserError).toBeDefined()
    expect(typeof UserError).toBe("function")
  })

  it("should have kinds array accessible", () => {
    const UserError = errorSet<User>({
      name: "UserError",
      kinds: ["not_found", "suspended", "invalid"],
    })
    expect(UserError.kinds).toEqual(["not_found", "suspended", "invalid"])
  })

  it("should attach kind functions for each kind", () => {
    const UserError = errorSet<User>({
      name: "UserError",
      kinds: ["not_found", "suspended"],
    })
    expect((UserError as Record<string, unknown>).not_found).toBeDefined()
    expect((UserError as Record<string, unknown>).suspended).toBeDefined()
  })

  it("should have all helper methods", () => {
    const UserError = errorSet<User>({
      name: "UserError",
      kinds: ["not_found"],
    })
    expect(typeof UserError.recover).toBe("function")
    expect(typeof UserError.inspect).toBe("function")
    expect(typeof UserError.merge).toBe("function")
    expect(typeof UserError.capture).toBe("function")
    expect(typeof UserError.captureAsync).toBe("function")
  })

  it("should create errors with template literal syntax", () => {
    const UserError = errorSet<User>({
      name: "UserError",
      kinds: ["not_found"],
    })
    const not_found = (UserError as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => { kind: string; message: string; data: User }

    const err = not_found`User ${"id"} not found`({ id: "123", name: "John" })
    expect(err.kind).toBe("not_found")
    expect(err.message).toBe("User 123 not found")
    expect(err.data.id).toBe("123")
  })

  it("should act as set-level guard", () => {
    const UserError = errorSet<User>({
      name: "UserError",
      kinds: ["not_found"],
    })
    const not_found = (UserError as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => { kind: string; message: string; data: User }

    const err = not_found`User ${"id"} not found`({ id: "123", name: "John" })
    expect(UserError(err)).toBe(true)
  })

  it("should support instanceof via Symbol.hasInstance", () => {
    const UserError = errorSet<User>({
      name: "UserError",
      kinds: ["not_found"],
    })
    const not_found = (UserError as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => { kind: string; message: string; data: User }

    const err = not_found`User ${"id"} not found`({ id: "123", name: "John" })
    expect(err instanceof UserError).toBe(true)
  })
})

describe("Object API vs Positional API Equivalence", () => {
  type User = { id: string; name: string }

  it("should produce functionally equivalent error sets", () => {
    const UserError1 = errorSet<User>("UserError", "not_found", "suspended")
    const UserError2 = errorSet<User>({
      name: "UserError",
      kinds: ["not_found", "suspended"],
    })

    expect(UserError1.kinds).toEqual(UserError2.kinds)
  })

  it("should create errors with same structure", () => {
    const UserError1 = errorSet<User>("UserError", "not_found")
    const UserError2 = errorSet<User>({
      name: "UserError",
      kinds: ["not_found"],
    })

    const not_found1 = (UserError1 as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => { kind: string; message: string; data: { id: string } }

    const not_found2 = (UserError2 as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => { kind: string; message: string; data: { id: string } }

    const err1 = not_found1`User ${"id"} not found`({ id: "123", name: "John" })
    const err2 = not_found2`User ${"id"} not found`({ id: "123", name: "John" })

    expect(err1.kind).toBe(err2.kind)
    expect(err1.message).toBe(err2.message)
    expect(err1.data).toEqual(err2.data)
  })

  it("should have guards that work on errors from either API", () => {
    const UserError1 = errorSet<User>("UserError", "not_found")
    const UserError2 = errorSet<User>({
      name: "UserError",
      kinds: ["not_found"],
    })

    const not_found1 = (UserError1 as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => { kind: string }

    const err1 = not_found1`User ${"id"} not found`({ id: "123", name: "John" })

    // Error from positional API should be recognized by object API guard
    expect(UserError2(err1)).toBe(true)
  })
})

describe("Per-Instance Configuration", () => {
  type User = { id: string; name: string }

  afterEach(() => {
    resetConfig()
  })

  it("should override global config for includeStack", () => {
    // Global config has stack disabled
    configure({ includeStack: false })

    // Instance config enables stack
    const StackError = errorSet<User>({
      name: "StackError",
      kinds: ["error"],
      config: { includeStack: true },
    })

    const errorFn = (StackError as Record<string, unknown>).error as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => Record<string, unknown>

    const err = errorFn`Error occurred`({ id: "123", name: "John" })

    // Should have stack trace despite global config
    expect("stack" in err).toBe(true)
    expect(typeof err.stack).toBe("string")
  })

  it("should not affect other error sets", () => {
    // Global config has stack disabled
    configure({ includeStack: false })

    // One error set with stack enabled
    errorSet<User>({
      name: "StackError",
      kinds: ["error"],
      config: { includeStack: true },
    })

    // Another error set without config override (uses global)
    const NoStackError = errorSet<User>({
      name: "NoStackError",
      kinds: ["error"],
    })

    const errorFn = (NoStackError as Record<string, unknown>).error as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => Record<string, unknown>

    const err = errorFn`Error occurred`({ id: "123", name: "John" })

    // Should NOT have stack trace (uses global config)
    expect("stack" in err).toBe(false)
  })

  it("should allow positional API to still work without config", () => {
    configure({ includeStack: false })

    const UserError = errorSet<User>("UserError", "not_found")
    const not_found = (UserError as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => Record<string, unknown>

    const err = not_found`User ${"id"} not found`({ id: "123", name: "John" })

    // Should NOT have stack trace
    expect("stack" in err).toBe(false)
  })
})

describe("Regression: Positional API", () => {
  type User = { id: string; name: string }

  it("should still create error sets with positional arguments", () => {
    const UserError = errorSet<User>("UserError", "not_found", "suspended")
    expect(UserError.kinds).toEqual(["not_found", "suspended"])
  })

  it("should still create errors with template literals", () => {
    const UserError = errorSet<User>("UserError", "not_found")
    const not_found = (UserError as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => { kind: string; message: string; data: { id: string } }

    const err = not_found`User ${"id"} not found`({ id: "abc", name: "Test" })
    expect(err.kind).toBe("not_found")
    expect(err.message).toBe("User abc not found")
  })

  it("should still work as guards", () => {
    const UserError = errorSet<User>("UserError", "not_found")
    const not_found = (UserError as Record<string, unknown>).not_found as (
      strings: TemplateStringsArray,
      ...keys: string[]
    ) => (data: User) => { kind: string }

    const err = not_found`User not found`({ id: "123", name: "John" })
    expect(UserError(err)).toBe(true)
    expect(
      (
        (UserError as Record<string, unknown>).not_found as (
          v: unknown
        ) => boolean
      )(err)
    ).toBe(true)
  })
})
