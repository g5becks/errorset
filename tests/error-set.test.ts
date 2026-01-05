/**
 * Unit tests for errorSet factory function.
 * @module tests/error-set
 */

import { describe, expect, it } from "bun:test"
import { errorSet } from "../src/index.ts"

describe("errorSet Factory", () => {
  type User = { id: string; name: string; email: string }

  it("should create an error set with given name and kinds", () => {
    const UserError = errorSet<User>("UserError", "not_found", "suspended")
    expect(UserError).toBeDefined()
    expect(typeof UserError).toBe("function")
  })

  it("should attach kind functions for each kind", () => {
    const UserError = errorSet<User>("UserError", "not_found", "suspended")
    expect((UserError as Record<string, unknown>).not_found).toBeDefined()
    expect((UserError as Record<string, unknown>).suspended).toBeDefined()
  })

  it("should have kinds array accessible", () => {
    const UserError = errorSet<User>("UserError", "not_found", "suspended")
    expect(UserError.kinds).toEqual(["not_found", "suspended"])
  })
})

describe("errorSet as Set Guard", () => {
  type User = { id: string; name: string }

  const UserError = errorSet<User>("UserError", "not_found", "suspended")
  const not_found = (UserError as Record<string, unknown>).not_found as (
    strings: TemplateStringsArray,
    ...keys: string[]
  ) => (data: User) => { kind: string; message: string; data: User }

  it("should act as callable set-level guard", () => {
    const err = not_found`User ${"id"} not found`({ id: "123", name: "John" })
    expect(UserError(err)).toBe(true)
  })

  it("should return false for non-errors", () => {
    expect(UserError({ id: "123" })).toBe(false)
    expect(UserError(null)).toBe(false)
    expect(UserError(undefined)).toBe(false)
  })

  it("should support instanceof via Symbol.hasInstance", () => {
    const err = not_found`User ${"id"} not found`({ id: "123", name: "John" })
    expect(err instanceof UserError).toBe(true)
  })

  it("should return false for instanceof with non-errors", () => {
    expect({} instanceof UserError).toBe(false)
  })
})

describe("errorSet Kind Functions", () => {
  type Order = { orderId: string; total: number }

  const OrderError = errorSet<Order>("OrderError", "cancelled", "expired")
  const cancelled = (OrderError as Record<string, unknown>).cancelled as (
    strings: TemplateStringsArray,
    ...keys: string[]
  ) => (data: Order) => { kind: string; message: string; data: Order }
  const expired = (OrderError as Record<string, unknown>).expired as (
    value: unknown
  ) => boolean

  it("should create errors with template literal syntax", () => {
    const err = cancelled`Order ${"orderId"} was cancelled`({
      orderId: "ORD-123",
      total: 100,
    })
    expect(err.kind).toBe("cancelled")
    expect(err.message).toBe("Order ORD-123 was cancelled")
    expect(err.data.orderId).toBe("ORD-123")
  })

  it("should act as kind-level guard", () => {
    const err = cancelled`Order cancelled`({ orderId: "ORD-123", total: 100 })
    expect(
      (
        (OrderError as Record<string, unknown>).cancelled as (
          v: unknown
        ) => boolean
      )(err)
    ).toBe(true)
    expect(expired(err)).toBe(false)
  })

  it("should return false for null when used as guard", () => {
    const cancelledGuard = (OrderError as Record<string, unknown>)
      .cancelled as (v: unknown) => boolean
    expect(cancelledGuard(null)).toBe(false)
  })

  it("should return false for undefined when used as guard", () => {
    const cancelledGuard = (OrderError as Record<string, unknown>)
      .cancelled as (v: unknown) => boolean
    expect(cancelledGuard(undefined)).toBe(false)
  })

  it("should return false for primitives when used as guard", () => {
    const cancelledGuard = (OrderError as Record<string, unknown>)
      .cancelled as (v: unknown) => boolean
    expect(cancelledGuard("string")).toBe(false)
    expect(cancelledGuard(123)).toBe(false)
  })

  it("should return false for plain objects when used as guard", () => {
    const cancelledGuard = (OrderError as Record<string, unknown>)
      .cancelled as (v: unknown) => boolean
    expect(cancelledGuard({ kind: "cancelled" })).toBe(false)
  })

  it("should have string coercion support", () => {
    const cancelledFn = (OrderError as Record<string, unknown>).cancelled
    expect(String(cancelledFn)).toBe("cancelled")
    // biome-ignore lint/style/useTemplate: testing coercion
    expect("Error: " + cancelledFn).toBe("Error: cancelled")
  })
})

describe("errorSet Iterator", () => {
  type User = { id: string }

  const UserError = errorSet<User>(
    "UserError",
    "not_found",
    "suspended",
    "invalid"
  )

  it("should support for...of iteration", () => {
    const kinds: string[] = []
    for (const kind of UserError) {
      kinds.push(kind)
    }
    expect(kinds).toEqual(["not_found", "suspended", "invalid"])
  })

  it("should support spread syntax", () => {
    const kinds = [...UserError]
    expect(kinds).toEqual(["not_found", "suspended", "invalid"])
  })

  it("should work with Array.from()", () => {
    const kinds = Array.from(UserError as Iterable<string>)
    expect(kinds).toEqual(["not_found", "suspended", "invalid"])
  })
})

describe("errorSet Type Helper", () => {
  type User = { id: string }

  const UserError = errorSet<User>("UserError", "not_found")

  it("should have Type property for type exports", () => {
    // Type property exists but is undefined at runtime
    // It's used for: export type UserError = typeof UserError.Type
    expect("Type" in UserError).toBe(true)
    expect(UserError.Type).toBeUndefined()
  })
})

describe("errorSet Helper Methods", () => {
  type User = { id: string; name: string }

  const UserError = errorSet<User>("UserError", "not_found", "suspended")

  it("should have recover method", () => {
    expect(typeof UserError.recover).toBe("function")
  })

  it("should have inspect method", () => {
    expect(typeof UserError.inspect).toBe("function")
  })

  it("should have merge method", () => {
    expect(typeof UserError.merge).toBe("function")
  })

  it("should have capture method", () => {
    expect(typeof UserError.capture).toBe("function")
  })

  it("should have captureAsync method", () => {
    expect(typeof UserError.captureAsync).toBe("function")
  })
})

describe("errorSet Custom Inspect", () => {
  type User = { id: string; name: string }

  const UserError = errorSet<User>("UserError", "not_found")
  const not_found = (UserError as Record<string, unknown>).not_found as (
    strings: TemplateStringsArray,
    ...keys: string[]
  ) => (data: User) => Record<string | symbol, unknown>

  it("should have custom inspect symbol for Node.js debuggers", () => {
    const err = not_found`User ${"id"} not found`({ id: "123", name: "John" })
    const inspectSymbol = Symbol.for("nodejs.util.inspect.custom")
    expect(inspectSymbol in err).toBe(true)
    expect((err[inspectSymbol] as () => string)()).toBe(
      'UserError.not_found {"id":"123"}'
    )
  })
})
