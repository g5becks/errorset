/**
 * Core types and constants for the errorset library.
 * @module types
 */

import { type Config, getConfig } from "./config.ts"

/**
 * Unique symbol used to brand error objects.
 * This allows reliable identification of error set values
 * without relying on instanceof or prototype chains.
 */
export const ERR: unique symbol = Symbol("err")

/**
 * Type alias for the ERR symbol type.
 * Used in type definitions to reference the symbol's type.
 */
export type ERR = typeof ERR

/**
 * Symbol for custom Node.js inspect output.
 * Used to provide clean console.log() output for errors.
 */
export const INSPECT: unique symbol = Symbol.for("nodejs.util.inspect.custom")

/**
 * Core error type representing a domain-bound error value.
 *
 * @typeParam Kind - String literal type for the error kind (e.g., "not_found")
 * @typeParam Data - Record type containing extracted context data
 *
 * @example
 * ```ts
 * type UserNotFoundError = Err<"not_found", { id: string }>
 * ```
 */
export type Err<
  Kind extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Brand property identifying this as an error set value */
  readonly [ERR]: true
  /** The error kind/tag (e.g., "not_found", "validation") */
  readonly kind: Kind
  /** Human-readable error message */
  readonly message: string
  /** Extracted context data from template literal holes */
  readonly data: Data
  /** Optional wrapped error that caused this error */
  readonly cause?: Err<string, Record<string, unknown>>
  /** Optional timestamp when the error was created */
  readonly timestamp?: number
  /** Optional stack trace (V8 engines only, when enabled) */
  readonly stack?: string
}

/**
 * Check if a value is an error from any error set.
 *
 * This is a universal type guard that works with errors from any error set.
 * For checking errors from a specific set, use the set-level guard instead.
 *
 * @param value - Value to check
 * @returns True if value is an error set value
 *
 * @example
 * ```ts
 * const result = doSomething()
 * if (isErr(result)) {
 *   console.log(result.kind, result.message)
 * }
 * ```
 */
export function isErr(
  value: unknown
): value is Err<string, Record<string, unknown>> {
  return (
    value !== null &&
    typeof value === "object" &&
    ERR in value &&
    (value as Record<typeof ERR, unknown>)[ERR] === true
  )
}

/**
 * Optional configuration for error set initialization.
 */
export type ErrorSetConfig = Partial<Config>

/**
 * Options for error creation.
 */
export type ErrorOptions = {
  /** Optional wrapped error that caused this error */
  cause?: Err<string, Record<string, unknown>>
}

/**
 * Recursively checks if a tuple contains duplicate string literals.
 *
 * Works by checking if the first element exists in the rest of the tuple,
 * then recursively checking the rest.
 *
 * @typeParam T - Readonly tuple of string literals to check
 * @returns `true` if duplicates exist, `false` otherwise
 *
 * @example
 * ```ts
 * type A = HasDuplicates<["a", "b", "c"]>  // false
 * type B = HasDuplicates<["a", "b", "a"]>  // true
 * ```
 */
export type HasDuplicates<T extends readonly string[]> = T extends readonly [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? Head extends Tail[number]
    ? true
    : HasDuplicates<Tail>
  : false

/**
 * Type constraint that resolves to `never` if duplicates exist in the tuple.
 *
 * Used to create compile-time errors when duplicate kinds are provided to errorSet().
 *
 * @typeParam T - Readonly tuple of string literals to validate
 * @returns The input tuple type if no duplicates, `never` if duplicates exist
 *
 * @example
 * ```ts
 * type A = NoDuplicates<["a", "b", "c"]>  // ["a", "b", "c"]
 * type B = NoDuplicates<["a", "b", "a"]>  // never
 * ```
 */
export type NoDuplicates<T extends readonly string[]> =
  HasDuplicates<T> extends true ? never : T

/**
 * Builder type returned by errorSet() that allows binding the entity type.
 *
 * @typeParam Kinds - Tuple type of error kind strings
 */
export type ErrorSetBuilder<Kinds extends readonly string[]> = {
  /**
   * Initialize the error set with an entity type.
   *
   * @typeParam T - The domain entity type (e.g., User, Order)
   * @param config - Optional configuration overrides
   * @returns Complete error set bound to entity type T
   *
   * @example
   * ```ts
   * const UserError = errorSet("UserError", ["not_found", "suspended"])
   *   .init<User>()
   *
   * // With config
   * const VerboseError = errorSet("VerboseError", ["error"])
   *   .init<User>({ includeStack: true })
   * ```
   */
  init<T extends Record<string, unknown>>(
    config?: ErrorSetConfig
  ): ErrorSet<Kinds[number], T>
}

/**
 * Function returned by template literal that creates the error.
 * Accepts entity data and optional error options.
 */
export type ErrorCreator<
  Kind extends string,
  T extends Record<string, unknown>,
  K extends keyof T,
> = (entity: Pick<T, K>, options?: ErrorOptions) => Err<Kind, Pick<T, K>>

/**
 * Tagged template function for a specific error kind.
 * Constrains template holes to valid field names from the entity type.
 */
export type KindConstructor<
  Kind extends string,
  T extends Record<string, unknown>,
> = <K extends keyof T & string>(
  strings: TemplateStringsArray,
  ...keys: K[]
) => ErrorCreator<Kind, T, K>

/**
 * Kind-level guard function type.
 * Checks if a value is a specific error kind.
 */
export type KindGuard<
  Kind extends string,
  T extends Record<string, unknown>,
> = (value: unknown) => value is Err<Kind, Partial<T>>

/**
 * Dual-purpose kind function that acts as both:
 * 1. Tagged template literal for error creation
 * 2. Type guard for checking specific error kind
 */
export type KindFunction<
  Kind extends string,
  T extends Record<string, unknown>,
> = KindConstructor<Kind, T> & KindGuard<Kind, T>

/**
 * Captures a stack trace on the target object if available (V8 engines only).
 * This is a zero-cost operation in non-V8 environments.
 *
 * @param target - Object to attach stack trace to
 * @param constructorOpt - Function to exclude from stack trace
 * @internal
 */
function captureStack(
  target: object,
  constructorOpt?: unknown,
  instanceConfig?: Partial<Config>
): void {
  const globalConfig = getConfig()
  const config = instanceConfig
    ? { ...globalConfig, ...instanceConfig }
    : globalConfig

  if (!config.includeStack) {
    return
  }

  // Check if Error.captureStackTrace is available (V8 engines: Node.js, Chrome, Bun)
  if (typeof Error.captureStackTrace === "function") {
    // Save and set stack trace limit
    const originalLimit = Error.stackTraceLimit
    Error.stackTraceLimit = config.stackDepth

    Error.captureStackTrace(
      target,
      constructorOpt as ((...args: unknown[]) => unknown) | undefined
    )

    // Restore original limit
    Error.stackTraceLimit = originalLimit
  }
}

/**
 * Creates a kind function for a specific error kind.
 * The returned function serves dual purposes:
 * 1. As a tagged template literal: creates errors
 * 2. As a type guard: checks if a value is this specific error kind
 *
 * @param kind - The error kind string
 * @param name - The error set name (for debugging)
 * @returns A dual-purpose kind function
 *
 * @example
 * ```ts
 * const not_found = createKindFunction<"not_found", User>("not_found", "UserError")
 *
 * // As creator (tagged template):
 * const err = not_found`User ${"id"} not found`({ id: "123" })
 *
 * // As guard:
 * if (not_found(result)) {
 *   // result is Err<"not_found", Partial<User>>
 * }
 * ```
 *
 * @internal
 */
export function createKindFunction<
  Kind extends string,
  T extends Record<string, unknown>,
>(
  kind: Kind,
  name: string,
  instanceConfig?: Partial<Config>
): KindFunction<Kind, T> {
  // The dual-purpose function
  const kindFn = <K extends keyof T & string>(
    stringsOrValue: TemplateStringsArray | object | null | undefined,
    ...keys: K[]
  ): ErrorCreator<Kind, T, K> | boolean => {
    // Check if called as tagged template literal
    // TemplateStringsArray is an array with a 'raw' property
    if (
      Array.isArray(stringsOrValue) &&
      "raw" in stringsOrValue &&
      Array.isArray((stringsOrValue as TemplateStringsArray).raw)
    ) {
      const strings = stringsOrValue as TemplateStringsArray

      // Return error creator function
      const creator = (
        entity: Pick<T, K>,
        options?: ErrorOptions
      ): Err<Kind, Pick<T, K>> => {
        // Extract only referenced fields into data
        const data = {} as Record<string, unknown>
        for (const key of keys) {
          data[key] = entity[key]
        }

        // Build message by interpolating values
        let message = strings[0] ?? ""
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]
          const value = key === undefined ? undefined : entity[key]
          message += String(value ?? "")
          message += strings[i + 1] ?? ""
        }

        // Create error object with custom inspect for debuggers
        const err = {
          [ERR]: true,
          kind,
          message,
          data: data as Pick<T, K>,
          ...(options?.cause !== undefined && { cause: options.cause }),
          // Custom inspection for Node.js debuggers
          // Format: ErrorSetName.kind { data }
          [INSPECT]() {
            return `${name}.${kind} ${JSON.stringify(data)}`
          },
        } as Err<Kind, Pick<T, K>>

        // Capture stack trace if enabled (V8 engines only)
        captureStack(err, creator, instanceConfig)

        return err
      }

      return creator
    }

    // Called as guard - check if value is this specific error kind
    const value = stringsOrValue
    if (value === null || typeof value !== "object") {
      return false
    }

    if (
      !(ERR in value) ||
      (value as Record<typeof ERR, unknown>)[ERR] !== true
    ) {
      return false
    }

    return (value as Record<string, unknown>).kind === kind
  }

  // Add string coercion support
  // Allows: `Error type: ${UserError.not_found}` => "Error type: not_found"
  Object.defineProperty(kindFn, "toString", {
    value: () => kind,
    writable: false,
    enumerable: false,
    configurable: false,
  })

  // Symbol.toPrimitive for type coercion in comparisons and template literals
  Object.defineProperty(kindFn, Symbol.toPrimitive, {
    value: () => kind,
    writable: false,
    enumerable: false,
    configurable: false,
  })

  return kindFn as KindFunction<Kind, T>
}

/**
 * Type for the set-level guard function.
 * Checks if a value is any error from this error set.
 */
export type SetGuard<
  Kinds extends string,
  T extends Record<string, unknown>,
> = ((value: unknown) => value is Err<Kinds, Partial<T>>) & {
  /** Symbol.hasInstance for instanceof support */
  [Symbol.hasInstance](value: unknown): value is Err<Kinds, Partial<T>>
}

/**
 * Creates a set-level type guard for an error set.
 * Returns true if the value is any error from this set.
 * Also supports instanceof operator via Symbol.hasInstance.
 *
 * @param kinds - Array of valid error kinds for this set
 * @returns A type guard function with instanceof support
 *
 * @example
 * ```ts
 * const UserError = createSetGuard<"not_found" | "invalid", User>(["not_found", "invalid"])
 *
 * // Callable guard:
 * if (UserError(result)) { ... }
 *
 * // instanceof syntax:
 * if (result instanceof UserError) { ... }
 * ```
 *
 * @internal
 */
export function createSetGuard<
  Kinds extends string,
  T extends Record<string, unknown>,
>(kinds: Kinds[]): SetGuard<Kinds, T> {
  const guard = (value: unknown): value is Err<Kinds, Partial<T>> => {
    // Must be a non-null object
    if (value === null || typeof value !== "object") {
      return false
    }

    // Must have ERR symbol set to true
    if (
      !(ERR in value) ||
      (value as Record<typeof ERR, unknown>)[ERR] !== true
    ) {
      return false
    }

    // Must have a kind property that is in our set
    const kind = (value as Record<string, unknown>).kind
    if (typeof kind !== "string") {
      return false
    }

    return kinds.includes(kind as Kinds)
  }

  // Add Symbol.hasInstance for instanceof support
  Object.defineProperty(guard, Symbol.hasInstance, {
    value: (value: unknown): boolean => guard(value),
    writable: false,
    enumerable: false,
    configurable: false,
  })

  return guard as SetGuard<Kinds, T>
}

/**
 * Handler function type for recover.
 * Receives the error and returns a recovery value.
 */
export type RecoverHandler<
  Kind extends string,
  T extends Record<string, unknown>,
  R,
> = (error: Err<Kind, Partial<T>>) => R

/**
 * Handlers object for recover method.
 * Maps error kinds to handler functions, with optional catch-all.
 */
export type RecoverHandlers<
  Kinds extends string,
  T extends Record<string, unknown>,
  R,
> = {
  [K in Kinds]?: RecoverHandler<K, T, R>
} & {
  /** Catch-all handler for any unmatched error kind */
  _?: RecoverHandler<Kinds, T, R>
}

/**
 * Provides expression-style error handling with guaranteed recovery.
 *
 * Returns the success value unchanged if not an error.
 * For errors, applies the matching handler or catch-all.
 * Throws if no matching handler is found.
 *
 * @param value - The result value (success or error)
 * @param guard - The set-level guard to check errors
 * @param handlers - Object mapping error kinds to handlers
 * @returns The success value or handler result
 *
 * @example
 * ```ts
 * const user = recover(result, UserError, {
 *   not_found: () => guestUser,
 *   _: () => defaultUser,  // Catch-all
 * })
 * // user is strictly User - no error types possible
 * ```
 */
export function recover<
  Success,
  Kinds extends string,
  T extends Record<string, unknown>,
  R,
>(
  value: Success | Err<Kinds, Partial<T>>,
  guard: SetGuard<Kinds, T>,
  handlers: RecoverHandlers<Kinds, T, R>
): Success | R {
  // If not an error, return success value unchanged
  if (!guard(value)) {
    return value
  }

  // Value is an error - look for matching handler
  const error = value
  const kind = error.kind

  // Try specific handler first
  const specificHandler = handlers[kind]
  if (specificHandler !== undefined) {
    return specificHandler(error)
  }

  // Fall back to catch-all handler
  const catchAllHandler = handlers._
  if (catchAllHandler !== undefined) {
    return catchAllHandler(error)
  }

  // No handler found - throw
  throw new Error(
    `No handler found for error kind: ${kind}. ` +
      `Provide a handler for "${kind}" or a catch-all "_" handler.`
  )
}

/**
 * Handler function type for inspect.
 * Receives the error and performs side effects (returns void).
 */
export type InspectHandler<
  Kind extends string,
  T extends Record<string, unknown>,
> = (error: Err<Kind, Partial<T>>) => void

/**
 * Handlers object for inspect method.
 * Partial mapping of error kinds to handler functions (all optional).
 */
export type InspectHandlers<
  Kinds extends string,
  T extends Record<string, unknown>,
> = {
  [K in Kinds]?: InspectHandler<K, T>
}

/**
 * Observes errors without changing the type or control flow.
 *
 * Does nothing if the value is not an error.
 * For errors, calls the matching handler if provided.
 * Does not modify the result value - useful for logging, metrics, auditing.
 *
 * @param value - The result value (success or error)
 * @param guard - The set-level guard to check errors
 * @param handlers - Partial object mapping error kinds to handlers
 * @returns void
 *
 * @example
 * ```ts
 * inspect(result, UserError, {
 *   suspended: (e) => audit.log(`Blocked user: ${e.data.id}`),
 *   not_found: (e) => metrics.increment("user.not_found"),
 * })
 * // result type unchanged - continue with normal flow
 * ```
 */
export function inspect<
  Success,
  Kinds extends string,
  T extends Record<string, unknown>,
>(
  value: Success | Err<Kinds, Partial<T>>,
  guard: SetGuard<Kinds, T>,
  handlers: InspectHandlers<Kinds, T>
): void {
  // If not an error, do nothing
  if (!guard(value)) {
    return
  }

  // Value is an error - look for matching handler
  const error = value
  const kind = error.kind

  // Call specific handler if provided
  const handler = handlers[kind]
  if (handler !== undefined) {
    handler(error)
  }
  // No handler for this kind - that's fine, do nothing
}

/**
 * Extended SetGuard with kinds array for merge operations.
 * Internal type used to access the kinds from a guard.
 */
export type SetGuardWithKinds<
  Kinds extends string,
  T extends Record<string, unknown>,
> = SetGuard<Kinds, T> & {
  /** Array of valid kinds for this set */
  readonly kinds: readonly Kinds[]
}

/**
 * Creates a set-level type guard with accessible kinds array.
 * This is used internally for merge operations.
 *
 * @param kinds - Array of valid error kinds for this set
 * @returns A type guard function with kinds array and instanceof support
 *
 * @internal
 */
export function createSetGuardWithKinds<
  Kinds extends string,
  T extends Record<string, unknown>,
>(kinds: readonly Kinds[]): SetGuardWithKinds<Kinds, T> {
  const guard = createSetGuard<Kinds, T>(kinds as Kinds[])

  // Add kinds array to the guard
  Object.defineProperty(guard, "kinds", {
    value: kinds,
    writable: false,
    enumerable: false,
    configurable: false,
  })

  return guard as SetGuardWithKinds<Kinds, T>
}

/**
 * Merges two error set guards into a unified guard.
 *
 * The merged guard checks for errors from either original set.
 * Data becomes untyped (Record<string, unknown>) since sets may have different entity types.
 * Original sets remain unchanged.
 *
 * @param guard1 - First error set guard
 * @param guard2 - Second error set guard
 * @returns A new guard that matches errors from either set
 *
 * @example
 * ```ts
 * const UserError = createSetGuardWithKinds<"not_found" | "suspended", User>(["not_found", "suspended"])
 * const OrderError = createSetGuardWithKinds<"cancelled" | "expired", Order>(["cancelled", "expired"])
 *
 * const ServiceError = merge(UserError, OrderError)
 * // ServiceError matches "not_found" | "suspended" | "cancelled" | "expired"
 * ```
 */
export function merge<
  Kinds1 extends string,
  T1 extends Record<string, unknown>,
  Kinds2 extends string,
  T2 extends Record<string, unknown>,
>(
  guard1: SetGuardWithKinds<Kinds1, T1>,
  guard2: SetGuardWithKinds<Kinds2, T2>
): SetGuardWithKinds<Kinds1 | Kinds2, Record<string, unknown>> {
  // Combine kinds from both guards
  const combinedKinds = [...guard1.kinds, ...guard2.kinds] as (
    | Kinds1
    | Kinds2
  )[]

  // Create new guard with combined kinds
  return createSetGuardWithKinds<Kinds1 | Kinds2, Record<string, unknown>>(
    combinedKinds
  )
}

/**
 * Error mapper function type for capture.
 * Receives the caught Error and returns an error set value.
 */
export type ErrorMapper<
  Kinds extends string,
  T extends Record<string, unknown>,
> = (error: Error) => Err<Kinds, Partial<T>>

/**
 * Wraps synchronous throwing code and converts exceptions to error set values.
 *
 * Returns the function result if no error is thrown.
 * Catches thrown errors, converts non-Error values to Error objects,
 * and passes them to the mapper to create an error set value.
 *
 * @param fn - Synchronous function that might throw
 * @param mapper - Function to convert caught Error to error set value
 * @returns The function result or mapped error
 *
 * @example
 * ```ts
 * const result = captureSync(
 *   () => db.querySync(sql),
 *   (e) => DbError.query_failed`Query failed: ${"message"}`({ sql, message: e.message })
 * )
 * // result is QueryResult | DbError
 * ```
 */
export function captureSync<
  T,
  Kinds extends string,
  Data extends Record<string, unknown>,
>(
  fn: () => T,
  mapper: ErrorMapper<Kinds, Data>
): T | Err<Kinds, Partial<Data>> {
  try {
    return fn()
  } catch (error_) {
    // Convert non-Error values to Error objects
    const error = error_ instanceof Error ? error_ : new Error(String(error_))
    return mapper(error)
  }
}

/**
 * Wraps asynchronous throwing code and converts rejections to error set values.
 *
 * Returns the promise result if no error is thrown or rejected.
 * Catches thrown errors and promise rejections, converts non-Error values
 * to Error objects, and passes them to the mapper to create an error set value.
 *
 * @param fn - Async function that might throw or reject
 * @param mapper - Function to convert caught Error to error set value
 * @returns Promise of the function result or mapped error
 *
 * @example
 * ```ts
 * const result = await captureAsync(
 *   async () => await db.query(sql),
 *   (e) => DbError.query_failed`Query failed: ${"message"}`({ sql, message: e.message })
 * )
 * // result is QueryResult | DbError
 * ```
 */
export async function captureAsync<
  T,
  Kinds extends string,
  Data extends Record<string, unknown>,
>(
  fn: () => Promise<T>,
  mapper: ErrorMapper<Kinds, Data>
): Promise<T | Err<Kinds, Partial<Data>>> {
  try {
    return await fn()
  } catch (error_) {
    // Convert non-Error values to Error objects
    const error = error_ instanceof Error ? error_ : new Error(String(error_))
    return mapper(error)
  }
}

/**
 * Complete error set type with all functionality.
 *
 * Combines:
 * - Callable set-level guard (can call as function or use instanceof)
 * - Kind constructors indexed by kind name
 * - Helper methods: recover, inspect, merge, capture, captureAsync
 * - Type helper for type exports
 */
export type ErrorSet<
  Kinds extends string,
  T extends Record<string, unknown>,
> = SetGuardWithKinds<Kinds, T> & {
  /** Kind constructors indexed by kind name */
  [K in Kinds]: KindFunction<K, T>
} & {
  /**
   * Type helper for exporting error set type.
   * Use: export type MyError = typeof MyError.Type
   */
  readonly Type: Err<Kinds, Partial<T>>

  /**
   * Expression-style error handling with guaranteed recovery.
   */
  recover<Success, R>(
    value: Success | Err<Kinds, Partial<T>>,
    handlers: RecoverHandlers<Kinds, T, R>
  ): Success | R

  /**
   * Observe errors without changing type or control flow.
   */
  inspect<Success>(
    value: Success | Err<Kinds, Partial<T>>,
    handlers: InspectHandlers<Kinds, T>
  ): void

  /**
   * Merge with another error set to create unified guard.
   */
  merge<Kinds2 extends string, T2 extends Record<string, unknown>>(
    other: SetGuardWithKinds<Kinds2, T2>
  ): SetGuardWithKinds<Kinds | Kinds2, Record<string, unknown>>

  /**
   * Wrap synchronous throwing code.
   */
  capture<Result>(
    fn: () => Result,
    mapper: ErrorMapper<Kinds, T>
  ): Result | Err<Kinds, Partial<T>>

  /**
   * Wrap asynchronous throwing code.
   */
  captureAsync<Result>(
    fn: () => Promise<Result>,
    mapper: ErrorMapper<Kinds, T>
  ): Promise<Result | Err<Kinds, Partial<T>>>

  /**
   * Iterator for error kind names.
   * Allows for...of loops and spread syntax.
   */
  [Symbol.iterator](): IterableIterator<string>
}

/**
 * Creates a domain-bound error set builder.
 *
 * Error sets are tied to entity types - template literal holes are constrained
 * to valid field names from the entity type. Context is automatically extracted.
 *
 * Use the builder pattern: call errorSet() with name and kinds, then .init<T>()
 * to bind the entity type.
 *
 * **Duplicate Detection:** The function validates that all kinds are unique.
 * Duplicates cause a compile-time error (via `NoDuplicates` type constraint)
 * and a runtime error for JavaScript consumers or edge cases.
 *
 * @param name - Name of the error set (for debugging, e.g., "UserError")
 * @param kinds - Array of unique error kind strings (literal types inferred automatically)
 * @returns Builder with .init<T>() method to complete the error set
 * @throws {Error} If duplicate kinds are provided (e.g., `["a", "b", "a"]`)
 *
 * @example
 * ```ts
 * type User = { name: string; id: string }
 *
 * // Create error set with builder pattern
 * const UserError = errorSet("UserError", ["not_found", "suspended", "invalid"])
 *   .init<User>()
 *
 * // With optional config
 * const VerboseError = errorSet("VerboseError", ["error"])
 *   .init<User>({ includeStack: true, stackDepth: 5 })
 *
 * // Create errors with type-safe template literals
 * const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
 *
 * // Check errors with guards
 * if (UserError(result)) { ... }           // Set-level guard
 * if (UserError.not_found(result)) { ... } // Kind-level guard
 * if (result instanceof UserError) { ... } // instanceof support
 *
 * // Export type with same name
 * export type UserError = typeof UserError.Type
 *
 * // Duplicate kinds cause compile-time AND runtime errors:
 * // const Bad = errorSet("Bad", ["a", "b", "a"])  // ❌ TypeScript error
 * ```
 */
export function errorSet<
  N extends string,
  const Kinds extends readonly string[],
>(name: N, kinds: NoDuplicates<Kinds>): ErrorSetBuilder<Kinds> {
  // Runtime validation for JavaScript consumers or edge cases
  const seen = new Set<string>()
  for (const kind of kinds) {
    if (seen.has(kind)) {
      throw new Error(`Duplicate kind "${kind}" in error set "${name}"`)
    }
    seen.add(kind)
  }

  return {
    init<T extends Record<string, unknown>>(
      config?: ErrorSetConfig
    ): ErrorSet<Kinds[number], T> {
      // Create the base guard with kinds array
      const guard = createSetGuardWithKinds<Kinds[number], T>(kinds)

      // Create kind functions and attach to guard
      const errorSetObj = guard as unknown as ErrorSet<Kinds[number], T>

      for (const kind of kinds) {
        const kindFn = createKindFunction<string, T>(kind, name, config)
        Object.defineProperty(errorSetObj, kind, {
          value: kindFn,
          writable: false,
          enumerable: true,
          configurable: false,
        })
      }

      // Attach Type helper (returns undefined but provides type inference)
      Object.defineProperty(errorSetObj, "Type", {
        value: undefined,
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach recover method bound to this guard
      Object.defineProperty(errorSetObj, "recover", {
        value: <Success, R>(
          value: Success | Err<Kinds[number], Partial<T>>,
          handlers: RecoverHandlers<Kinds[number], T, R>
        ): Success | R => recover(value, guard, handlers),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach inspect method bound to this guard
      Object.defineProperty(errorSetObj, "inspect", {
        value: <Success>(
          value: Success | Err<Kinds[number], Partial<T>>,
          handlers: InspectHandlers<Kinds[number], T>
        ): void => inspect(value, guard, handlers),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach merge method
      Object.defineProperty(errorSetObj, "merge", {
        value: <Kinds2 extends string, T2 extends Record<string, unknown>>(
          other: SetGuardWithKinds<Kinds2, T2>
        ): SetGuardWithKinds<Kinds[number] | Kinds2, Record<string, unknown>> =>
          merge(guard, other),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach capture method
      Object.defineProperty(errorSetObj, "capture", {
        value: <Result>(
          fn: () => Result,
          mapper: ErrorMapper<Kinds[number], T>
        ): Result | Err<Kinds[number], Partial<T>> => captureSync(fn, mapper),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach captureAsync method
      Object.defineProperty(errorSetObj, "captureAsync", {
        value: <Result>(
          fn: () => Promise<Result>,
          mapper: ErrorMapper<Kinds[number], T>
        ): Promise<Result | Err<Kinds[number], Partial<T>>> =>
          captureAsync(fn, mapper),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach Symbol.iterator for iteration over kinds
      Object.defineProperty(errorSetObj, Symbol.iterator, {
        *value(): IterableIterator<string> {
          yield* kinds
        },
        writable: false,
        enumerable: false,
        configurable: false,
      })

      return errorSetObj
    },
  }
}
