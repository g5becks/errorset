/**
 * Core types and constants for the errorset library.
 * @module types
 */

import { type Config, getConfig, getConfigVersion } from "./config.ts"

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
const hasBrand = (value: unknown): value is { readonly [ERR]: ErrProtocol } => {
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

/**
 * Optional configuration for error set initialization.
 */
export type ErrorSetConfig = Partial<Config>

/**
 * Options for error creation.
 */
export type ErrorOptions = {
  /** What caused this error: an errorset error, a native `Error`, or any value */
  cause?: unknown
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
 * Kind names an error set cannot use. A kind becomes a property of the set, which is
 * a function, so it must not collide with:
 * - the set's own members (`recover`, `inspect`, `merge`, `capture`, `captureAsync`,
 *   `kinds`, `Type`, and `from`, reserved for rehydration);
 * - the `_` catch-all key of `recover` handlers;
 * - names every function inherits from `Function.prototype` and `Object.prototype`.
 */
export const RESERVED_KINDS = [
  // error set members
  "recover",
  "inspect",
  "merge",
  "capture",
  "captureAsync",
  "kinds",
  "Type",
  "from",
  // recover catch-all key
  "_",
  // Function.prototype and own function properties
  "name",
  "length",
  "apply",
  "bind",
  "call",
  "arguments",
  "caller",
  // Object.prototype
  "constructor",
  "toString",
  "toLocaleString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "__proto__",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
] as const

/** Union of the reserved kind names. */
export type ReservedKind = (typeof RESERVED_KINDS)[number]

/**
 * Rejects tuples containing a reserved kind name: the parameter type becomes a
 * one-element tuple holding a message that names the reserved word.
 *
 * @example
 * ```ts
 * type A = NoReserved<["a", "b"]>        // ["a", "b"]
 * type B = NoReserved<["a", "recover"]>  // readonly ['"recover" is a reserved kind name in errorset; rename the kind']
 * ```
 */
export type NoReserved<T extends readonly string[]> = [
  Extract<T[number], ReservedKind>,
] extends [never]
  ? T
  : readonly [
      `"${Extract<T[number], ReservedKind>}" is a reserved kind name in errorset; rename the kind`,
    ]

const reservedKindNames: ReadonlySet<string> = new Set(RESERVED_KINDS)

/**
 * Builder type returned by errorSet() that allows binding the entity type.
 *
 * @typeParam Kinds - Tuple type of error kind strings
 */
export type ErrorSetBuilder<
  Kinds extends readonly string[],
  N extends string = string,
  Spec extends KindKeys | undefined = undefined,
> = {
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
  init<T extends object & { [K in DeclaredKeyUnion<Spec>]: unknown }>(
    config?: ErrorSetConfig
  ): ErrorSet<Kinds[number], T, N, Spec>
}

/**
 * Object form of `errorSet()`'s kinds: each kind name maps to the entity keys its
 * errors carry in `data`, e.g. `{ not_found: ["id"], suspended: ["id", "reason"] }`.
 */
export type KindKeys = Readonly<Record<string, readonly string[]>>

/** Every key declared in a `KindKeys` spec (never for the array form). @internal */
type DeclaredKeyUnion<Spec> = Spec extends KindKeys
  ? Spec[keyof Spec][number]
  : never

/**
 * The declared data keys of kind `K`, wrapped so that "declared, but no keys" (`never`)
 * differs from "not declared" (`undefined`, the array form).
 */
export type DeclaredKeys<Spec, K> = Spec extends KindKeys
  ? K extends keyof Spec
    ? { readonly keys: Spec[K][number] }
    : undefined
  : undefined

/** `data` of a kind: exactly the declared keys, or `Partial<T>` for the array form. */
export type KindData<T, Declared> = Declared extends {
  readonly keys: infer D extends string
}
  ? Pick<T, D & keyof T>
  : Partial<T>

/**
 * Rejects reserved kind names in the object form, naming the word (like `NoReserved`).
 */
export type NoReservedKeys<Spec extends KindKeys> = [
  Extract<keyof Spec, ReservedKind>,
] extends [never]
  ? Spec
  : {
      readonly [K in Extract<
        keyof Spec,
        ReservedKind
      >]: `"${K & string}" is a reserved kind name in errorset; rename the kind`
    }

/**
 * Function returned by template literal that creates the error.
 * Accepts entity data and optional error options.
 */
export type ErrorCreator<
  Kind extends string,
  T extends object,
  K extends keyof T,
  N extends string = string,
> = (entity: Pick<T, K>, options?: ErrorOptions) => Err<Kind, Pick<T, K>, N>

/**
 * Error created from a template without holes: a plain error object (so it survives
 * `JSON.stringify` and `structuredClone`) with a non-enumerable `with()` that returns
 * a new error of the same kind and message with options such as `cause`.
 *
 * @example
 * ```ts
 * // Use directly as an error value
 * return BackupError.config_invalid`S3 configuration required`
 *
 * // Add a cause: returns a new error, the original is unchanged
 * return BackupError.config_invalid`S3 configuration required`.with({ cause: someError })
 * ```
 */
export type NoContextErr<Kind extends string, N extends string = string> = Err<
  Kind,
  Record<string, never>,
  N
> & {
  /** Returns a new error with the same set, kind and message, plus these options */
  with(options: ErrorOptions): NoContextErr<Kind, N>
}

/**
 * Tagged template function for a specific error kind.
 * Constrains template holes to valid field names from the entity type.
 *
 * When called with no template holes, returns a plain error object (NoContextErr)
 * that can be used directly; `.with(options)` returns a new one with a cause.
 *
 * When called with template holes, returns an ErrorCreator that must be
 * called with entity data containing the referenced fields.
 */
export type KindConstructor<
  Kind extends string,
  T extends object,
  N extends string = string,
  Declared extends { readonly keys: string } | undefined = undefined,
> = Declared extends { readonly keys: infer D extends string }
  ? [D & keyof T] extends [never]
    ? // Declared with no keys: only no-context errors
      (strings: TemplateStringsArray) => NoContextErr<Kind, N>
    : // Declared keys: holes limited to them, data is always exactly those keys
      (
        strings: TemplateStringsArray,
        ...keys: (D & keyof T & string)[]
      ) => ErrorCreator<Kind, T, D & keyof T, N>
  : {
      // Overload for no template holes - returns a plain error object
      (strings: TemplateStringsArray): NoContextErr<Kind, N>
      // Overload for template holes - returns ErrorCreator
      <K extends keyof T & string>(
        strings: TemplateStringsArray,
        ...keys: K[]
      ): ErrorCreator<Kind, T, K, N>
    }

/**
 * Kind-level guard function type.
 * Checks if a value is a specific error kind.
 */
export type KindGuard<
  Kind extends string,
  T extends object,
  N extends string = string,
  Declared extends { readonly keys: string } | undefined = undefined,
> = (value: unknown) => value is Err<Kind, KindData<T, Declared>, N>

/**
 * Dual-purpose kind function that acts as both:
 * 1. Tagged template literal for error creation
 * 2. Type guard for checking specific error kind
 */
export type KindFunction<
  Kind extends string,
  T extends object,
  N extends string = string,
  Declared extends { readonly keys: string } | undefined = undefined,
> = KindConstructor<Kind, T, N, Declared> & KindGuard<Kind, T, N, Declared>

/**
 * JSON shape of an error: `{ set, kind, message, data, cause?, timestamp? }`.
 */
type ErrJSON = {
  set: string
  kind: string
  message: string
  data: unknown
  cause?: unknown
  timestamp?: number
}

type SerializableErr = {
  set: string
  kind: string
  message: string
  data: unknown
  cause?: unknown
  timestamp?: number
}

/**
 * Serializes a cause for JSON. errorset errors serialize through their own
 * `toJSON` when `JSON.stringify` recurses; a native `Error` would otherwise
 * become `{}`, so it is reduced to `{ name, message, code? }` (no stack).
 */
const serializeCause = (cause: unknown): unknown => {
  if (!(cause instanceof Error)) {
    return cause
  }
  const { code } = cause as Error & { code?: unknown }
  return typeof code === "string" || typeof code === "number"
    ? { name: cause.name, message: cause.message, code }
    : { name: cause.name, message: cause.message }
}

/**
 * Shared `toJSON` for every error: `{ set, kind, message, data, cause?, timestamp? }`.
 */
function errToJSON(this: SerializableErr): ErrJSON {
  const json: ErrJSON = {
    set: this.set,
    kind: this.kind,
    message: this.message,
    data: this.data,
  }
  if (this.cause !== undefined) {
    json.cause = serializeCause(this.cause)
  }
  if (this.timestamp !== undefined) {
    json.timestamp = this.timestamp
  }
  return json
}

/**
 * Shared prototype of every error. `toJSON`, `toString` and the Node.js inspect hook
 * live here (non-enumerable), not on each error, so creating an error allocates no
 * closures; `Object.keys`, spreading, deep equality and JSON output are unchanged.
 * The inspect hook is a getter that returns a function bound to the error, so it also
 * works when read off the error and called detached.
 *
 * @internal
 */
const ERR_PROTO: object = Object.create(Object.prototype, {
  toJSON: { value: errToJSON },
  toString: {
    value(this: { set: string; kind: string; message: string }): string {
      return `${this.set}.${this.kind}: ${this.message}`
    },
  },
  [INSPECT]: {
    get(this: { set: string; kind: string; data: unknown }): () => string {
      const { set, kind, data } = this
      return () => `${set}.${kind} ${JSON.stringify(data)}`
    },
  },
})

/**
 * Creates an error object on `proto` with the fields in the canonical order: the brand
 * (own, enumerable symbol), `set`, `kind`, `message`, `data`, then `cause` if given.
 *
 * @internal
 */
const newErr = (
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
class TemplateErr {
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
const sameKeys = (a: readonly string[], b: readonly string[]): boolean => {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

/** The `data` of every no-context error: one shared, frozen empty object. @internal */
const EMPTY_DATA = Object.freeze({}) as Record<string, never>

/** Validated fields of a serialized error, as accepted by `XError.from()`. @internal */
type RehydrateFields = {
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
const rehydrators = new WeakMap<
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
const cachedConfig = (
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
function applyCreationConfig(
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

/** Longest rendering of an object in a message before it is cut off with "…". @internal */
const MAX_INTERPOLATED_LENGTH = 200

/** JSON with `[Circular]` for cycles (ancestors only) and `<n>n` for bigints. @internal */
const cycleSafeJson = (value: object): string | undefined => {
  const ancestors: unknown[] = []
  try {
    return JSON.stringify(
      value,
      function (this: unknown, _key: string, item: unknown): unknown {
        if (typeof item === "bigint") {
          return `${item}n`
        }
        if (typeof item !== "object" || item === null) {
          return item
        }
        // `this` is the object holding `item`: drop ancestors that are not on its path
        while (ancestors.length > 0 && ancestors.at(-1) !== this) {
          ancestors.pop()
        }
        if (ancestors.includes(item)) {
          return "[Circular]"
        }
        ancestors.push(item)
        return item
      }
    )
  } catch {
    // e.g. a throwing toJSON: the caller falls back to the object tag
  }
}

/** Renders an object for a message: Date as ISO, own toString, else truncated JSON. @internal */
const interpolateObject = (value: object): string => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString()
  }
  // Errors, errorset errors, URL and classes with their own toString read best that way
  const ownToString = (value as { toString?: unknown }).toString
  if (
    !Array.isArray(value) &&
    typeof ownToString === "function" &&
    ownToString !== Object.prototype.toString
  ) {
    return String(value)
  }
  const json = cycleSafeJson(value)
  if (json === undefined) {
    return Object.prototype.toString.call(value)
  }
  return json.length > MAX_INTERPOLATED_LENGTH
    ? `${json.slice(0, MAX_INTERPOLATED_LENGTH)}…`
    : json
}

/**
 * Renders a template value into an error message without losing information: strings
 * as-is, `null`/`undefined` literally, bigints with an `n` suffix, dates as ISO strings,
 * functions by name, objects through their own `toString` or as cycle-safe JSON
 * (truncated to 200 characters). `data` keeps the original values.
 *
 * @internal
 */
const interpolate = (value: unknown): string => {
  switch (typeof value) {
    case "bigint":
      return `${value}n`
    case "function":
      return value.name ? `[Function: ${value.name}]` : "[Function]"
    case "object":
      return value === null ? "null" : interpolateObject(value)
    default:
      // string, undefined, number, boolean, symbol
      return String(value)
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

/**
 * `XError.from(value)`: validates a serialized error of the set named `name` and
 * returns a branded, frozen error, or `undefined` when the value doesn't match.
 *
 * @internal
 */
const rehydrateFrom = (
  value: unknown,
  name: string,
  kindFns: ReadonlyMap<string, object>,
  isMember: (value: unknown) => boolean
): object | undefined => {
  if (typeof value !== "object" || value === null) {
    return
  }
  // Already a live error of this set (this copy of errorset or another one)
  if (isMember(value)) {
    return value
  }
  const candidate = value as Record<string, unknown>
  const { set, kind, message, data, cause, timestamp } = candidate
  if (set !== name || typeof kind !== "string" || typeof message !== "string") {
    return
  }
  const kindFn = kindFns.get(kind)
  const rehydrate = kindFn && rehydrators.get(kindFn)
  if (
    rehydrate === undefined ||
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data) ||
    (timestamp !== undefined && typeof timestamp !== "number")
  ) {
    return
  }
  return rehydrate({ message, data, cause, timestamp })
}

/**
 * Type for the set-level guard function.
 * Checks if a value is any error from this error set.
 */
export type SetGuard<
  Kinds extends string,
  T extends object,
  N extends string = string,
> = ((value: unknown) => value is Err<Kinds, Partial<T>, N>) & {
  /** Symbol.hasInstance for instanceof support */
  [Symbol.hasInstance](value: unknown): value is Err<Kinds, Partial<T>, N>
}

/**
 * Key under which a guard stores the (set, kind) pairs it accepts, so `merge` can
 * combine guards without losing set precision. A registry symbol, so guards from
 * another copy of errorset can be merged too.
 *
 * @internal
 */
const MEMBERS: unique symbol = Symbol.for("@takinprofit/errorset/members")

/**
 * One accepted (set, kind) pair. `set: undefined` accepts the kind from any set
 * (only produced by the deprecated helpers when called without a set name).
 *
 * @internal
 */
type Member = { readonly set: string | undefined; readonly kind: string }

/** Builds a set-precise membership test from (set, kind) pairs. @internal */
const membershipTest = (
  members: readonly Member[]
): ((set: unknown, kind: string) => boolean) => {
  const bySet = new Map<string | undefined, Set<string>>()
  for (const { set, kind } of members) {
    const kinds = bySet.get(set) ?? new Set<string>()
    kinds.add(kind)
    bySet.set(set, kinds)
  }
  const anySet = bySet.get(undefined)
  return (set, kind) =>
    (typeof set === "string" && (bySet.get(set)?.has(kind) ?? false)) ||
    (anySet?.has(kind) ?? false)
}

/**
 * Guard for the pairs of one named set (every errorSet guard): brand, set and kind
 * checks inlined, kinds in a Set so membership is constant-time. Undefined when the
 * members span several sets (or any set).
 *
 * @internal
 */
const singleSetGuard = <
  Kinds extends string,
  T extends object,
  N extends string,
>(
  members: readonly Member[]
): ((value: unknown) => value is Err<Kinds, Partial<T>, N>) | undefined => {
  const name = members[0]?.set
  if (name === undefined || members.some(member => member.set !== name)) {
    return
  }
  // Array#includes grew to ~43 ns at 40 kinds (audit P2); Set#has stays ~5 ns
  const kinds = new Set(members.map(member => member.kind))
  return (value: unknown): value is Err<Kinds, Partial<T>, N> =>
    typeof value === "object" &&
    value !== null &&
    (value as { [ERR]?: unknown })[ERR] === ERR_PROTOCOL &&
    (value as { set?: unknown }).set === name &&
    kinds.has((value as { kind?: unknown }).kind as string)
}

/** Guard for pairs from several sets (merged guards, legacy any-set members). @internal */
const multiSetGuard = <
  Kinds extends string,
  T extends object,
  N extends string,
>(
  members: readonly Member[]
): ((value: unknown) => value is Err<Kinds, Partial<T>, N>) => {
  const accepts = membershipTest(members)
  return (value: unknown): value is Err<Kinds, Partial<T>, N> => {
    // Must carry a brand this copy understands
    if (!hasBrand(value)) {
      return false
    }
    const { kind, set } = value as unknown as Record<string, unknown>
    return typeof kind === "string" && accepts(set, kind)
  }
}

/** Creates a guard over (set, kind) pairs, with instanceof support. @internal */
const createMemberGuard = <
  Kinds extends string,
  T extends object,
  N extends string,
>(
  members: readonly Member[]
): SetGuard<Kinds, T, N> => {
  const guard = singleSetGuard<Kinds, T, N>(members) ?? multiSetGuard(members)

  Object.defineProperties(guard, {
    [Symbol.hasInstance]: { value: (value: unknown): boolean => guard(value) },
    [MEMBERS]: { value: members },
  })

  return guard as SetGuard<Kinds, T, N>
}

/** The (set, kind) pairs a guard accepts; a guard without them accepts its kinds from any set. @internal */
const membersOf = (guard: {
  readonly kinds: readonly string[]
}): readonly Member[] =>
  (guard as { [MEMBERS]?: readonly Member[] })[MEMBERS] ??
  guard.kinds.map(kind => ({ set: undefined, kind }))

/**
 * Creates a set-level type guard for an error set.
 * Returns true if the value is an error of one of `kinds` created by the set named
 * `setName`. Also supports the instanceof operator via Symbol.hasInstance.
 *
 * @param kinds - Array of valid error kinds for this set
 * @param setName - Name of the set; without it, the guard accepts these kinds from any set
 * @returns A type guard function with instanceof support
 *
 * @example
 * ```ts
 * const UserError = createSetGuard<"not_found" | "invalid", User>(["not_found", "invalid"], "UserError")
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
  T extends object,
  N extends string = string,
>(kinds: Kinds[], setName?: N): SetGuard<Kinds, T, N> {
  return createMemberGuard<Kinds, T, N>(
    kinds.map(kind => ({ set: setName, kind }))
  )
}

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
 * Extended SetGuard with kinds array for merge operations.
 * Internal type used to access the kinds from a guard.
 */
export type SetGuardWithKinds<
  Kinds extends string,
  T extends object,
  N extends string = string,
> = SetGuard<Kinds, T, N> & {
  /** Array of valid kinds for this set */
  readonly kinds: readonly Kinds[]
}

/** Adds the non-enumerable `kinds` array to a guard. @internal */
const withKinds = <Kinds extends string, T extends object, N extends string>(
  guard: SetGuard<Kinds, T, N>,
  kinds: readonly Kinds[]
): SetGuardWithKinds<Kinds, T, N> => {
  Object.defineProperty(guard, "kinds", { value: kinds })
  return guard as SetGuardWithKinds<Kinds, T, N>
}

/**
 * Creates a set-level type guard with accessible kinds array.
 * This is used internally for merge operations.
 *
 * @param kinds - Array of valid error kinds for this set
 * @param setName - Name of the set; without it, the guard accepts these kinds from any set
 * @returns A type guard function with kinds array and instanceof support
 *
 * @internal
 */
export function createSetGuardWithKinds<
  Kinds extends string,
  T extends object,
  N extends string = string,
>(kinds: readonly Kinds[], setName?: N): SetGuardWithKinds<Kinds, T, N> {
  return withKinds(createSetGuard<Kinds, T, N>([...kinds], setName), kinds)
}

/** Any guard `merge` accepts: an error set, or a guard returned by `merge`. */
export type MergeInput = ((
  value: unknown
) => value is Err<string, object, string>) & {
  readonly kinds: readonly string[]
}

/** The error type a guard narrows to. */
export type GuardedError<G> = G extends (value: unknown) => value is infer E
  ? E
  : never

/** The errors of `E` created by the set named `S`, with kind `K`. */
type MergedErr<E, S, K> =
  E extends Err<string, infer D, infer N>
    ? N extends S
      ? Err<K & string, D, N>
      : never
    : never

/** Kinds of the set named `S` within `E`. */
type MergedKinds<E, S> =
  E extends Err<infer K, object, infer N> ? (N extends S ? K : never) : never

/** One handler per (set, kind) pair, nested by set name. */
type MergedHandlerMap<E extends Err<string, object, string>, R> = {
  [S in E["set"]]: {
    [K in MergedKinds<E, S>]: (error: MergedErr<E, S, K>) => R
  }
}

/** Any subset of the (set, kind) handlers, nested by set name. */
type PartialMergedHandlerMap<E extends Err<string, object, string>, R> = {
  [S in E["set"]]?: {
    [K in MergedKinds<E, S>]?: (error: MergedErr<E, S, K>) => R
  }
}

/**
 * Handlers for a merged guard's `recover`, nested by set name then kind, so sets that
 * share a kind name get separate handlers. Exhaustive: either every (set, kind) pair
 * has a handler (`_` optional), or the map is partial and the `_` catch-all is required.
 */
export type MergedRecoverHandlers<E extends Err<string, object, string>, R> =
  | (MergedHandlerMap<E, R> & {
      /** Catch-all handler for any unmatched error */
      _?: (error: E) => R
    })
  | (PartialMergedHandlerMap<E, R> & {
      /** Catch-all handler for any unmatched error */
      _: (error: E) => R
    })

/** Handlers for a merged guard's `inspect`: any subset, nested by set name then kind. */
export type MergedInspectHandlers<E extends Err<string, object, string>> =
  PartialMergedHandlerMap<E, void>

/**
 * Guard returned by `merge`: accepts the errors of every merged set, narrowing to the
 * union of their error types (a discriminated union over `set`, so `data` narrows when
 * you check `err.set`). Has `recover`, `inspect` and `merge` like an error set.
 */
export type MergedGuard<E extends Err<string, object, string>> = ((
  value: unknown
) => value is E) & {
  /** Symbol.hasInstance for instanceof support */
  [Symbol.hasInstance](value: unknown): value is E
  /** The merged kind names, each listed once (sets may share a kind name) */
  readonly kinds: readonly E["kind"][]
  /**
   * Expression-style handling, exhaustive over (set, kind) pairs or with `_`.
   * Handlers are nested by set name: `{ OrderError: { rejected: e => … }, _: e => … }`.
   */
  recover<Success, R>(
    value: Success | E,
    handlers: MergedRecoverHandlers<E, R>
  ): Success | R
  /** Observe errors without changing type or control flow; handlers nested by set name. */
  inspect<Success>(value: Success | E, handlers: MergedInspectHandlers<E>): void
  /** Merge with more sets or merged guards. */
  merge<G extends MergeInput[]>(
    ...others: G
  ): MergedGuard<E | GuardedError<G[number]>>
}

/** Own-property lookup, so inherited properties of a handler map never match. @internal */
const ownHandler = (map: unknown, key: string): unknown =>
  typeof map === "object" && map !== null && Object.hasOwn(map, key)
    ? (map as Record<string, unknown>)[key]
    : undefined

/** De-duplication key of a (set, kind) pair; `set: undefined` means any set. @internal */
const memberKey = ({ set, kind }: Member): string =>
  set === undefined ? `*\u0000${kind}` : `=${set}\u0000${kind}`

/**
 * Merges error sets (or merged guards) into one guard.
 *
 * The merged guard accepts exactly the errors one of the inputs accepts: (set, kind)
 * pairs are combined and de-duplicated, so set precision is kept and sets that share
 * a kind name stay distinct. It narrows to the union of the inputs' error types, and
 * has `recover`, `inspect` and `merge`. The inputs are unchanged.
 *
 * @param guards - Error sets or merged guards
 * @returns A guard that matches errors from any of them
 *
 * @example
 * ```ts
 * const TradingError = merge(OrderError, PositionError, AccountError)
 *
 * if (TradingError(result) && result.set === "PositionError") {
 *   result.data.positionId // narrowed to Position's data
 * }
 *
 * const status = TradingError.recover(result, {
 *   OrderError: { rejected: () => 409 },
 *   _: () => 500,
 * })
 * ```
 */
export function merge<G extends [MergeInput, ...MergeInput[]]>(
  ...guards: G
): MergedGuard<GuardedError<G[number]>> {
  const unique = new Map<string, Member>()
  for (const guard of guards) {
    for (const member of membersOf(guard)) {
      const key = memberKey(member)
      if (!unique.has(key)) {
        unique.set(key, member)
      }
    }
  }
  const members = [...unique.values()]
  const kinds = [...new Set(members.map(member => member.kind))]
  const guard = withKinds(
    createMemberGuard<string, object, string>(members),
    kinds
  ) as unknown as MergedGuard<GuardedError<G[number]>>

  const recoverMerged = (value: unknown, handlers: object): unknown => {
    if (!guard(value)) {
      return value
    }
    const { set, kind } = value as { set: string; kind: string }
    const handler = (ownHandler(ownHandler(handlers, set), kind) ??
      ownHandler(handlers, "_")) as ((error: unknown) => unknown) | undefined
    if (handler !== undefined) {
      return handler(value)
    }
    // Unreachable from typed code (exhaustive handlers); defensive for untyped callers
    throw new Error(
      `errorset: recover() has no handler for "${set}.${kind}". ` +
        `Handle every (set, kind) pair or provide a "_" catch-all handler.`
    )
  }

  const inspectMerged = (value: unknown, handlers: object): void => {
    if (!guard(value)) {
      return
    }
    const { set, kind } = value as { set: string; kind: string }
    const handler = ownHandler(ownHandler(handlers, set), kind) as
      | ((error: unknown) => void)
      | undefined
    handler?.(value)
  }

  Object.defineProperties(guard, {
    recover: { value: recoverMerged },
    inspect: { value: inspectMerged },
    merge: {
      value: (...others: MergeInput[]) => merge(guard, ...others),
    },
  })
  return guard
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
  T extends object,
  N extends string = string,
  Spec extends KindKeys | undefined = undefined,
> = SetGuardWithKinds<Kinds, T, N> & {
  /** Kind constructors indexed by kind name */
  [K in Kinds]: KindFunction<K, T, N, DeclaredKeys<Spec, K>>
} & {
  /**
   * Type helper for exporting error set type.
   * Use: export type MyError = typeof MyError.Type
   */
  readonly Type: Err<Kinds, Partial<T>, N>

  /**
   * Rehydrates an error of this set after JSON, `structuredClone`, `postMessage` or
   * any other transport that drops the brand symbol.
   *
   * Validates `{ set, kind, message, data, cause?, timestamp? }` (`set` must be this
   * set's name, `kind` one of its kinds, `data` a plain object) and returns a branded,
   * frozen error that every guard recognizes, or `undefined` for anything else. Extra
   * fields are ignored; `cause` is kept as-is (rehydrate it with its own set's `from`);
   * no stack is captured. A live error of this set is returned unchanged.
   *
   * @example
   * ```ts
   * const err = UserError.from(JSON.parse(body))
   * if (UserError.not_found(err)) { ... }
   * ```
   */
  from(value: unknown): Err<Kinds, Partial<T>, N> | undefined

  /**
   * Expression-style error handling with guaranteed recovery.
   */
  recover<Success, R>(
    value: Success | Err<Kinds, Partial<T>, N>,
    handlers: RecoverHandlers<Kinds, T, R, N>
  ): Success | R

  /**
   * Observe errors without changing type or control flow.
   */
  inspect<Success>(
    value: Success | Err<Kinds, Partial<T>, N>,
    handlers: InspectHandlers<Kinds, T, N>
  ): void

  /**
   * Merge with other error sets (or merged guards) into one guard; see `merge`.
   */
  merge<G extends MergeInput[]>(
    ...others: G
  ): MergedGuard<Err<Kinds, Partial<T>, N> | GuardedError<G[number]>>

  /**
   * Wrap synchronous throwing code.
   */
  capture<Result>(
    fn: () => Result,
    mapper: ErrorMapper<Kinds, T, N>
  ): Result | Err<Kinds, Partial<T>, N>

  /**
   * Wrap asynchronous throwing code.
   */
  captureAsync<Result>(
    fn: () => Promise<Result>,
    mapper: ErrorMapper<Kinds, T, N>
  ): Promise<Result | Err<Kinds, Partial<T>, N>>

  /**
   * Iterator for error kind names.
   * Allows for...of loops and spread syntax.
   */
  [Symbol.iterator](): IterableIterator<string>
}

/**
 * Kinds of every set name defined in this copy of errorset, for the duplicate-name check.
 *
 * Errors are matched by set name, so two different sets with the same name accept each
 * other's errors for the kinds they share. Policy: redefining a name with the same kinds
 * (hot reload, re-evaluated modules, tests) is silent; redefining it with different kinds
 * warns once per name. It never throws, so hot reload keeps working.
 *
 * @internal
 */
const definedSets = new Map<string, string>()
const warnedSetNames = new Set<string>()

const registerSetName = (name: string, kinds: readonly string[]): void => {
  const signature = [...kinds].sort().join("\u0000")
  const previous = definedSets.get(name)
  definedSets.set(name, signature)
  if (
    previous === undefined ||
    previous === signature ||
    warnedSetNames.has(name)
  ) {
    return
  }
  warnedSetNames.add(name)
  console.warn(
    `errorset: error set "${name}" is defined more than once with different kinds. ` +
      "Errors are matched by set name, so these sets accept each other's errors for " +
      "shared kinds. Give each error set a unique name."
  )
}

/**
 * Splits `errorSet()`'s second argument into kind names and, for the object form, the
 * declared data keys per kind. Validates the shape for untyped callers.
 *
 * @internal
 */
const normalizeKinds = (
  name: string,
  kindsOrSpec: unknown
): {
  kinds: readonly string[]
  declared: Readonly<Record<string, readonly string[]>> | undefined
} => {
  if (Array.isArray(kindsOrSpec)) {
    return { kinds: kindsOrSpec as readonly string[], declared: undefined }
  }
  if (typeof kindsOrSpec !== "object" || kindsOrSpec === null) {
    throw new Error(
      `errorSet("${name}", kinds): kinds must be an array of kind names or an object of kind names to data keys`
    )
  }
  // Null prototype, so a "__proto__" kind is a key here (and then rejected as reserved)
  const declared: Record<string, readonly string[]> = Object.create(null)
  for (const [kind, keys] of Object.entries(kindsOrSpec)) {
    if (!(Array.isArray(keys) && keys.every(key => typeof key === "string"))) {
      throw new Error(
        `Kind "${kind}" in error set "${name}" must list its data keys as an array of strings`
      )
    }
    declared[kind] = [...new Set(keys as string[])]
  }
  return { kinds: Object.keys(declared), declared }
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
>(name: N, kinds: NoReserved<NoDuplicates<Kinds>>): ErrorSetBuilder<Kinds, N>
/**
 * Object form: each kind lists the entity keys its errors carry, so kind guards narrow
 * `data` to exactly those keys (`Pick<T, keys>`) instead of `Partial<T>`.
 *
 * @example
 * ```ts
 * const UserError = errorSet("UserError", {
 *   not_found: ["id"],
 *   suspended: ["id", "reason"],
 * }).init<User>()
 *
 * if (UserError.suspended(result)) {
 *   result.data.reason // string, no `!` needed
 * }
 * ```
 */
export function errorSet<N extends string, const Spec extends KindKeys>(
  name: N,
  kinds: NoReservedKeys<Spec>
): ErrorSetBuilder<(keyof Spec & string)[], N, Spec>
export function errorSet<N extends string>(
  name: N,
  kindsOrSpec: readonly string[] | KindKeys
): ErrorSetBuilder<readonly string[], N, KindKeys | undefined> {
  const { kinds, declared } = normalizeKinds(name, kindsOrSpec)
  // Runtime validation for JavaScript consumers or edge cases, before any property
  // is defined on the set
  const seen = new Set<string>()
  for (const kind of kinds) {
    if (reservedKindNames.has(kind)) {
      throw new Error(
        `"${kind}" is a reserved kind name in errorset; rename the kind`
      )
    }
    if (seen.has(kind)) {
      throw new Error(`Duplicate kind "${kind}" in error set "${name}"`)
    }
    seen.add(kind)
  }

  return {
    init<T extends object>(
      config?: ErrorSetConfig
    ): ErrorSet<string, T, N, KindKeys | undefined> {
      registerSetName(name, kinds)

      // Create the base guard: errors of these kinds created by the set named `name`
      const guard = createSetGuardWithKinds<string, T, N>(kinds, name)

      // Create kind functions and attach to guard
      const errorSetObj = guard as unknown as ErrorSet<string, T, N>
      const kindFns = new Map<string, object>()

      for (const kind of kinds) {
        const kindFn = createKindFunction<string, T, N>(
          kind,
          name,
          config,
          declared?.[kind]
        )
        kindFns.set(kind, kindFn)
        Object.defineProperty(errorSetObj, kind, {
          value: kindFn,
          writable: false,
          enumerable: true,
          configurable: false,
        })
      }

      // Attach from(): rehydration after JSON / structuredClone
      Object.defineProperty(errorSetObj, "from", {
        value: (value: unknown): Err<string, Partial<T>, N> | undefined =>
          rehydrateFrom(value, name, kindFns, guard) as
            | Err<string, Partial<T>, N>
            | undefined,
        writable: false,
        enumerable: false,
        configurable: false,
      })

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
          value: Success | Err<string, Partial<T>, N>,
          handlers: RecoverHandlers<string, T, R, N>
        ): Success | R => recover(value, guard, handlers),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach inspect method bound to this guard
      Object.defineProperty(errorSetObj, "inspect", {
        value: <Success>(
          value: Success | Err<string, Partial<T>, N>,
          handlers: InspectHandlers<string, T, N>
        ): void => inspect(value, guard, handlers),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach merge method (variadic; see merge)
      Object.defineProperty(errorSetObj, "merge", {
        value: (...others: MergeInput[]) => merge(errorSetObj, ...others),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach capture method
      Object.defineProperty(errorSetObj, "capture", {
        value: <Result>(
          fn: () => Result,
          mapper: ErrorMapper<string, T, N>
        ): Result | Err<string, Partial<T>, N> => captureSync(fn, mapper),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach captureAsync method
      Object.defineProperty(errorSetObj, "captureAsync", {
        value: <Result>(
          fn: () => Promise<Result>,
          mapper: ErrorMapper<string, T, N>
        ): Promise<Result | Err<string, Partial<T>, N>> =>
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

      return errorSetObj as ErrorSet<string, T, N, KindKeys | undefined>
    },
  }
}
