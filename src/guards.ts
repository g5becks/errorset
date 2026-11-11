/**
 * Set guards over (set, kind) pairs, with instanceof support and the kinds array.
 * @module guards
 */

import { ERR, ERR_PROTOCOL, type Err, hasBrand } from "./brand.ts"

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
export type Member = { readonly set: string | undefined; readonly kind: string }

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
export const createMemberGuard = <
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
export const membersOf = (guard: {
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
export const withKinds = <
  Kinds extends string,
  T extends object,
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
 */
export function createSetGuardWithKinds<
  Kinds extends string,
  T extends object,
  N extends string = string,
>(kinds: readonly Kinds[], setName?: N): SetGuardWithKinds<Kinds, T, N> {
  return withKinds(createSetGuard<Kinds, T, N>([...kinds], setName), kinds)
}
