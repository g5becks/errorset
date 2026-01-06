/**
 * Integration tests for error chaining, real-world workflows,
 * edge cases with symbols/coercion, and tag collisions.
 * @module tests/integration
 */

import { describe, expect, it, mock } from "bun:test"
import { type Err, errorSet, isErr } from "../src/index.ts"

// =============================================================================
// Domain types for integration tests
// =============================================================================

type User = { id: string; name: string; email: string }
type Order = { orderId: string; total: number }
type Payment = { paymentId: string; amount: number }

// =============================================================================
// Error Chaining Tests (Task 030)
// =============================================================================

describe("Error Chaining", () => {
  const UserError = errorSet("UserError", [
    "not_found",
    "suspended",
    "invalid",
  ]).init<User>()

  const OrderError = errorSet("OrderError", [
    "not_found",
    "cancelled",
    "invalid",
  ]).init<Order>()

  const PaymentError = errorSet("PaymentError", [
    "failed",
    "declined",
    "timeout",
  ]).init<Payment>()

  describe("cause property preservation", () => {
    it("should preserve cause through single level", () => {
      const userErr = UserError.not_found`User ${"id"} not found`({ id: "U1" })
      const orderErr = OrderError.not_found`Order ${"orderId"} not found`(
        { orderId: "O1" },
        { cause: userErr }
      )

      expect(orderErr.cause).toBeDefined()
      expect(orderErr.cause?.kind).toBe("not_found")
      expect(orderErr.cause?.data).toEqual({ id: "U1" })
    })

    it("should preserve cause data integrity", () => {
      const userErr = UserError.suspended`User ${"id"} (${"email"}) suspended`({
        id: "U1",
        email: "test@example.com",
      })
      const orderErr = OrderError.cancelled`Order ${"orderId"} cancelled`(
        { orderId: "O1" },
        { cause: userErr }
      )

      expect(orderErr.cause?.data).toEqual({
        id: "U1",
        email: "test@example.com",
      })
      expect(orderErr.cause?.message).toBe(
        "User U1 (test@example.com) suspended"
      )
    })
  })

  describe("multi-level error chains", () => {
    it("should support three levels of chaining", () => {
      // Level 1: User error
      const userErr = UserError.not_found`User ${"id"} not found`({ id: "U1" })

      // Level 2: Order error caused by user error
      const orderErr = OrderError.not_found`Order ${"orderId"} user not found`(
        { orderId: "O1" },
        { cause: userErr }
      )

      // Level 3: Payment error caused by order error
      const paymentErr = PaymentError.failed`Payment ${"paymentId"} failed`(
        { paymentId: "P1" },
        { cause: orderErr }
      )

      // Verify chain
      expect(paymentErr.kind).toBe("failed")
      expect(paymentErr.cause?.kind).toBe("not_found")
      expect(paymentErr.cause?.cause?.kind).toBe("not_found")
    })

    it("should allow traversing the full chain", () => {
      const userErr = UserError.suspended`User ${"id"} suspended`({ id: "U1" })
      const orderErr = OrderError.cancelled`Order ${"orderId"} cancelled`(
        { orderId: "O1" },
        { cause: userErr }
      )
      const paymentErr = PaymentError.declined`Payment ${"paymentId"} declined`(
        { paymentId: "P1" },
        { cause: orderErr }
      )

      // Collect all errors in chain
      const chain: Err[] = []
      let current: Err | undefined = paymentErr
      while (current) {
        chain.push(current)
        current = current.cause
      }

      expect(chain).toHaveLength(3)
      expect(chain.map(e => e.kind)).toEqual([
        "declined",
        "cancelled",
        "suspended",
      ])
    })

    it("should maintain type safety when accessing chain", () => {
      const userErr = UserError.invalid`User ${"id"} invalid`({ id: "U1" })
      const orderErr = OrderError.invalid`Order ${"orderId"} invalid`(
        { orderId: "O1" },
        { cause: userErr }
      )

      // Type-safe access
      if (orderErr.cause && isErr(orderErr.cause)) {
        expect(orderErr.cause.kind).toBe("invalid")
        expect(typeof orderErr.cause.message).toBe("string")
        expect(typeof orderErr.cause.data).toBe("object")
      }
    })
  })

  describe("chain with mixed error sets", () => {
    it("should allow chaining errors from different sets", () => {
      const userErr = UserError.not_found`User ${"id"}`({ id: "U1" })
      const orderErr = OrderError.cancelled`Order ${"orderId"}`(
        { orderId: "O1" },
        { cause: userErr }
      )
      const paymentErr = PaymentError.timeout`Payment ${"paymentId"}`(
        { paymentId: "P1" },
        { cause: orderErr }
      )

      // Each error in chain is from different set
      expect(PaymentError(paymentErr)).toBe(true)
      expect(OrderError(paymentErr.cause)).toBe(true)
      expect(UserError(paymentErr.cause?.cause)).toBe(true)
    })
  })
})

// =============================================================================
// Real-World Workflow Tests (Task 031)
// =============================================================================

describe("Real-World Workflows", () => {
  // Repository layer errors
  const RepoError = errorSet("RepoError", [
    "not_found",
    "connection_failed",
    "constraint_violation",
  ]).init<{ table: string; id: string; message: string }>()

  // Service layer errors (domain)
  const UserServiceError = errorSet("UserServiceError", [
    "user_not_found",
    "user_suspended",
    "validation_failed",
  ]).init<User>()

  const OrderServiceError = errorSet("OrderServiceError", [
    "order_not_found",
    "insufficient_stock",
    "payment_required",
  ]).init<Order>()

  // Merged service error for handlers
  const ServiceError = UserServiceError.merge(OrderServiceError)

  describe("repository layer error creation", () => {
    it("should create repository errors with context", () => {
      const err =
        RepoError.not_found`Record in ${"table"} with id ${"id"} not found`({
          table: "users",
          id: "123",
        })

      expect(err.kind).toBe("not_found")
      expect(err.data.table).toBe("users")
      expect(err.data.id).toBe("123")
    })

    it("should support connection errors", () => {
      const err =
        RepoError.connection_failed`Database connection failed: ${"message"}`({
          message: "ECONNREFUSED",
        })

      expect(err.kind).toBe("connection_failed")
      expect(err.message).toContain("ECONNREFUSED")
    })
  })

  describe("service layer error propagation", () => {
    // Simulated repository function
    function findUser(id: string): User | typeof RepoError.Type {
      if (id === "not-exists") {
        return RepoError.not_found`Record in ${"table"} with ${"id"} not found`(
          { table: "users", id }
        )
      }
      if (id === "db-down") {
        return RepoError.connection_failed`DB error: ${"message"}`({
          message: "timeout",
        })
      }
      return { id, name: "Test User", email: "test@example.com" }
    }

    // Simulated service function
    function getUser(id: string): User | typeof UserServiceError.Type {
      const result = findUser(id)

      if (RepoError(result)) {
        // Transform repo error to service error
        if (RepoError.not_found(result)) {
          return UserServiceError.user_not_found`User ${"id"} not found`(
            { id },
            { cause: result }
          )
        }
        // Generic error handling
        return UserServiceError.validation_failed`Failed to get user ${"id"}`(
          { id },
          { cause: result }
        )
      }

      return result
    }

    it("should propagate not_found from repo to service", () => {
      const result = getUser("not-exists")

      expect(UserServiceError(result)).toBe(true)
      expect((result as Err).kind).toBe("user_not_found")
      expect((result as Err).cause?.kind).toBe("not_found")
    })

    it("should transform connection errors to validation errors", () => {
      const result = getUser("db-down")

      expect(UserServiceError(result)).toBe(true)
      expect((result as Err).kind).toBe("validation_failed")
      expect((result as Err).cause?.kind).toBe("connection_failed")
    })

    it("should return success value when no error", () => {
      const result = getUser("123")

      expect(UserServiceError(result)).toBe(false)
      expect((result as User).name).toBe("Test User")
    })
  })

  describe("handler layer error handling", () => {
    type HttpResponse = { status: number; body: unknown }

    // Simulated handler using recover
    function handleGetUser(id: string): HttpResponse | User {
      const result = ((): User | typeof UserServiceError.Type => {
        if (id === "not-found") {
          return UserServiceError.user_not_found`User ${"id"} not found`({
            id,
          })
        }
        if (id === "suspended") {
          return UserServiceError.user_suspended`User ${"id"} is suspended`({
            id,
          })
        }
        return { id, name: "Test", email: "test@test.com" }
      })()

      // Use recover to transform errors to HTTP responses
      return UserServiceError.recover(result, {
        user_not_found: () => ({ status: 404, body: { error: "Not found" } }),
        user_suspended: () => ({ status: 403, body: { error: "Suspended" } }),
        validation_failed: () => ({
          status: 400,
          body: { error: "Validation failed" },
        }),
      })
    }

    it("should return 404 for not found errors", () => {
      const response = handleGetUser("not-found") as HttpResponse
      expect(response.status).toBe(404)
    })

    it("should return 403 for suspended errors", () => {
      const response = handleGetUser("suspended") as HttpResponse
      expect(response.status).toBe(403)
    })

    it("should return user data for success", () => {
      const response = handleGetUser("123") as User
      expect(response.name).toBe("Test")
    })
  })

  describe("merged error set handling", () => {
    it("should handle errors from multiple sets", () => {
      const userErr = UserServiceError.user_not_found`User ${"id"}`({ id: "1" })
      const orderErr = OrderServiceError.order_not_found`Order ${"orderId"}`({
        orderId: "O1",
      })

      expect(ServiceError(userErr)).toBe(true)
      expect(ServiceError(orderErr)).toBe(true)
    })

    it("should have all merged kinds accessible", () => {
      expect(ServiceError.kinds).toContain("user_not_found")
      expect(ServiceError.kinds).toContain("order_not_found")
      expect(ServiceError.kinds).toHaveLength(6)
    })
  })

  describe("inspect for logging and metrics", () => {
    it("should log errors without changing flow", () => {
      const logFn = mock((_msg: string) => undefined)
      const metricFn = mock(() => undefined)

      const err = UserServiceError.user_not_found`User ${"id"} not found`({
        id: "123",
      })

      UserServiceError.inspect(err, {
        user_not_found: e => {
          logFn(`User not found: ${e.data.id}`)
          metricFn()
        },
      })

      expect(logFn).toHaveBeenCalledWith("User not found: 123")
      expect(metricFn).toHaveBeenCalledTimes(1)
    })

    it("should not log success values", () => {
      const logFn = mock(() => undefined)
      const user: User = { id: "1", name: "Test", email: "test@test.com" }

      UserServiceError.inspect(user, {
        user_not_found: () => logFn(),
      })

      expect(logFn).not.toHaveBeenCalled()
    })
  })

  describe("capture for external API calls", () => {
    const ApiError = errorSet("ApiError", [
      "network_error",
      "timeout",
      "invalid_response",
    ]).init<{ url: string; message: string }>()

    it("should capture thrown errors from external calls", () => {
      const fetchData = () => {
        throw new Error("Network unreachable")
      }

      const result = ApiError.capture(fetchData, e =>
        ApiError.network_error`API call failed: ${"message"}`({
          message: e.message,
        })
      )

      expect(ApiError(result)).toBe(true)
      expect((result as Err).kind).toBe("network_error")
      expect((result as Err).message).toContain("Network unreachable")
    })

    it("should capture async rejections", async () => {
      const fetchDataAsync = async () => {
        await Promise.resolve()
        throw new Error("Request timeout")
      }

      const result = await ApiError.captureAsync(fetchDataAsync, e =>
        ApiError.timeout`Request timed out: ${"message"}`({
          message: e.message,
        })
      )

      expect(ApiError(result)).toBe(true)
      expect((result as Err).kind).toBe("timeout")
    })
  })
})

// =============================================================================
// Symbol and Coercion Edge Cases (Task 032)
// =============================================================================

describe("Symbols and Coercion Edge Cases", () => {
  type Entity = { id: string; value: number }

  const TestError = errorSet("TestError", ["error_a", "error_b"]).init<Entity>()

  describe("nodejs.util.inspect.custom symbol", () => {
    it("should have inspect symbol on errors", () => {
      const err = TestError.error_a`Error ${"id"}`({ id: "123" })
      const inspectSymbol = Symbol.for("nodejs.util.inspect.custom")
      expect(inspectSymbol in err).toBe(true)
    })

    it("should format correctly with inspect", () => {
      const err = TestError.error_a`Error ${"id"} with value ${"value"}`({
        id: "123",
        value: 42,
      })
      const inspectSymbol = Symbol.for("nodejs.util.inspect.custom")
      const inspectFn = (err as unknown as Record<symbol, () => string>)[
        inspectSymbol
      ]
      expect(inspectFn?.()).toBe('TestError.error_a {"id":"123","value":42}')
    })

    it("should handle empty data in inspect", () => {
      // Create error with minimal data (no template holes)
      const err = TestError.error_a`Simple error`({} as Entity)
      const inspectSymbol = Symbol.for("nodejs.util.inspect.custom")
      const inspectFn = (err as unknown as Record<symbol, () => string>)[
        inspectSymbol
      ]
      expect(inspectFn?.()).toBe("TestError.error_a {}")
    })
  })

  describe("toString() on kind functions", () => {
    it("should return kind name as string", () => {
      expect(TestError.error_a.toString()).toBe("error_a")
      expect(TestError.error_b.toString()).toBe("error_b")
    })

    it("should work in string concatenation", () => {
      // biome-ignore lint/style/useTemplate: testing string concatenation
      const msg = "Kind: " + TestError.error_a
      expect(msg).toBe("Kind: error_a")
    })

    it("should work with String() constructor", () => {
      expect(String(TestError.error_a)).toBe("error_a")
    })
  })

  describe("Symbol.toPrimitive on kind functions", () => {
    it("should coerce to string in template literals", () => {
      const msg = `Kind is ${TestError.error_a}`
      expect(msg).toBe("Kind is error_a")
    })

    it("should coerce to string value", () => {
      // Use String() to trigger toPrimitive
      expect(String(TestError.error_a)).toBe("error_a")
      expect(String(TestError.error_b)).toBe("error_b")
    })

    it("should work with array join", () => {
      const kinds = [TestError.error_a, TestError.error_b]
      expect(kinds.join(", ")).toBe("error_a, error_b")
    })
  })

  describe("Symbol.iterator on error sets", () => {
    it("should iterate in definition order", () => {
      const OrderedError = errorSet("OrderedError", [
        "first",
        "second",
        "third",
      ]).init<Entity>()

      const kinds = [...OrderedError]
      expect(kinds).toEqual(["first", "second", "third"])
    })

    it("should work with for...of", () => {
      const kinds: string[] = []
      for (const kind of TestError) {
        kinds.push(kind)
      }
      expect(kinds).toEqual(["error_a", "error_b"])
    })

    it("should work with Array.from", () => {
      const kinds = Array.from(TestError as Iterable<string>)
      expect(kinds).toEqual(["error_a", "error_b"])
    })

    it("should support destructuring", () => {
      const [first, second] = TestError
      expect(first).toBe("error_a")
      expect(second).toBe("error_b")
    })
  })

  describe("Symbol.hasInstance for instanceof", () => {
    it("should return true for matching errors", () => {
      const err = TestError.error_a`Test`({} as Entity)
      expect(err instanceof TestError).toBe(true)
    })

    it("should return false for non-matching objects", () => {
      expect({} instanceof TestError).toBe(false)
    })

    it("should return false for errors from different sets", () => {
      const OtherError = errorSet("OtherError", ["other"]).init<Entity>()
      const err = OtherError.other`Test`({} as Entity)
      expect(err instanceof TestError).toBe(false)
    })
  })
})

// =============================================================================
// Tag Collision Tests (Task 033)
// =============================================================================

describe("Tag Collisions in Merged Sets", () => {
  type EntityA = { idA: string }
  type EntityB = { idB: string }

  // Both sets have "not_found" and "invalid" kinds
  const SetA = errorSet("SetA", [
    "not_found",
    "invalid",
    "unique_a",
  ]).init<EntityA>()

  const SetB = errorSet("SetB", [
    "not_found",
    "invalid",
    "unique_b",
  ]).init<EntityB>()

  const MergedSet = SetA.merge(SetB)

  describe("merged set with colliding tag names", () => {
    it("should contain both instances of colliding tags", () => {
      // Merged kinds will have duplicates
      expect(MergedSet.kinds).toEqual([
        "not_found",
        "invalid",
        "unique_a",
        "not_found",
        "invalid",
        "unique_b",
      ])
    })

    it("should match errors from both sets with colliding tags", () => {
      const errA = SetA.not_found`A ${"idA"}`({ idA: "1" })
      const errB = SetB.not_found`B ${"idB"}`({ idB: "2" })

      // Both should match the merged set
      expect(MergedSet(errA)).toBe(true)
      expect(MergedSet(errB)).toBe(true)
    })
  })

  describe("kind-level guards distinguish colliding tags", () => {
    it("should distinguish by original set's kind guard", () => {
      const errA = SetA.not_found`A ${"idA"}`({ idA: "1" })
      const errB = SetB.not_found`B ${"idB"}`({ idB: "2" })

      // Original set guards still work correctly
      expect(SetA.not_found(errA)).toBe(true)
      expect(SetA.not_found(errB)).toBe(true) // Same kind string matches

      expect(SetB.not_found(errA)).toBe(true) // Same kind string matches
      expect(SetB.not_found(errB)).toBe(true)
    })

    it("should use set-level guards to distinguish origin", () => {
      const errA = SetA.not_found`A ${"idA"}`({ idA: "1" })
      const errB = SetB.not_found`B ${"idB"}`({ idB: "2" })

      // Set-level guards distinguish by kinds in set
      expect(SetA(errA)).toBe(true)
      expect(SetA(errB)).toBe(true) // "not_found" is in SetA's kinds

      expect(SetB(errA)).toBe(true) // "not_found" is in SetB's kinds
      expect(SetB(errB)).toBe(true)
    })
  })

  describe("data access with colliding tags", () => {
    it("should preserve distinct data structures", () => {
      const errA = SetA.invalid`Invalid A: ${"idA"}`({ idA: "A1" })
      const errB = SetB.invalid`Invalid B: ${"idB"}`({ idB: "B2" })

      // Data is preserved correctly for each
      expect(errA.data).toEqual({ idA: "A1" })
      expect(errB.data).toEqual({ idB: "B2" })

      // Messages are distinct
      expect(errA.message).toBe("Invalid A: A1")
      expect(errB.message).toBe("Invalid B: B2")
    })

    it("should handle recover with colliding kinds", () => {
      const errA = SetA.not_found`A ${"idA"}`({ idA: "1" })

      // Recover works with the original set
      const result = SetA.recover(errA, {
        not_found: e => `recovered: ${e.data.idA}`,
        invalid: () => "invalid",
        unique_a: () => "unique",
      })

      expect(result).toBe("recovered: 1")
    })
  })

  describe("unique tags remain distinct", () => {
    it("should correctly identify unique tags", () => {
      const errUniqueA = SetA.unique_a`Unique A ${"idA"}`({ idA: "1" })
      const errUniqueB = SetB.unique_b`Unique B ${"idB"}`({ idB: "2" })

      // Set-level guards correctly identify unique tags
      expect(SetA(errUniqueA)).toBe(true)
      expect(SetA(errUniqueB)).toBe(false)

      expect(SetB(errUniqueA)).toBe(false)
      expect(SetB(errUniqueB)).toBe(true)

      // Merged set accepts both
      expect(MergedSet(errUniqueA)).toBe(true)
      expect(MergedSet(errUniqueB)).toBe(true)
    })

    it("should use kind guards for unique tags", () => {
      const errUniqueA = SetA.unique_a`Test`({ idA: "1" })
      const errUniqueB = SetB.unique_b`Test`({ idB: "2" })

      expect(SetA.unique_a(errUniqueA)).toBe(true)
      expect(SetA.unique_a(errUniqueB)).toBe(false)

      expect(SetB.unique_b(errUniqueA)).toBe(false)
      expect(SetB.unique_b(errUniqueB)).toBe(true)
    })
  })
})
