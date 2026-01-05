/**
 * Core types and constants for the errorset library.
 * @module types
 */

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
 * Creates a kind constructor function for a specific error kind.
 * This is an internal function used by errorSet().
 *
 * @param kind - The error kind string
 * @param name - The error set name (for debugging)
 * @returns A tagged template function that creates errors
 *
 * @internal
 */
export function createKindConstructor<
  Kind extends string,
  T extends Record<string, unknown>,
>(kind: Kind, name: string): KindConstructor<Kind, T> {
  return <K extends keyof T & string>(
    strings: TemplateStringsArray,
    ...keys: K[]
  ): ErrorCreator<Kind, T, K> => {
    return (
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

      return err
    }
  }
}
