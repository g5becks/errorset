/**
 * Core types and constants for the errorset library.
 * @module types
 */

import { type Config, getConfig } from "./config.ts"

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
  Data extends Record<string, unknown> = Record<string, unknown>,
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
  init<T extends Record<string, unknown>>(
    config?: ErrorSetConfig
  ): ErrorSet<Kinds[number], T, N>
}

/**
 * Function returned by template literal that creates the error.
 * Accepts entity data and optional error options.
 */
export type ErrorCreator<
  Kind extends string,
  T extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
  N extends string = string,
> = {
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
  T extends Record<string, unknown>,
  N extends string = string,
> = (value: unknown) => value is Err<Kind, Partial<T>, N>

/**
 * Dual-purpose kind function that acts as both:
 * 1. Tagged template literal for error creation
 * 2. Type guard for checking specific error kind
 */
export type KindFunction<
  Kind extends string,
  T extends Record<string, unknown>,
  N extends string = string,
> = KindConstructor<Kind, T, N> & KindGuard<Kind, T, N>

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
 * Property descriptors for non-enumerable `toJSON` and `toString`, built once per
 * kind and applied with `Object.defineProperties`, so `Object.keys` and deep
 * equality of errors are unchanged.
 */
const serializationDescriptors = (
  formatError: () => string
): PropertyDescriptorMap => ({
  toJSON: { value: errToJSON },
  toString: { value: formatError },
})

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
 * Applies the creation-time options of the effective config (global merged with
 * the set's own) to a new error: `timestamp` when `includeTimestamp` is on, and a
 * stack trace when `includeStack` is on. When `includeTimestamp` is off the
 * `timestamp` property is absent, not `undefined`.
 *
 * @internal
 */
function applyCreationConfig(
  target: object,
  constructorOpt: unknown,
  instanceConfig?: Partial<Config>
): void {
  const globalConfig = getConfig()
  const config = instanceConfig
    ? { ...globalConfig, ...instanceConfig }
    : globalConfig

  if (config.includeTimestamp) {
    // Callable errors are functions whose fields are read-only own properties
    Object.defineProperty(target, "timestamp", {
      value: Date.now(),
      writable: typeof target !== "function",
      enumerable: true,
      configurable: false,
    })
  }

  captureStack(target, constructorOpt, config)
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
 * @deprecated Internal; will be removed from the public entry in 0.4.0. Use `errorSet(name, kinds).init<T>()` instead.
 */
export function createKindFunction<
  Kind extends string,
  T extends Record<string, unknown>,
  N extends string = string,
>(
  kind: Kind,
  name: N,
  instanceConfig?: Partial<Config>
): KindFunction<Kind, T, N> {
  // One `toString` per kind, shared by every error of this kind: "<Set>.<kind>: <message>"
  const errToString = function (this: { message: string }): string {
    return `${name}.${kind}: ${this.message}`
  }
  const serialization = serializationDescriptors(errToString)

  // No-context errors (templates without holes) are plain objects; with() returns a
  // new error with the same message plus options, so errors never need mutating.
  const createNoContext = (
    message: string,
    options: ErrorOptions | undefined,
    constructorOpt: unknown
  ): NoContextErr<Kind, N> => {
    const data = {} as Record<string, never>
    const err = {
      [ERR]: ERR_PROTOCOL,
      set: name,
      kind,
      message,
      data,
      ...(options?.cause !== undefined && { cause: options.cause }),
      [INSPECT]() {
        return `${name}.${kind} ${JSON.stringify(data)}`
      },
    }
    Object.defineProperties(err, noContextDescriptors)
    applyCreationConfig(err, constructorOpt, instanceConfig)
    return err as unknown as NoContextErr<Kind, N>
  }
  const withOptions = function (
    this: { message: string },
    options: ErrorOptions
  ): NoContextErr<Kind, N> {
    return createNoContext(this.message, options, withOptions)
  }
  const noContextDescriptors: PropertyDescriptorMap = {
    ...serialization,
    with: { value: withOptions },
  }

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
      if (keys.length === 0) {
        return createNoContext(strings.join(""), undefined, kindFn)
      }

      // Return error creator function for template with keys
      const creator = (
        entity: Pick<T, K>,
        options?: ErrorOptions
      ): Err<Kind, Pick<T, K>, N> => {
        // Extract only referenced fields into data
        const data = {} as Record<string, unknown>
        for (const key of keys) {
          data[key] = entity[key]
        }

        // Build message by interpolating values
        let message = strings[0] ?? ""
        for (let i = 0; i < keys.length; i += 1) {
          const key = keys[i]
          const value = key === undefined ? undefined : entity[key]
          message += String(value ?? "")
          message += strings[i + 1] ?? ""
        }

        // Create error object with custom inspect for debuggers
        const err = {
          [ERR]: ERR_PROTOCOL,
          set: name,
          kind,
          message,
          data: data as Pick<T, K>,
          ...(options?.cause !== undefined && { cause: options.cause }),
          // Custom inspection for Node.js debuggers
          // Format: ErrorSetName.kind { data }
          [INSPECT]() {
            return `${name}.${kind} ${JSON.stringify(data)}`
          },
        } as Err<Kind, Pick<T, K>, N>

        Object.defineProperties(err, serialization)

        // Capture stack trace if enabled (V8 engines only)
        applyCreationConfig(err, creator, instanceConfig)

        return err
      }

      return creator
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

  return kindFn as KindFunction<Kind, T, N>
}

/**
 * Type for the set-level guard function.
 * Checks if a value is any error from this error set.
 */
export type SetGuard<
  Kinds extends string,
  T extends Record<string, unknown>,
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
  const names = new Set(members.map(member => member.set))
  const [onlyName] = names
  if (names.size === 1 && onlyName !== undefined) {
    // Fast path for a single named set (every errorSet guard)
    const kinds = members.map(member => member.kind)
    return (set, kind) => set === onlyName && kinds.includes(kind)
  }
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

/** Creates a guard over (set, kind) pairs, with instanceof support. @internal */
const createMemberGuard = <
  Kinds extends string,
  T extends Record<string, unknown>,
  N extends string,
>(
  members: readonly Member[]
): SetGuard<Kinds, T, N> => {
  const accepts = membershipTest(members)
  const guard = (value: unknown): value is Err<Kinds, Partial<T>, N> => {
    // Must carry a brand this copy understands
    if (!hasBrand(value)) {
      return false
    }
    const { kind, set } = value as unknown as Record<string, unknown>
    return typeof kind === "string" && accepts(set, kind)
  }

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
 * @deprecated Internal; will be removed from the public entry in 0.4.0. Use `errorSet(name, kinds).init<T>()` instead.
 */
export function createSetGuard<
  Kinds extends string,
  T extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
  N extends string = string,
> = (error: Err<Kind, Partial<T>, N>) => void

/**
 * Handlers object for inspect method.
 * Partial mapping of error kinds to handler functions (all optional).
 */
export type InspectHandlers<
  Kinds extends string,
  T extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
  N extends string = string,
> = SetGuard<Kinds, T, N> & {
  /** Array of valid kinds for this set */
  readonly kinds: readonly Kinds[]
}

/** Adds the non-enumerable `kinds` array to a guard. @internal */
const withKinds = <
  Kinds extends string,
  T extends Record<string, unknown>,
  N extends string,
>(
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
 * @deprecated Internal; will be removed from the public entry in 0.4.0. Use `errorSet(name, kinds).init<T>()` instead.
 */
export function createSetGuardWithKinds<
  Kinds extends string,
  T extends Record<string, unknown>,
  N extends string = string,
>(kinds: readonly Kinds[], setName?: N): SetGuardWithKinds<Kinds, T, N> {
  return withKinds(createSetGuard<Kinds, T, N>([...kinds], setName), kinds)
}

/**
 * Merges two error set guards into a unified guard.
 *
 * The merged guard accepts exactly the errors either original guard accepts: the
 * (set, kind) pairs are combined, so set precision is kept. Data becomes untyped
 * (Record<string, unknown>) since sets may have different entity types.
 * Original sets remain unchanged.
 *
 * @param guard1 - First error set guard
 * @param guard2 - Second error set guard
 * @returns A new guard that matches errors from either set
 *
 * @example
 * ```ts
 * const UserError = errorSet("UserError", ["not_found", "suspended"]).init<User>()
 * const OrderError = errorSet("OrderError", ["cancelled", "expired"]).init<Order>()
 *
 * const ServiceError = merge(UserError, OrderError)
 * // ServiceError matches UserError's and OrderError's errors
 * ```
 */
export function merge<
  Kinds1 extends string,
  T1 extends Record<string, unknown>,
  N1 extends string,
  Kinds2 extends string,
  T2 extends Record<string, unknown>,
  N2 extends string,
>(
  guard1: SetGuardWithKinds<Kinds1, T1, N1>,
  guard2: SetGuardWithKinds<Kinds2, T2, N2>
): SetGuardWithKinds<Kinds1 | Kinds2, Record<string, unknown>, N1 | N2> {
  const members = [...membersOf(guard1), ...membersOf(guard2)]
  const kinds = [...guard1.kinds, ...guard2.kinds] as (Kinds1 | Kinds2)[]
  return withKinds(
    createMemberGuard<Kinds1 | Kinds2, Record<string, unknown>, N1 | N2>(
      members
    ),
    kinds
  )
}

/**
 * Error mapper function type for capture.
 * Receives the caught Error and returns an error set value.
 */
export type ErrorMapper<
  Kinds extends string,
  T extends Record<string, unknown>,
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
  return Object.defineProperties(
    Object.create(Object.getPrototypeOf(mapped) as object | null),
    ordered
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
  Data extends Record<string, unknown>,
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
  Data extends Record<string, unknown>,
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
  T extends Record<string, unknown>,
  N extends string = string,
> = SetGuardWithKinds<Kinds, T, N> & {
  /** Kind constructors indexed by kind name */
  [K in Kinds]: KindFunction<K, T, N>
} & {
  /**
   * Type helper for exporting error set type.
   * Use: export type MyError = typeof MyError.Type
   */
  readonly Type: Err<Kinds, Partial<T>, N>

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
   * Merge with another error set to create unified guard.
   */
  merge<
    Kinds2 extends string,
    T2 extends Record<string, unknown>,
    N2 extends string,
  >(
    other: SetGuardWithKinds<Kinds2, T2, N2>
  ): SetGuardWithKinds<Kinds | Kinds2, Record<string, unknown>, N | N2>

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
>(name: N, kinds: NoReserved<NoDuplicates<Kinds>>): ErrorSetBuilder<Kinds, N> {
  // Runtime validation for JavaScript consumers or edge cases, before any property
  // is defined on the set
  const seen = new Set<string>()
  for (const kind of kinds as readonly string[]) {
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
    init<T extends Record<string, unknown>>(
      config?: ErrorSetConfig
    ): ErrorSet<Kinds[number], T, N> {
      registerSetName(name, kinds)

      // Create the base guard: errors of these kinds created by the set named `name`
      const guard = createSetGuardWithKinds<Kinds[number], T, N>(kinds, name)

      // Create kind functions and attach to guard
      const errorSetObj = guard as unknown as ErrorSet<Kinds[number], T, N>

      for (const kind of kinds) {
        const kindFn = createKindFunction<string, T, N>(kind, name, config)
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
          value: Success | Err<Kinds[number], Partial<T>, N>,
          handlers: RecoverHandlers<Kinds[number], T, R, N>
        ): Success | R => recover(value, guard, handlers),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach inspect method bound to this guard
      Object.defineProperty(errorSetObj, "inspect", {
        value: <Success>(
          value: Success | Err<Kinds[number], Partial<T>, N>,
          handlers: InspectHandlers<Kinds[number], T, N>
        ): void => inspect(value, guard, handlers),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach merge method
      Object.defineProperty(errorSetObj, "merge", {
        value: <
          Kinds2 extends string,
          T2 extends Record<string, unknown>,
          N2 extends string,
        >(
          other: SetGuardWithKinds<Kinds2, T2, N2>
        ): SetGuardWithKinds<
          Kinds[number] | Kinds2,
          Record<string, unknown>,
          N | N2
        > => merge(guard, other),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach capture method
      Object.defineProperty(errorSetObj, "capture", {
        value: <Result>(
          fn: () => Result,
          mapper: ErrorMapper<Kinds[number], T, N>
        ): Result | Err<Kinds[number], Partial<T>, N> =>
          captureSync(fn, mapper),
        writable: false,
        enumerable: false,
        configurable: false,
      })

      // Attach captureAsync method
      Object.defineProperty(errorSetObj, "captureAsync", {
        value: <Result>(
          fn: () => Promise<Result>,
          mapper: ErrorMapper<Kinds[number], T, N>
        ): Promise<Result | Err<Kinds[number], Partial<T>, N>> =>
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
