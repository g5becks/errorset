/**
 * Error brand (registry symbol and protocol), the Err type and isErr.
 * @module brand
 */

/**
 * Symbol used to brand error objects.
 *
 * It is a registry symbol (`Symbol.for`), so every copy of errorset in a process
 * (bundled plugins, duplicate installs, different versions) uses the same key and
 * recognizes the others' errors. The brand's value is the protocol number
 * ({@link ERR_PROTOCOL}), not `true`.
 */
export const ERR: unique symbol = Symbol.for("@takinprofit/errorset/err")

/**
 * Version of the error shape behind the {@link ERR} brand. Guards accept the
 * protocols this copy understands; a future incompatible shape bumps the number.
 */
export const ERR_PROTOCOL = 1

/** Brand value of errors created by this version. */
export type ErrProtocol = typeof ERR_PROTOCOL

/**
 * Returns true when `value` is an object or function branded with a protocol this
 * copy understands. Shared by `isErr` and every set and kind guard.
 *
 * @internal
 */
export const hasBrand = (
  value: unknown
): value is { readonly [ERR]: ErrProtocol } => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  return (value as { [ERR]?: unknown })[ERR] === ERR_PROTOCOL
}

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
 * @typeParam Set - String literal type of the error set's name (e.g., "UserError")
 *
 * @example
 * ```ts
 * type UserNotFoundError = Err<"not_found", { id: string }>
 * ```
 */
export type Err<
  Kind extends string = string,
  Data extends object = Record<string, unknown>,
  Set extends string = string,
> = {
  /** Brand identifying an error set value; its value is the protocol number */
  readonly [ERR]: ErrProtocol
  /** Name of the error set that created this error (e.g., "UserError") */
  readonly set: Set
  /** The error kind/tag (e.g., "not_found", "validation") */
  readonly kind: Kind
  /** Human-readable error message */
  readonly message: string
  /** Extracted context data from template literal holes */
  readonly data: Data
  /**
   * What caused this error (ES2022 `cause` semantics): another errorset error, a
   * native `Error`, or any thrown value. Narrow it with `isErr` or a set guard.
   */
  readonly cause?: unknown
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
  // Every error is a plain object carrying the brand
  return hasBrand(value)
}
