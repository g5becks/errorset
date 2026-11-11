/**
 * Type tests for errorset (expect-type), checked by the project's tsc.
 * These tests verify that TypeScript type inference works correctly.
 */

import { expectTypeOf } from "expect-type"
import {
  type Config,
  configure,
  type Err,
  type ErrorSetConfig,
  errorSet,
  type HasDuplicates,
  isErr,
  type KindFunction,
  type NoContextErr,
  type NoDuplicates,
} from "../../src/index.ts"

// =============================================================================
// Domain types for testing
// =============================================================================

type User = {
  id: string
  name: string
  email: string
}

type Order = {
  orderId: string
  total: number
  status: "pending" | "paid" | "shipped"
}

// =============================================================================
// errorSet creation - builder API
// =============================================================================

const UserError = errorSet("UserError", [
  "not_found",
  "suspended",
  "invalid",
]).init<User>()

// The error set should be callable (set-level guard)
expectTypeOf(UserError({} as unknown)).toEqualTypeOf<boolean>()

// The error set should have kinds array
expectTypeOf(UserError.kinds).toExtend<readonly string[]>()

// The error set should have helper methods
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectTypeOf(UserError.recover).toExtend<Function>()
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectTypeOf(UserError.inspect).toExtend<Function>()
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectTypeOf(UserError.merge).toExtend<Function>()
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectTypeOf(UserError.capture).toExtend<Function>()
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectTypeOf(UserError.captureAsync).toExtend<Function>()

// =============================================================================
// errorSet creation - builder API with config
// =============================================================================

const OrderError = errorSet("OrderError", [
  "cancelled",
  "payment_failed",
  "out_of_stock",
]).init<Order>()

// Should produce same shape
expectTypeOf(OrderError({} as unknown)).toEqualTypeOf<boolean>()
expectTypeOf(OrderError.kinds).toExtend<readonly string[]>()

// Builder API with config
const VerboseError = errorSet("VerboseError", ["error"]).init<User>({
  includeStack: true,
  includeTimestamp: true,
})

expectTypeOf(VerboseError({} as unknown)).toEqualTypeOf<boolean>()

// =============================================================================
// Kind function access and error creation
// =============================================================================

// Access kind function directly (static property)
const notFoundFn = UserError.not_found
expectTypeOf(notFoundFn).toExtend<KindFunction<"not_found", User>>()

// Create error using kind function
const user: User = { id: "123", name: "John", email: "john@example.com" }

// Template literal creates an error
const err = UserError.not_found`User ${"id"} not found`(user)
expectTypeOf(err).toExtend<Err<"not_found", { id: string }>>()

// Template holes must be keys of the entity type
// @ts-expect-error - "nope" is not a key of User
expectTypeOf(UserError.not_found`User ${"nope"} not found`).toBeFunction()
expectTypeOf(err.kind).toEqualTypeOf<"not_found">()
expectTypeOf(err.message).toEqualTypeOf<string>()
expectTypeOf(err.data).toExtend<{ id: string }>()

// =============================================================================
// Err type structure
// =============================================================================

// Create a mock error to test the Err type
declare const mockErr: Err<"not_found", { id: string }>

expectTypeOf(mockErr.kind).toEqualTypeOf<"not_found">()
expectTypeOf(mockErr.message).toEqualTypeOf<string>()
expectTypeOf(mockErr.data).toEqualTypeOf<{ id: string }>()
// ES2022 cause semantics (0.4.0): any value, narrowed by the caller
expectTypeOf(mockErr.cause).toEqualTypeOf<unknown>()

// =============================================================================
// isErr universal guard
// =============================================================================

declare const unknownValue: unknown

if (isErr(unknownValue)) {
  expectTypeOf(unknownValue.kind).toEqualTypeOf<string>()
  expectTypeOf(unknownValue.message).toEqualTypeOf<string>()
  expectTypeOf(unknownValue.data).toExtend<Record<string, unknown>>()
}

// =============================================================================
// Set-level guard type narrowing
// =============================================================================

// Errors carry their set name; a result type names the set it comes from (0.4.0)
type GetUserResult =
  | User
  | Err<"not_found" | "suspended", Partial<User>, "UserError">
declare const userResult: GetUserResult

if (UserError(userResult)) {
  // After guard, should be an error
  expectTypeOf(userResult.kind).toExtend<string>()
  expectTypeOf(userResult.message).toEqualTypeOf<string>()
  expectTypeOf(userResult.data).toExtend<Partial<User>>()
}

// =============================================================================
// recover helper
// =============================================================================

// Test recover with proper typing
const recovered = UserError.recover(userResult, {
  not_found: () =>
    ({ id: "guest", name: "Guest", email: "guest@example.com" }) as User,
  suspended: () =>
    ({
      id: "suspended",
      name: "Suspended",
      email: "suspended@example.com",
    }) as User,
  invalid: () =>
    ({ id: "invalid", name: "Invalid", email: "invalid@example.com" }) as User,
})

expectTypeOf(recovered).toExtend<User>()

// Catch-all handler
const recoveredWithCatchAll = UserError.recover(userResult, {
  _: () =>
    ({ id: "default", name: "Default", email: "default@example.com" }) as User,
})

expectTypeOf(recoveredWithCatchAll).toExtend<User>()

// =============================================================================
// inspect helper
// =============================================================================

// inspect should return void
expectTypeOf(
  UserError.inspect(userResult, {
    not_found: e => console.log(e.data),
  })
).toEqualTypeOf<void>()

// =============================================================================
// merge helper
// =============================================================================

const ServiceError = UserError.merge(OrderError)

// Merged guard should work
expectTypeOf(ServiceError({} as unknown)).toEqualTypeOf<boolean>()

// Merged set has kinds
expectTypeOf(ServiceError.kinds).toExtend<readonly string[]>()

// =============================================================================
// capture and captureAsync
// =============================================================================

// Sync capture
const capturedSync = UserError.capture(
  () => "success" as const,
  () => UserError.invalid`Error`
)

expectTypeOf(capturedSync).toExtend<"success" | Err<string, Partial<User>>>()

// Async capture
const capturedAsync = UserError.captureAsync(
  async () => "success" as const,
  () => UserError.invalid`Error`
)

expectTypeOf(capturedAsync).toExtend<
  Promise<"success" | Err<string, Partial<User>>>
>()

// =============================================================================
// ErrorSetConfig type
// =============================================================================

const config: ErrorSetConfig = {
  includeStack: true,
  stackDepth: 10,
}

expectTypeOf(config).toExtend<Partial<Config>>()

// =============================================================================
// configure function
// =============================================================================

// configure accepts partial config and returns a disposer
configure({ includeStack: true, stackDepth: 5 })
const restoreConfig = configure({ includeTimestamp: true })
expectTypeOf(restoreConfig).toEqualTypeOf<() => void>()

// format and colors were removed in 0.4.0
// @ts-expect-error - format no longer exists
configure({ format: "json" })
// @ts-expect-error - colors no longer exists
configure({ colors: true })
// @ts-expect-error - format no longer exists in per-set config either
errorSet("RemovedFormat", ["a"]).init({ format: "pretty" })

// =============================================================================
// Iteration support
// =============================================================================

// Error sets should be iterable
const kinds: string[] = [...UserError]
expectTypeOf(kinds).toEqualTypeOf<string[]>()

// Should work with for...of (type should be string)
for (const kind of UserError) {
  expectTypeOf(kind).toEqualTypeOf<string>()
}

// =============================================================================
// Type property (for type export pattern)
// =============================================================================

// UserError.Type should be defined
expectTypeOf(UserError.Type).toExtend<Err<string, Partial<User>> | undefined>()

// =============================================================================
// instanceof support (Symbol.hasInstance)
// =============================================================================

// instanceof check should work (returns boolean)
expectTypeOf(userResult instanceof UserError).toEqualTypeOf<boolean>()

// =============================================================================
// HasDuplicates type utility
// =============================================================================

// No duplicates should return false
expectTypeOf({} as HasDuplicates<["a", "b", "c"]>).toEqualTypeOf<false>()
expectTypeOf(
  {} as HasDuplicates<["not_found", "suspended", "invalid"]>
).toEqualTypeOf<false>()
expectTypeOf({} as HasDuplicates<["x"]>).toEqualTypeOf<false>()
expectTypeOf({} as HasDuplicates<[]>).toEqualTypeOf<false>()

// Duplicates should return true
expectTypeOf({} as HasDuplicates<["a", "b", "a"]>).toEqualTypeOf<true>()
expectTypeOf({} as HasDuplicates<["a", "a"]>).toEqualTypeOf<true>()
expectTypeOf(
  {} as HasDuplicates<["not_found", "suspended", "not_found"]>
).toEqualTypeOf<true>()
expectTypeOf({} as HasDuplicates<["x", "y", "z", "x"]>).toEqualTypeOf<true>()

// =============================================================================
// NoDuplicates type utility
// =============================================================================

// No duplicates should return the original tuple type
expectTypeOf({} as NoDuplicates<["a", "b", "c"]>).toEqualTypeOf<
  ["a", "b", "c"]
>()
expectTypeOf({} as NoDuplicates<["not_found", "suspended"]>).toEqualTypeOf<
  ["not_found", "suspended"]
>()
expectTypeOf({} as NoDuplicates<[]>).toEqualTypeOf<[]>()

// Duplicates should return never
expectTypeOf({} as NoDuplicates<["a", "b", "a"]>).toEqualTypeOf<never>()
expectTypeOf({} as NoDuplicates<["a", "a"]>).toEqualTypeOf<never>()
expectTypeOf({} as NoDuplicates<["x", "y", "x", "z"]>).toEqualTypeOf<never>()

// =============================================================================
// Duplicate detection in errorSet - compile-time errors
// =============================================================================

// Valid error sets (no duplicates) should compile fine
const ValidError1 = errorSet("ValidError1", ["a", "b", "c"]).init()
const ValidError2 = errorSet("ValidError2", ["not_found"]).init()
const ValidError3 = errorSet("ValidError3", [
  "error",
  "warning",
  "info",
]).init<User>()

expectTypeOf(ValidError1({} as unknown)).toEqualTypeOf<boolean>()
expectTypeOf(ValidError2({} as unknown)).toEqualTypeOf<boolean>()
expectTypeOf(ValidError3({} as unknown)).toEqualTypeOf<boolean>()

// Duplicate kinds should cause a compile-time error
// @ts-expect-error - duplicate kind "a" should fail NoDuplicates constraint
errorSet("BadError1", ["a", "b", "a"])

// @ts-expect-error - duplicate kind "not_found" should fail NoDuplicates constraint
errorSet("BadError2", ["not_found", "suspended", "not_found"])

// @ts-expect-error - adjacent duplicates should also fail
errorSet("BadError3", ["x", "x"])

// @ts-expect-error - duplicates at different positions should fail
errorSet("BadError4", ["a", "b", "c", "b"])

// =============================================================================
// NoContextErr - templates without holes return a plain error object (0.4.0)
// =============================================================================

// No template holes: a plain error object, usable directly
const noContextErr = UserError.invalid`Simple error message`
expectTypeOf(noContextErr).toEqualTypeOf<NoContextErr<"invalid", "UserError">>()
expectTypeOf(noContextErr).toExtend<
  Err<"invalid", Record<string, never>, "UserError">
>()

// Options (cause) go through with(), which returns a new error of the same kind
const withCause = noContextErr.with({
  cause: UserError.not_found`Cause ${"id"}`({ id: "1" }),
})
expectTypeOf(withCause).toEqualTypeOf<NoContextErr<"invalid", "UserError">>()

// It is no longer callable
// @ts-expect-error - no-context errors are objects, not functions, since 0.4.0
noContextErr({ cause: "x" })

// It has the error properties
expectTypeOf(noContextErr.kind).toEqualTypeOf<"invalid">()
expectTypeOf(noContextErr.message).toEqualTypeOf<string>()
expectTypeOf(noContextErr.data).toEqualTypeOf<Record<string, never>>()

// Guards accept it
expectTypeOf(isErr(noContextErr)).toEqualTypeOf<boolean>()
expectTypeOf(UserError(noContextErr)).toEqualTypeOf<boolean>()
expectTypeOf(UserError.invalid(noContextErr)).toEqualTypeOf<boolean>()

// With template holes should still return ErrorCreator (requires entity data)
const withHoles = UserError.not_found`User ${"id"} not found`({ id: "123" })
expectTypeOf(withHoles.kind).toEqualTypeOf<"not_found">()
expectTypeOf(withHoles.data).toEqualTypeOf<{ id: string }>()

// =============================================================================
// Set identity (0.4.0, audit A1): errors carry their set, guards are set-precise
// =============================================================================

type Position = { symbol: string }
const OrderErrors = errorSet("OrderError", [
  "invalid_symbol",
  "rejected",
]).init<Position>()
const PositionErrors = errorSet("PositionError", [
  "invalid_symbol",
  "fetch_failed",
]).init<Position>()
type OrderErrors = typeof OrderErrors.Type
type PositionErrors = typeof PositionErrors.Type

const orderErr = OrderErrors.invalid_symbol`bad ${"symbol"}`({ symbol: "X" })
expectTypeOf(orderErr.set).toEqualTypeOf<"OrderError">()
expectTypeOf(OrderErrors.rejected`static`.set).toEqualTypeOf<"OrderError">()
expectTypeOf<OrderErrors["set"]>().toEqualTypeOf<"OrderError">()

declare const either: OrderErrors | PositionErrors
if (OrderErrors(either)) {
  // A same-kind error from another set does not narrow into OrderError
  expectTypeOf(either).toEqualTypeOf<OrderErrors>()
  expectTypeOf(either.set).toEqualTypeOf<"OrderError">()
}
if (OrderErrors.invalid_symbol(either)) {
  expectTypeOf(either.set).toEqualTypeOf<"OrderError">()
  expectTypeOf(either.kind).toEqualTypeOf<"invalid_symbol">()
}
if (PositionErrors.invalid_symbol(either)) {
  expectTypeOf(either.set).toEqualTypeOf<"PositionError">()
}

// An Err from another set is not accepted where a set's errors are expected
// @ts-expect-error - PositionError's error is not an OrderError
const wrongSet: OrderErrors = PositionErrors.invalid_symbol`bad ${"symbol"}`({
  symbol: "X",
})
expectTypeOf(wrongSet).not.toBeAny()

// merge keeps both set names
const Merged = OrderErrors.merge(PositionErrors)
if (Merged(either)) {
  expectTypeOf(either.set).toEqualTypeOf<"OrderError" | "PositionError">()
}

// =============================================================================
// Exhaustive recover (0.4.0, audit A10)
// =============================================================================

const Payment = errorSet("PaymentError", [
  "declined",
  "expired",
  "fraud",
]).init<{ id: string }>()
declare const payment: string | typeof Payment.Type

// Every kind handled: compiles; result is the success type or the handlers' type
const recoveredAll = Payment.recover(payment, {
  declined: () => "d",
  expired: () => "e",
  fraud: () => "f",
})
expectTypeOf(recoveredAll).toEqualTypeOf<string>()

// Partial map plus the "_" catch-all: compiles
const recoveredPartial = Payment.recover(payment, {
  declined: () => 1,
  _: () => 0,
})
expectTypeOf(recoveredPartial).toEqualTypeOf<string | number>()

// Catch-all only: compiles
expectTypeOf(Payment.recover(payment, { _: () => null })).toEqualTypeOf<
  string | null
>()

// Every kind plus "_": compiles
expectTypeOf(
  Payment.recover(payment, {
    declined: () => "d",
    expired: () => "e",
    fraud: () => "f",
    _: () => "x",
  })
).toEqualTypeOf<string>()

// @ts-expect-error - {} handles nothing
Payment.recover(payment, {})

// @ts-expect-error - a partial map without "_" is not exhaustive
Payment.recover(payment, { declined: () => "d", expired: () => "e" })

Payment.recover(payment, {
  declined: () => "d",
  expired: () => "e",
  fraud: () => "f",
  // @ts-expect-error - "refunded" is not a PaymentError kind
  refunded: () => "r",
})

Payment.recover(payment, {
  _: () => "x",
  // @ts-expect-error - unknown kind keys are rejected next to "_" too
  chargeback: () => "c",
})

// =============================================================================
// cause accepts any value (0.4.0, audit A6): native Errors type-check
// =============================================================================

const withNativeCause = UserError.not_found`User ${"id"} not found`(
  { id: "1" },
  { cause: new TypeError("socket hang up") }
)
expectTypeOf(withNativeCause.cause).toEqualTypeOf<unknown>()
expectTypeOf(
  UserError.invalid`Invalid`.with({ cause: "plain value" })
).toExtend<Err<"invalid", Record<string, never>, "UserError">>()

// =============================================================================
// from(): rehydration after JSON / structuredClone (0.5.0, audit A5)
// =============================================================================

const rehydrated = UserError.from(JSON.parse("{}"))
expectTypeOf(rehydrated).toEqualTypeOf<typeof UserError.Type | undefined>()
if (rehydrated !== undefined) {
  expectTypeOf(rehydrated.set).toEqualTypeOf<"UserError">()
  expectTypeOf(rehydrated.kind).toEqualTypeOf<
    "not_found" | "suspended" | "invalid"
  >()
}
// from() accepts any value
expectTypeOf(UserError.from).parameter(0).toBeUnknown()
