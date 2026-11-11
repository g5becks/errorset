/**
 * errorSet(): the builder and ErrorSet types, and from() rehydration.
 * @module set
 */

import type { Err } from "./brand.ts"
import { rehydrators } from "./creation.ts"
import { createSetGuardWithKinds, type SetGuardWithKinds } from "./guards.ts"
import {
  captureAsync,
  captureSync,
  type ErrorMapper,
  type InspectHandlers,
  inspect,
  type RecoverHandlers,
  recover,
} from "./helpers.ts"
import { createKindFunction } from "./kind.ts"
import {
  type GuardedError,
  type MergedGuard,
  type MergeInput,
  merge,
} from "./merge.ts"
import { normalizeKinds, registerSetName } from "./registry.ts"
import {
  type DeclaredKeys,
  type DeclaredKeyUnion,
  type ErrorSetConfig,
  type KindFunction,
  type KindKeys,
  type NoDuplicates,
  type NoReserved,
  type NoReservedKeys,
  reservedKindNames,
} from "./types.ts"

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
