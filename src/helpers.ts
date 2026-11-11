/**
 * Handling helpers: recover, inspect, capture/captureAsync and toError.
 * @module helpers
 */

import { type Err, hasBrand } from "./brand.ts"
import type { SetGuard } from "./guards.ts"

/**
 * Handler function type for recover.
 * Receives the error and returns a recovery value.
 */
export type RecoverHandler<
  Kind extends string,
  T extends object,
  R,
  N extends string = string,
> = (error: Err<Kind, Partial<T>, N>) => R

/**
 * Handlers object for recover: recovery is exhaustive.
 *
 * Either every kind has a handler (the `_` catch-all is then optional), or the map is
 * partial and the `_` catch-all is required. `{}` or a partial map without `_` does not
 * type-check, and unknown kind keys are rejected.
 */
export type RecoverHandlers<
  Kinds extends string,
  T extends object,
  R,
  N extends string = string,
> =
  | ({ [K in Kinds]: RecoverHandler<K, T, R, N> } & {
      /** Catch-all handler for any unmatched error kind */
      _?: RecoverHandler<Kinds, T, R, N>
    })
  | ({ [K in Kinds]?: RecoverHandler<K, T, R, N> } & {
      /** Catch-all handler for any unmatched error kind */
      _: RecoverHandler<Kinds, T, R, N>
    })

/**
 * Provides expression-style error handling with guaranteed recovery.
 *
 * Returns the success value unchanged if not an error of the guard's set.
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
  T extends object,
  R,
  N extends string = string,
>(
  value: Success | Err<Kinds, Partial<T>, N>,
  guard: SetGuard<Kinds, T, N>,
  handlers: RecoverHandlers<Kinds, T, R, N>
): Success | R {
  // If not an error of this set, return the value unchanged
  if (!guard(value)) {
    return value
  }

  // Value is an error - look for matching handler
  const error = value
  const { kind } = error

  // Look up the specific handler, then the catch-all
  const byKind = handlers as Partial<
    Record<Kinds | "_", RecoverHandler<Kinds, T, R, N>>
  >
  const handler = byKind[kind] ?? byKind._
  if (handler !== undefined) {
    return handler(error)
  }

  // Unreachable from typed code: RecoverHandlers requires every kind or a "_" catch-all.
  // Kept as a defensive branch for untyped callers (JavaScript, casts).
  throw new Error(
    `errorset: recover() has no handler for "${error.set}.${kind}". ` +
      `Handle every kind of the set or provide a "_" catch-all handler.`
  )
}

/**
 * Handler function type for inspect.
 * Receives the error and performs side effects (returns void).
 */
export type InspectHandler<
  Kind extends string,
  T extends object,
  N extends string = string,
> = (error: Err<Kind, Partial<T>, N>) => void

/**
 * Handlers object for inspect method.
 * Partial mapping of error kinds to handler functions (all optional).
 */
export type InspectHandlers<
  Kinds extends string,
  T extends object,
  N extends string = string,
> = {
  [K in Kinds]?: InspectHandler<K, T, N>
}

/**
 * Observes errors without changing the type or control flow.
 *
 * Does nothing if the value is not an error of the guard's set.
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
  T extends object,
  N extends string = string,
>(
  value: Success | Err<Kinds, Partial<T>, N>,
  guard: SetGuard<Kinds, T, N>,
  handlers: InspectHandlers<Kinds, T, N>
): void {
  // If not an error of this set, do nothing
  if (!guard(value)) {
    return
  }

  // Value is an error - look for matching handler
  const error = value
  const { kind } = error

  // Call specific handler if provided
  const handler = handlers[kind]
  if (handler !== undefined) {
    handler(error)
  }
  // No handler for this kind - that's fine, do nothing
}

/**
 * Converts an errorset error into a real `Error`, for loggers, APMs, error reporters and
 * APIs that require `Error` instances (they read `name`, `message` and `stack`).
 *
 * The result is a new, ordinary (not frozen) `Error` with `name` `"<Set>.<kind>"`, the
 * error's `message`, `cause` set to the original error, and a stack captured where
 * `toError` is called. The original error is unchanged and still recognizable through
 * `cause` (`UserError(error.cause)`).
 *
 * @param err - An error from any error set (either shape)
 * @returns A new Error wrapping `err`
 *
 * @example
 * ```ts
 * if (UserError(result)) {
 *   logger.error(toError(result))  // name "UserError.not_found", stack, cause
 *   Sentry.captureException(toError(result))
 * }
 * ```
 */
export function toError<E extends Err<string, object, string>>(
  err: E
): Error & { readonly cause: E } {
  const error = new Error(err.message, { cause: err })
  // Own and non-enumerable, like the built-in properties of an Error
  Object.defineProperty(error, "name", {
    value: `${err.set}.${err.kind}`,
    writable: true,
    enumerable: false,
    configurable: true,
  })
  if (typeof Error.captureStackTrace === "function") {
    // Start the stack at the caller, and render the header with the new name
    Error.captureStackTrace(error, toError)
    // Bun 1.3 defines the captured stack as enumerable; keep it built-in-like
    Object.defineProperty(error, "stack", { enumerable: false })
  }
  return error as Error & { readonly cause: E }
}

/**
 * Error mapper function type for capture.
 * Receives the caught Error and returns an error set value.
 */
export type ErrorMapper<
  Kinds extends string,
  T extends object,
  N extends string = string,
> = (error: Error) => Err<Kinds, Partial<T>, N>

/**
 * Renders a thrown non-`Error` value for an error message: strings as-is, objects as
 * JSON (cycles become "[Circular]", bigints become strings), anything else with
 * `String()`. Falls back to the `Object.prototype.toString` tag when JSON can't
 * represent the value.
 *
 * @internal
 */
const renderThrown = (value: unknown): string => {
  if (typeof value === "string") {
    return value
  }
  if (typeof value !== "object" || value === null) {
    return String(value)
  }
  const seen = new WeakSet<object>()
  try {
    const json = JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === "bigint") {
        return item.toString()
      }
      if (typeof item === "object" && item !== null) {
        if (seen.has(item)) {
          return "[Circular]"
        }
        seen.add(item)
      }
      return item
    })
    if (typeof json === "string") {
      return json
    }
  } catch {
    // e.g. a throwing toJSON; use the tag below
  }
  return Object.prototype.toString.call(value)
}

/** Normalizes a caught value for the mapper: `Error`s as-is, anything else wrapped. @internal */
const toCaughtError = (caught: unknown): Error =>
  caught instanceof Error ? caught : new Error(renderThrown(caught))

/**
 * Attaches the caught value as `cause` to the mapper's error unless it already has one.
 * The mapper's error is not modified: it is copied with every property plus `cause`.
 *
 * @internal
 */
const withCaughtCause = <E>(mapped: E, caught: unknown): E => {
  if (
    !hasBrand(mapped) ||
    (mapped as { cause?: unknown }).cause !== undefined
  ) {
    return mapped
  }
  const descriptors = Object.getOwnPropertyDescriptors(mapped)
  const ordered: PropertyDescriptorMap = {}
  for (const key of Reflect.ownKeys(descriptors)) {
    ordered[key] = descriptors[
      key as keyof typeof descriptors
    ] as PropertyDescriptor
    if (key === "data") {
      ordered.cause = {
        value: caught,
        writable: true,
        enumerable: true,
        configurable: true,
      }
    }
  }
  // The copy is frozen like every error; its data is the original's frozen object
  return Object.freeze(
    Object.defineProperties(
      Object.create(Object.getPrototypeOf(mapped) as object | null),
      ordered
    )
  ) as E
}

/**
 * Wraps synchronous throwing code and converts exceptions to error set values.
 *
 * Returns the function result if no error is thrown. Otherwise the caught value is
 * passed to the mapper (non-`Error` values are wrapped in an `Error` whose message
 * renders them safely), and the original caught value becomes the mapped error's
 * `cause` unless the mapper set one.
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
 * // result is QueryResult | DbError; DbError(result) && result.cause is the original exception
 * ```
 */
export function captureSync<
  T,
  Kinds extends string,
  Data extends object,
  N extends string = string,
>(
  fn: () => T,
  mapper: ErrorMapper<Kinds, Data, N>
): T | Err<Kinds, Partial<Data>, N> {
  try {
    return fn()
  } catch (caught) {
    return withCaughtCause(mapper(toCaughtError(caught)), caught)
  }
}

/**
 * Wraps asynchronous throwing code and converts rejections to error set values.
 *
 * Returns the awaited result if nothing throws or rejects. Otherwise the caught value
 * is passed to the mapper (non-`Error` values are wrapped in an `Error` whose message
 * renders them safely), and the original caught value becomes the mapped error's
 * `cause` unless the mapper set one.
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
 * // result is QueryResult | DbError; DbError(result) && result.cause is the original exception
 * ```
 */
export async function captureAsync<
  T,
  Kinds extends string,
  Data extends object,
  N extends string = string,
>(
  fn: () => Promise<T>,
  mapper: ErrorMapper<Kinds, Data, N>
): Promise<T | Err<Kinds, Partial<Data>, N>> {
  try {
    return await fn()
  } catch (caught) {
    return withCaughtCause(mapper(toCaughtError(caught)), caught)
  }
}
