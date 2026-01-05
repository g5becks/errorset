/**
 * Type tests for errorset library using tsd.
 * These tests verify that TypeScript type inference works correctly.
 */

import { expectAssignable, expectType } from "tsd"
import {
  type Config,
  configure,
  type Err,
  type ErrorSetOptions,
  errorSet,
  isErr,
  type KindFunction,
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
// errorSet creation - positional API
// =============================================================================

const UserError = errorSet<User>(
  "UserError",
  "not_found",
  "suspended",
  "invalid"
)

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
// errorSet creation - object API
// =============================================================================

const OrderError = errorSet<Order>({
  name: "OrderError",
  kinds: ["cancelled", "payment_failed", "out_of_stock"],
})

// Object API should produce same shape
expectType<boolean>(OrderError({} as unknown))
expectAssignable<readonly string[]>(OrderError.kinds)

// Object API with config
const VerboseError = errorSet<User>({
  name: "VerboseError",
  kinds: ["error"],
  config: {
    includeStack: true,
    format: "pretty",
  },
})

expectType<boolean>(VerboseError({} as unknown))

// =============================================================================
// Kind function access and error creation
// =============================================================================

// Access kind function (dynamic key)
// biome-ignore lint/complexity/useLiteralKeys: Testing dynamic key access
const notFoundFn = UserError["not_found"]
expectAssignable<KindFunction<string, User> | undefined>(notFoundFn)

// Create error using kind function
if (notFoundFn) {
  const user: User = { id: "123", name: "John", email: "john@example.com" }

  // Template literal creates an error
  const err = notFoundFn`User ${"id"} not found`(user)
  expectAssignable<Err<string, Record<string, unknown>>>(err)
  expectType<string>(err.kind)
  expectType<string>(err.message)
  expectAssignable<Record<string, unknown>>(err.data)
}

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
  e => {
    // biome-ignore lint/complexity/useLiteralKeys: Testing dynamic key access
    const fn = UserError["invalid"]
    if (fn) {
      return fn`Error`({} as User)
    }
    throw e
  }
)

expectAssignable<"success" | Err<string, Partial<User>>>(capturedSync)

// Async capture
const capturedAsync = UserError.captureAsync(
  async () => "success" as const,
  e => {
    // biome-ignore lint/complexity/useLiteralKeys: Testing dynamic key access
    const fn = UserError["invalid"]
    if (fn) {
      return fn`Error`({} as User)
    }
    throw e
  }
)

expectAssignable<Promise<"success" | Err<string, Partial<User>>>>(capturedAsync)

// =============================================================================
// ErrorSetOptions type
// =============================================================================

const options: ErrorSetOptions = {
  name: "TestError",
  kinds: ["a", "b", "c"],
}

expectType<string>(options.name)
expectType<string[]>(options.kinds)
expectAssignable<Partial<Config> | undefined>(options.config)

// Config option in ErrorSetOptions
const optionsWithConfig: ErrorSetOptions = {
  name: "ConfiguredError",
  kinds: ["error"],
  config: {
    includeStack: true,
    format: "json",
    stackDepth: 10,
  },
}

if (optionsWithConfig.config) {
  expectAssignable<Partial<Config>>(optionsWithConfig.config)
}

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
