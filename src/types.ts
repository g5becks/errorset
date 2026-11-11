/**
 * Public type utilities: options, duplicate and reserved-kind checks, kind keys and the kind function types.
 * @module types
 */

import type { Err } from "./brand.ts"
import type { Config } from "./config.ts"

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

export const reservedKindNames: ReadonlySet<string> = new Set(RESERVED_KINDS)

/**
 * Object form of `errorSet()`'s kinds: each kind name maps to the entity keys its
 * errors carry in `data`, e.g. `{ not_found: ["id"], suspended: ["id", "reason"] }`.
 */
export type KindKeys = Readonly<Record<string, readonly string[]>>

/** Every key declared in a `KindKeys` spec (never for the array form). @internal */
export type DeclaredKeyUnion<Spec> = Spec extends KindKeys
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
