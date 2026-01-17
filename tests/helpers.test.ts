/**
 * Unit tests for helper methods: recover, inspect, merge, capture.
 * @module tests/helpers
 */

import { describe, expect, it, mock } from "bun:test"
import {
  createSetGuardWithKinds,
  type Err,
  errorSet,
  merge,
} from "../src/index.ts"

// Pre-define regex at module level
const noHandlerRegex = /No handler found for error kind: suspended/

describe("recover Method", () => {
  type User = { id: string; name: string }

  const UserError = errorSet("UserError", [
    "not_found",
    "suspended",
  ]).init<User>()

  it("should return success value unchanged if not an error", () => {
    const user = { id: "123", name: "John" }
    const result = UserError.recover(user, {
      _: () => ({ id: "default", name: "Guest" }),
    })
    expect(result).toBe(user)
  })

  it("should apply specific handler for matching kind", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    const result = UserError.recover(err, {
      not_found: () => ({ id: "guest", name: "Guest User" }),
      suspended: () => ({ id: "blocked", name: "Blocked User" }),
    })
    expect(result).toEqual({ id: "guest", name: "Guest User" })
  })

  it("should apply catch-all handler when no specific match", () => {
    const err = UserError.suspended`Account ${"id"} suspended`({ id: "123" })
    const result = UserError.recover(err, {
      not_found: () => ({ id: "guest", name: "Guest" }),
      _: () => ({ id: "default", name: "Default User" }),
    })
    expect(result).toEqual({ id: "default", name: "Default User" })
  })

  it("should throw if no matching handler found", () => {
    const err = UserError.suspended`Account ${"id"} suspended`({ id: "123" })
    expect(() => {
      UserError.recover(err, {
        not_found: () => ({ id: "guest", name: "Guest" }),
      })
    }).toThrow(noHandlerRegex)
  })

  it("should pass error to handler", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    const result = UserError.recover(err, {
      not_found: e => ({ id: e.data.id ?? "unknown", name: "Recovered" }),
    })
    expect(result).toEqual({ id: "123", name: "Recovered" })
  })
})

describe("inspect Method", () => {
  type User = { id: string; name: string }

  const UserError = errorSet("UserError", [
    "not_found",
    "suspended",
  ]).init<User>()

  it("should do nothing if value is not an error", () => {
    const handler = mock(() => undefined)
    const user = { id: "123", name: "John" }
    UserError.inspect(user, {
      not_found: handler,
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it("should call matching handler for error kind", () => {
    const handler = mock(() => undefined)
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    UserError.inspect(err, {
      not_found: handler,
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("should not call handler for non-matching kinds", () => {
    const notFoundHandler = mock(() => undefined)
    const suspendedHandler = mock(() => undefined)
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    UserError.inspect(err, {
      not_found: notFoundHandler,
      suspended: suspendedHandler,
    })
    expect(notFoundHandler).toHaveBeenCalledTimes(1)
    expect(suspendedHandler).not.toHaveBeenCalled()
  })

  it("should return void", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    const result = UserError.inspect(err, {
      not_found: () => undefined,
    })
    expect(result).toBeUndefined()
  })

  it("should not call any handler if none match", () => {
    const err = UserError.suspended`Account ${"id"} suspended`({ id: "123" })
    const handler = mock(() => undefined)
    UserError.inspect(err, {
      not_found: handler,
    })
    expect(handler).not.toHaveBeenCalled()
  })
})

describe("merge Method", () => {
  type User = { id: string; name: string }
  type Order = { orderId: string; total: number }

  const UserError = errorSet("UserError", [
    "not_found",
    "suspended",
  ]).init<User>()
  const OrderError = errorSet("OrderError", [
    "cancelled",
    "expired",
  ]).init<Order>()

  it("should combine kinds from both error sets", () => {
    const ServiceError = UserError.merge(OrderError)
    expect(ServiceError.kinds).toEqual([
      "not_found",
      "suspended",
      "cancelled",
      "expired",
    ])
  })

  it("should check errors from either set", () => {
    const ServiceError = UserError.merge(OrderError)

    const userErr = UserError.not_found`User ${"id"} not found`({ id: "123" })
    const orderErr = OrderError.cancelled`Order ${"orderId"} cancelled`({
      orderId: "ORD-1",
    })

    expect(ServiceError(userErr)).toBe(true)
    expect(ServiceError(orderErr)).toBe(true)
  })

  it("should leave original sets unchanged", () => {
    const originalUserKinds = [...UserError.kinds]
    const originalOrderKinds = [...OrderError.kinds]

    UserError.merge(OrderError)

    expect(UserError.kinds).toEqual(originalUserKinds)
    expect(OrderError.kinds).toEqual(originalOrderKinds)
  })
})

describe("merge Function (Standalone)", () => {
  type User = { id: string }
  type Order = { orderId: string }

  it("should merge two guards with createSetGuardWithKinds", () => {
    const guard1 = createSetGuardWithKinds<"a" | "b", User>(["a", "b"])
    const guard2 = createSetGuardWithKinds<"c" | "d", Order>(["c", "d"])
    const merged = merge(guard1, guard2)
    expect(merged.kinds).toEqual(["a", "b", "c", "d"])
  })
})

describe("capture Method", () => {
  type DbContext = { query: string; message: string }

  const DbError = errorSet("DbError", [
    "connection",
    "query_failed",
  ]).init<DbContext>()

  it("should return function result if no error thrown", () => {
    const result = DbError.capture(
      () => 42,
      () => DbError.query_failed`Query failed`
    )
    expect(result).toBe(42)
  })

  it("should catch thrown errors and map them", () => {
    const result = DbError.capture(
      () => {
        throw new Error("Connection refused")
      },
      e =>
        DbError.query_failed`Query failed: ${"message"}`({
          message: e.message,
        })
    )
    expect((result as Err<string, Partial<DbContext>>).kind).toBe(
      "query_failed"
    )
    expect((result as Err<string, Partial<DbContext>>).message).toBe(
      "Query failed: Connection refused"
    )
  })

  it("should convert non-Error throws to Error objects", () => {
    const throwNonError = () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "string error" as unknown as Error
    }
    const result = DbError.capture(throwNonError, e =>
      DbError.query_failed`Query failed: ${"message"}`({
        message: e.message,
      })
    )
    expect((result as Err<string, Partial<DbContext>>).kind).toBe(
      "query_failed"
    )
    expect((result as Err<string, Partial<DbContext>>).message).toBe(
      "Query failed: string error"
    )
  })
})

describe("captureAsync Method", () => {
  type DbContext = { query: string; message: string }

  const DbError = errorSet("DbError", [
    "connection",
    "query_failed",
  ]).init<DbContext>()

  it("should return async function result if no error thrown", async () => {
    const result = await DbError.captureAsync(
      async () => {
        await Promise.resolve()
        return 42
      },
      () => DbError.query_failed`Query failed`
    )
    expect(result).toBe(42)
  })

  it("should catch rejected promises and map them", async () => {
    const result = await DbError.captureAsync(
      async () => {
        await Promise.resolve()
        throw new Error("Timeout")
      },
      e =>
        DbError.query_failed`Query failed: ${"message"}`({
          message: e.message,
        })
    )
    expect((result as Err<string, Partial<DbContext>>).kind).toBe(
      "query_failed"
    )
    expect((result as Err<string, Partial<DbContext>>).message).toBe(
      "Query failed: Timeout"
    )
  })

  it("should convert non-Error rejections to Error objects", async () => {
    const throwNonError = async () => {
      await Promise.resolve()
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 404 as unknown as Error
    }
    const result = await DbError.captureAsync(throwNonError, e =>
      DbError.query_failed`Query failed: ${"message"}`({
        message: e.message,
      })
    )
    expect((result as Err<string, Partial<DbContext>>).kind).toBe(
      "query_failed"
    )
    expect((result as Err<string, Partial<DbContext>>).message).toBe(
      "Query failed: 404"
    )
  })
})
