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
