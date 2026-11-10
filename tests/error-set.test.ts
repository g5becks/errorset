/**
 * Unit tests for errorSet factory function.
 * @module tests/error-set
 */

import { describe, expect, it } from "bun:test"
import { errorSet, isErr } from "../src/index.ts"
import { errCause } from "./support/err-cause.ts"

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
      errorSet("BadError", kinds as any).init()
    }).toThrow('Duplicate kind "not_found" in error set "BadError"')
  })

  it("should throw error for adjacent duplicate kinds", () => {
    const kinds = ["a", "a"]
    expect(() => {
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

// Folded in from the former tests/playground.test.ts (TASK-050)
describe("errorSet no-context (callable) errors", () => {
  type BackupContext = {
    bucket: string
    path: string
    message: string
  }

  const BackupError = errorSet("BackupError", [
    "config_invalid",
    "upload_failed",
    "download_failed",
  ]).init<BackupContext>()

  it("should allow direct use of template literal without calling", () => {
    // New simplified syntax - no ({}) needed
    const err = BackupError.config_invalid`S3 configuration is required`

    expect(err.kind).toBe("config_invalid")
    expect(err.message).toBe("S3 configuration is required")
    expect(err.data).toEqual({})
    expect(isErr(err)).toBe(true)
  })

  it("should allow calling with cause option", () => {
    const causeErr = BackupError.download_failed`Download failed`
    const err = BackupError.config_invalid`S3 configuration is required`({
      cause: causeErr,
    })

    expect(err.kind).toBe("config_invalid")
    expect(err.message).toBe("S3 configuration is required")
    expect(errCause(err.cause).kind).toBe("download_failed")
    expect(isErr(err)).toBe(true)

    // Verify the error created via call has its own inspect function
    const inspectSymbol = Symbol.for("nodejs.util.inspect.custom")
    const inspectFn = (err as unknown as Record<symbol, () => string>)[
      inspectSymbol
    ]
    expect(inspectFn?.()).toBe("BackupError.config_invalid {}")
  })

  it("should still work with template holes and entity data", () => {
    // Traditional syntax with data
    const err = BackupError.upload_failed`Upload to ${"bucket"} failed`({
      bucket: "my-bucket",
    })

    expect(err.kind).toBe("upload_failed")
    expect(err.message).toBe("Upload to my-bucket failed")
    expect(err.data).toEqual({ bucket: "my-bucket" })
    expect(isErr(err)).toBe(true)
  })

  it("isErr should now work on callable errors (functions)", () => {
    const err = BackupError.config_invalid`Test error`
    // The callable error is a function with ERR property
    expect(typeof err).toBe("function")
    expect(isErr(err)).toBe(true)
  })

  it("should support set-level guard on callable errors", () => {
    const err = BackupError.config_invalid`Test`
    expect(BackupError(err)).toBe(true)
  })

  it("should support kind-level guard on callable errors", () => {
    const err = BackupError.config_invalid`Test`
    expect(BackupError.config_invalid(err)).toBe(true)
    expect(BackupError.upload_failed(err)).toBe(false)
  })

  it("should support instanceof on callable errors", () => {
    const err = BackupError.config_invalid`Test`
    expect(err instanceof BackupError).toBe(true)
  })
})
