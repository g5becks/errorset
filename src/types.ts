/**
 * Core types and constants for the errorset library.
 * @module types
 */

import { getConfig } from "./config.ts"

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
 * Options for error creation.
 */
export type ErrorOptions = {
  /** Optional wrapped error that caused this error */
  cause?: Err<string, Record<string, unknown>>
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
function captureStack(target: object, constructorOpt?: unknown): void {
  const config = getConfig()
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
>(kind: Kind, name: string): KindFunction<Kind, T> {
  // The dual-purpose function
  const kindFn = <K extends keyof T & string>(
    stringsOrValue: TemplateStringsArray | unknown,
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
        captureStack(err, creator)

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
