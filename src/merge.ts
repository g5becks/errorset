/**
 * Variadic, set-aware merge() and the merged guard's recover/inspect.
 * @module merge
 */

import type { Err } from "./brand.ts"
import {
  createMemberGuard,
  type Member,
  membersOf,
  withKinds,
} from "./guards.ts"

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
