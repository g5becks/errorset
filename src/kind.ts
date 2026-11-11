/**
 * Kind functions: error creation (template and no-context), kind guards and rehydration per kind.
 * @module kind
 */

import { type Err, hasBrand } from "./brand.ts"
import type { Config } from "./config.ts"
import {
  applyCreationConfig,
  cachedConfig,
  EMPTY_DATA,
  newErr,
  type RehydrateFields,
  rehydrators,
  sameKeys,
  TemplateErr,
} from "./creation.ts"
import { ERR_PROTO, interpolate } from "./serialization.ts"
import type {
  ErrorCreator,
  ErrorOptions,
  KindFunction,
  NoContextErr,
} from "./types.ts"

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
  T extends object,
  N extends string = string,
>(
  kind: Kind,
  name: N,
  instanceConfig?: Partial<Config>,
  declaredKeys?: readonly string[]
): KindFunction<Kind, T, N> {
  // Effective config, recomputed only when the global configuration changes
  const effectiveConfig = cachedConfig(instanceConfig)

  // No-context errors (templates without holes) are plain error objects on a per-kind
  // prototype that adds with(): it returns a new error with the same message plus
  // options, so errors never need mutating.
  const createNoContext = (
    message: string,
    options: ErrorOptions | undefined,
    constructorOpt: unknown
  ): NoContextErr<Kind, N> => {
    const err = newErr(
      noContextProto,
      name,
      kind,
      message,
      EMPTY_DATA,
      options?.cause
    )
    applyCreationConfig(err, constructorOpt, effectiveConfig())
    // Errors are immutable, matching their readonly types (EMPTY_DATA is frozen once)
    return Object.freeze(err) as unknown as NoContextErr<Kind, N>
  }
  const withOptions = function (
    this: { message: string },
    options: ErrorOptions
  ): NoContextErr<Kind, N> {
    return createNoContext(this.message, options, withOptions)
  }
  const noContextProto: object = Object.create(ERR_PROTO, {
    with: { value: withOptions },
  })

  // Rehydration (XError.from): same shape and prototype as a created error, with the
  // serialized timestamp kept and no stack. Empty data means the no-context shape.
  const rehydrate = ({
    message,
    data,
    cause,
    timestamp,
  }: RehydrateFields): object | undefined => {
    // A kind with declared keys needs every one of them, and keeps only them
    if (
      declaredKeys !== undefined &&
      !declaredKeys.every(key => Object.hasOwn(data, key))
    ) {
      return
    }
    const source = declaredKeys
      ? Object.fromEntries(
          declaredKeys.map(key => [key, (data as Record<string, unknown>)[key]])
        )
      : data
    const noContext = Object.keys(source).length === 0
    const err = newErr(
      noContext ? noContextProto : ERR_PROTO,
      name,
      kind,
      message,
      noContext ? EMPTY_DATA : Object.freeze({ ...source }),
      cause
    )
    if (timestamp !== undefined) {
      err.timestamp = timestamp
    }
    return Object.freeze(err)
  }

  /**
   * Builds the creator for one template: everything that depends only on the call site
   * (data keys, hole count, a plain copy of the strings) is computed once here.
   */
  const makeCreator = <K extends keyof T & string>(
    strings: TemplateStringsArray,
    keys: readonly K[]
  ): ErrorCreator<Kind, T, K, N> => {
    // Data keys: the declared ones (object form) or the template's holes
    const dataKeys = (declaredKeys ?? keys) as readonly K[]
    const dataKeyCount = dataKeys.length
    const holeCount = keys.length
    // A plain copy of the template strings: much cheaper to index than the frozen
    // TemplateStringsArray (measured ~10 ns per error on Bun 1.4)
    const parts = Array.from(strings)
    const first = parts[0] ?? ""

    const creator = (
      entity: Pick<T, K>,
      options?: ErrorOptions
    ): Err<Kind, Pick<T, K>, N> => {
      // Extract only the data keys into data
      const data = {} as Record<string, unknown>
      for (let i = 0; i < dataKeyCount; i += 1) {
        const key = dataKeys[i] as K
        data[key] = entity[key]
      }

      // Build the message; strings (the common case) skip interpolate()
      let message = first
      for (let i = 0; i < holeCount; i += 1) {
        const value: unknown = entity[keys[i] as K]
        message += typeof value === "string" ? value : interpolate(value)
        message += parts[i + 1] ?? ""
      }

      const err = new TemplateErr(
        name,
        kind,
        message,
        data
      ) as unknown as Record<string | symbol, unknown>
      if (options?.cause !== undefined) {
        err.cause = options.cause
      }
      const config = effectiveConfig()
      if (config.includeTimestamp || config.includeStack) {
        applyCreationConfig(err, creator, config)
      }

      // Errors are immutable, matching their readonly types (data is a shallow freeze)
      Object.freeze(data)
      return Object.freeze(err) as unknown as Err<Kind, Pick<T, K>, N>
    }
    return creator
  }

  // Single-entry cache of the last template creator: the template strings object is
  // unique per call site, so the same strings with the same holes is an exact hit
  let lastStrings: TemplateStringsArray | undefined
  let lastKeys: readonly string[] = []
  let lastCreator: unknown

  // The dual-purpose function
  const kindFn = <K extends keyof T & string>(
    stringsOrValue: TemplateStringsArray | object | null | undefined,
    ...keys: K[]
  ): ErrorCreator<Kind, T, K, N> | NoContextErr<Kind, N> | boolean => {
    // Check if called as tagged template literal
    // TemplateStringsArray is an array with a 'raw' property
    if (
      Array.isArray(stringsOrValue) &&
      "raw" in stringsOrValue &&
      Array.isArray((stringsOrValue as TemplateStringsArray).raw)
    ) {
      const strings = stringsOrValue as TemplateStringsArray

      // When no template keys, return a plain error object directly
      // This allows: BackupError.config_invalid`S3 config required`
      // and, with options: BackupError.config_invalid`S3 config required`.with({ cause })
      // (A kind with declared keys always takes the entity, unless it declares none.)
      if (keys.length === 0 && !declaredKeys?.length) {
        return createNoContext(strings.join(""), undefined, kindFn)
      }
      if (strings !== lastStrings || !sameKeys(lastKeys, keys)) {
        lastStrings = strings
        lastKeys = keys
        lastCreator = makeCreator(strings, keys)
      }
      return lastCreator as ErrorCreator<Kind, T, K, N>
    }

    // Called as guard - check if value is this specific error kind
    const value = stringsOrValue
    if (!hasBrand(value)) {
      return false
    }

    // Set-precise: another set's error with the same kind name does not match
    const candidate = value as unknown as Record<string, unknown>
    return candidate.kind === kind && candidate.set === name
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

  rehydrators.set(kindFn, rehydrate)

  return kindFn as KindFunction<Kind, T, N>
}
