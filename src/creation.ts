/**
 * Error construction on the shared prototype, the effective-config cache and creation-time options.
 * @module creation
 */

import { ERR, ERR_PROTOCOL, type ErrProtocol } from "./brand.ts"
import { type Config, getConfig, getConfigVersion } from "./config.ts"
import { ERR_PROTO } from "./serialization.ts"

/**
 * Creates an error object on `proto` with the fields in the canonical order: the brand
 * (own, enumerable symbol), `set`, `kind`, `message`, `data`, then `cause` if given.
 *
 * @internal
 */
export const newErr = (
  proto: object,
  set: string,
  kind: string,
  message: string,
  data: object,
  cause: unknown
): Record<string | symbol, unknown> => {
  const err = Object.create(proto) as Record<string | symbol, unknown>
  err[ERR] = ERR_PROTOCOL
  err.set = set
  err.kind = kind
  err.message = message
  err.data = data
  if (cause !== undefined) {
    err.cause = cause
  }
  return err
}

/**
 * Constructor for template errors: same prototype and field order as `newErr`, but
 * `new` with a fixed shape is faster than `Object.create` plus property adds.
 * `constructor` on the prototype is reset to `Object`, as for a plain object.
 *
 * @internal
 */
export class TemplateErr {
  declare [ERR]: ErrProtocol
  set: string
  kind: string
  message: string
  data: object
  constructor(set: string, kind: string, message: string, data: object) {
    this[ERR] = ERR_PROTOCOL
    this.set = set
    this.kind = kind
    this.message = message
    this.data = data
  }
}
Object.defineProperties(
  TemplateErr.prototype,
  Object.getOwnPropertyDescriptors(ERR_PROTO)
)
Object.defineProperty(TemplateErr.prototype, "constructor", { value: Object })

/**
 * Same template holes, in the same order. Only called for the same template strings
 * object, which fixes the number of holes, so the lengths are always equal.
 *
 * @internal
 */
export const sameKeys = (
  a: readonly string[],
  b: readonly string[]
): boolean => {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

/** The `data` of every no-context error: one shared, frozen empty object. @internal */
export const EMPTY_DATA = Object.freeze({}) as Record<string, never>

/** Validated fields of a serialized error, as accepted by `XError.from()`. @internal */
export type RehydrateFields = {
  message: string
  data: object
  cause: unknown
  timestamp: number | undefined
}

/**
 * Rebuilds an error of one kind from validated fields. Kept out of the kind function's
 * own properties (so kinds and reserved names are unaffected) and looked up by `from()`.
 *
 * @internal
 */
export const rehydrators = new WeakMap<
  object,
  (fields: RehydrateFields) => object | undefined
>()

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
  constructorOpt: unknown,
  config: Readonly<Config>
): void {
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
 * Returns the effective configuration of a set (global merged with the set's own),
 * cached until the global configuration changes (`configure()`, its disposer or
 * `resetConfig()` bump the configuration version).
 *
 * @internal
 */
export const cachedConfig = (
  instanceConfig: Partial<Config> | undefined
): (() => Readonly<Config>) => {
  let version = -1
  let config = getConfig()
  return () => {
    const current = getConfigVersion()
    if (current !== version) {
      version = current
      config = instanceConfig
        ? { ...getConfig(), ...instanceConfig }
        : getConfig()
    }
    return config
  }
}

/**
 * Applies the creation-time options of the effective config to a new error:
 * `timestamp` when `includeTimestamp` is on, and a stack trace when `includeStack` is
 * on. When `includeTimestamp` is off the `timestamp` property is absent, not
 * `undefined`. Both checks are plain property reads, so nothing is allocated when the
 * options are off.
 *
 * @internal
 */
export function applyCreationConfig(
  target: Record<string, unknown>,
  constructorOpt: unknown,
  config: Readonly<Config>
): void {
  if (config.includeTimestamp) {
    // Errors are frozen right after creation, so this becomes read-only too
    target.timestamp = Date.now()
  }
  if (config.includeStack) {
    captureStack(target, constructorOpt, config)
  }
}
