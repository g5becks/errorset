/**
 * Type tests for errorset library using tsd.
 * These tests verify that TypeScript type inference works correctly.
 */

import { expectAssignable, expectType } from "tsd"
import {
  type Config,
  configure,
  type Err,
  type ErrorSetConfig,
  errorSet,
  type HasDuplicates,
  isErr,
  type KindFunction,
  type NoDuplicates,
} from "../dist/index.js"

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
expectType<boolean>(UserError({} as unknown))

// The error set should have kinds array
expectAssignable<readonly string[]>(UserError.kinds)

// The error set should have helper methods
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectAssignable<Function>(UserError.recover)
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectAssignable<Function>(UserError.inspect)
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectAssignable<Function>(UserError.merge)
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectAssignable<Function>(UserError.capture)
// biome-ignore lint/complexity/noBannedTypes: Testing that these are functions
expectAssignable<Function>(UserError.captureAsync)

// =============================================================================
// errorSet creation - builder API with config
// =============================================================================

const OrderError = errorSet("OrderError", [
  "cancelled",
  "payment_failed",
  "out_of_stock",
]).init<Order>()

// Should produce same shape
expectType<boolean>(OrderError({} as unknown))
expectAssignable<readonly string[]>(OrderError.kinds)

// Builder API with config
const VerboseError = errorSet("VerboseError", ["error"]).init<User>({
  includeStack: true,
  format: "pretty",
})

expectType<boolean>(VerboseError({} as unknown))

// =============================================================================
// Kind function access and error creation
// =============================================================================

// Access kind function directly (static property)
const notFoundFn = UserError.not_found
expectAssignable<KindFunction<"not_found", User>>(notFoundFn)

// Create error using kind function
const user: User = { id: "123", name: "John", email: "john@example.com" }

// Template literal creates an error
const err = UserError.not_found`User ${"id"} not found`(user)
expectAssignable<Err<"not_found", { id: string }>>(err)
expectType<"not_found">(err.kind)
expectType<string>(err.message)
expectAssignable<{ id: string }>(err.data)

// =============================================================================
// Err type structure
// =============================================================================

// Create a mock error to test the Err type
declare const mockErr: Err<"not_found", { id: string }>

expectType<"not_found">(mockErr.kind)
expectType<string>(mockErr.message)
expectType<{ id: string }>(mockErr.data)
expectAssignable<Err<string, Record<string, unknown>> | undefined>(
  mockErr.cause
)

// =============================================================================
// isErr universal guard
// =============================================================================

declare const unknownValue: unknown

if (isErr(unknownValue)) {
  expectType<string>(unknownValue.kind)
  expectType<string>(unknownValue.message)
  expectAssignable<Record<string, unknown>>(unknownValue.data)
}

// =============================================================================
// Set-level guard type narrowing
// =============================================================================

type GetUserResult = User | Err<"not_found" | "suspended", Partial<User>>
declare const userResult: GetUserResult

if (UserError(userResult)) {
  // After guard, should be an error
  expectAssignable<string>(userResult.kind)
  expectType<string>(userResult.message)
  expectAssignable<Partial<User>>(userResult.data)
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

expectAssignable<User>(recovered)

// Catch-all handler
const recoveredWithCatchAll = UserError.recover(userResult, {
  _: () =>
    ({ id: "default", name: "Default", email: "default@example.com" }) as User,
})

expectAssignable<User>(recoveredWithCatchAll)

// =============================================================================
// inspect helper
// =============================================================================

// inspect should return void
expectType<void>(
  UserError.inspect(userResult, {
    not_found: e => console.log(e.data),
  })
)

// =============================================================================
// merge helper
// =============================================================================

const ServiceError = UserError.merge(OrderError)

// Merged guard should work
expectType<boolean>(ServiceError({} as unknown))

// Merged set has kinds
expectAssignable<readonly string[]>(ServiceError.kinds)

// =============================================================================
// capture and captureAsync
// =============================================================================

// Sync capture
const capturedSync = UserError.capture(
  () => "success" as const,
  () => UserError.invalid`Error`
)

expectAssignable<"success" | Err<string, Partial<User>>>(capturedSync)

// Async capture
const capturedAsync = UserError.captureAsync(
  async () => "success" as const,
  () => UserError.invalid`Error`
)

expectAssignable<Promise<"success" | Err<string, Partial<User>>>>(capturedAsync)

// =============================================================================
// ErrorSetConfig type
// =============================================================================

const config: ErrorSetConfig = {
  includeStack: true,
  format: "json",
  stackDepth: 10,
}

expectAssignable<Partial<Config>>(config)

// =============================================================================
// configure function
// =============================================================================

// configure should accept partial config
configure({ format: "json" })
configure({ includeStack: true, stackDepth: 5 })
configure({ format: "pretty", colors: true })

// Invalid format should error
// @ts-expect-error - 'invalid' is not a valid format
configure({ format: "invalid" })

// =============================================================================
// Iteration support
// =============================================================================

// Error sets should be iterable
const kinds: string[] = [...UserError]
expectType<string[]>(kinds)

// Should work with for...of (type should be string)
for (const kind of UserError) {
  expectType<string>(kind)
}

// =============================================================================
// Type property (for type export pattern)
// =============================================================================

// UserError.Type should be defined
expectAssignable<Err<string, Partial<User>> | undefined>(UserError.Type)

// =============================================================================
// instanceof support (Symbol.hasInstance)
// =============================================================================

// instanceof check should work (returns boolean)
expectType<boolean>(userResult instanceof UserError)

// =============================================================================
// HasDuplicates type utility
// =============================================================================

// No duplicates should return false
expectType<false>({} as HasDuplicates<["a", "b", "c"]>)
expectType<false>({} as HasDuplicates<["not_found", "suspended", "invalid"]>)
expectType<false>({} as HasDuplicates<["x"]>)
expectType<false>({} as HasDuplicates<[]>)

// Duplicates should return true
expectType<true>({} as HasDuplicates<["a", "b", "a"]>)
expectType<true>({} as HasDuplicates<["a", "a"]>)
expectType<true>({} as HasDuplicates<["not_found", "suspended", "not_found"]>)
expectType<true>({} as HasDuplicates<["x", "y", "z", "x"]>)

// =============================================================================
// NoDuplicates type utility
// =============================================================================

// No duplicates should return the original tuple type
expectType<["a", "b", "c"]>({} as NoDuplicates<["a", "b", "c"]>)
expectType<["not_found", "suspended"]>(
  {} as NoDuplicates<["not_found", "suspended"]>
)
expectType<[]>({} as NoDuplicates<[]>)

// Duplicates should return never
expectType<never>({} as NoDuplicates<["a", "b", "a"]>)
expectType<never>({} as NoDuplicates<["a", "a"]>)
expectType<never>({} as NoDuplicates<["x", "y", "x", "z"]>)

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

expectType<boolean>(ValidError1({} as unknown))
expectType<boolean>(ValidError2({} as unknown))
expectType<boolean>(ValidError3({} as unknown))

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
// CallableErr - Simplified syntax for no-context errors
// =============================================================================

// No template holes should return CallableErr (usable directly)
const callableErr = UserError.invalid`Simple error message`

// CallableErr should be assignable to Err
expectAssignable<Err<"invalid", Record<string, never>>>(callableErr)

// CallableErr should be callable with options
const withCause = callableErr({
  cause: UserError.not_found`Cause ${"id"}`({ id: "1" }),
})
expectAssignable<Err<"invalid", Record<string, never>>>(withCause)

// CallableErr should have error properties
expectType<"invalid">(callableErr.kind)
expectType<string>(callableErr.message)
expectType<Record<string, never>>(callableErr.data)

// isErr should work on CallableErr
expectType<boolean>(isErr(callableErr))

// Set-level guard should work on CallableErr
expectType<boolean>(UserError(callableErr))

// Kind-level guard should work on CallableErr
expectType<boolean>(UserError.invalid(callableErr))

// With template holes should still return ErrorCreator (requires entity data)
const withHoles = UserError.not_found`User ${"id"} not found`({ id: "123" })
expectType<"not_found">(withHoles.kind)
expectType<{ id: string }>(withHoles.data)
