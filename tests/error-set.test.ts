/**
 * Unit tests for errorSet factory function.
 * @module tests/error-set
 */

import { describe, expect, it } from "bun:test"
import { errorSet } from "../src/index.ts"

describe("errorSet Factory", () => {
  type User = { id: string; name: string; email: string }

  it("should create an error set with given name and kinds", () => {
    const UserError = errorSet("UserError", [
      "not_found",
      "suspended",
    ]).init<User>()
    expect(UserError).toBeDefined()
    expect(typeof UserError).toBe("function")
  })

  it("should attach kind functions for each kind", () => {
    const UserError = errorSet("UserError", [
      "not_found",
      "suspended",
    ]).init<User>()
    expect(UserError.not_found).toBeDefined()
    expect(UserError.suspended).toBeDefined()
  })

  it("should have kinds array accessible", () => {
    const UserError = errorSet("UserError", [
      "not_found",
      "suspended",
    ]).init<User>()
    expect(UserError.kinds).toEqual(["not_found", "suspended"])
  })

  it("should throw error for duplicate kinds", () => {
    // Runtime validation for JS consumers or edge cases where types are bypassed
    const kinds = ["not_found", "invalid", "not_found"]
    expect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing runtime validation
      errorSet("BadError", kinds as any).init()
    }).toThrow('Duplicate kind "not_found" in error set "BadError"')
  })

  it("should throw error for adjacent duplicate kinds", () => {
    const kinds = ["a", "a"]
    expect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing runtime validation
      errorSet("BadError", kinds as any).init()
    }).toThrow('Duplicate kind "a" in error set "BadError"')
  })
})

describe("errorSet as Set Guard", () => {
  type User = { id: string; name: string }

  const UserError = errorSet("UserError", [
    "not_found",
    "suspended",
  ]).init<User>()

  it("should act as callable set-level guard", () => {
    const err = UserError.not_found`User ${"id"} not found`({
      id: "123",
    })
    expect(UserError(err)).toBe(true)
  })

  it("should return false for non-errors", () => {
    expect(UserError({ id: "123" })).toBe(false)
    expect(UserError(null)).toBe(false)
    expect(UserError(undefined)).toBe(false)
  })

  it("should support instanceof via Symbol.hasInstance", () => {
    const err = UserError.not_found`User ${"id"} not found`({
      id: "123",
    })
    expect(err instanceof UserError).toBe(true)
  })

  it("should return false for instanceof with non-errors", () => {
    expect({} instanceof UserError).toBe(false)
  })
})

describe("errorSet Kind Functions", () => {
  type Order = { orderId: string; total: number }

  const OrderError = errorSet("OrderError", [
    "cancelled",
    "expired",
  ]).init<Order>()

  it("should create errors with template literal syntax", () => {
    const err = OrderError.cancelled`Order ${"orderId"} was cancelled`({
      orderId: "ORD-123",
    })
    expect(err.kind).toBe("cancelled")
    expect(err.message).toBe("Order ORD-123 was cancelled")
    expect(err.data.orderId).toBe("ORD-123")
  })

  it("should act as kind-level guard", () => {
    const err = OrderError.cancelled`Order ${"orderId"} cancelled`({
      orderId: "ORD-123",
    })
    expect(OrderError.cancelled(err)).toBe(true)
    expect(OrderError.expired(err)).toBe(false)
  })

  it("should return false for null when used as guard", () => {
    expect(OrderError.cancelled(null)).toBe(false)
  })

  it("should return false for undefined when used as guard", () => {
    expect(OrderError.cancelled(undefined)).toBe(false)
  })

  it("should return false for primitives when used as guard", () => {
    expect(OrderError.cancelled("string")).toBe(false)
    expect(OrderError.cancelled(123)).toBe(false)
  })

  it("should return false for plain objects when used as guard", () => {
    expect(OrderError.cancelled({ kind: "cancelled" })).toBe(false)
  })

  it("should have string coercion support", () => {
    expect(String(OrderError.cancelled)).toBe("cancelled")
    // biome-ignore lint/style/useTemplate: testing coercion
    expect("Error: " + OrderError.cancelled).toBe("Error: cancelled")
  })
})

describe("errorSet Iterator", () => {
  type User = { id: string }

  const UserError = errorSet("UserError", [
    "not_found",
    "suspended",
    "invalid",
  ]).init<User>()

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

  const UserError = errorSet("UserError", ["not_found"]).init<User>()

  it("should have Type property for type exports", () => {
    // Type property exists but is undefined at runtime
    // It's used for: export type UserError = typeof UserError.Type
    expect("Type" in UserError).toBe(true)
    expect(UserError.Type).toBeUndefined()
  })
})

describe("errorSet Helper Methods", () => {
  type User = { id: string; name: string }

  const UserError = errorSet("UserError", [
    "not_found",
    "suspended",
  ]).init<User>()

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

  const UserError = errorSet("UserError", ["not_found"]).init<User>()

  it("should have custom inspect symbol for Node.js debuggers", () => {
    const err = UserError.not_found`User ${"id"} not found`({
      id: "123",
    })
    const inspectSymbol = Symbol.for("nodejs.util.inspect.custom")
    expect(inspectSymbol in err).toBe(true)
    // Cast to access the symbol property
    const errWithInspect = err as unknown as Record<
      symbol,
      (() => string) | undefined
    >
    const inspectFn = errWithInspect[inspectSymbol]
    expect(inspectFn?.()).toBe('UserError.not_found {"id":"123"}')
  })
})
