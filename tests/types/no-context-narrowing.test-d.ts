/**
 * Set, kind and merged guards narrow their own no-context errors out of the false
 * branch (0.5.1). Before, `NoContextErr` (data `Record<string, never>`, plus `with`)
 * was not a subtype of the guard's predicate type, so TypeScript kept it in the
 * false branch although the guard returns true for it at runtime.
 */

import { expectTypeOf } from "expect-type"
import {
  type Err,
  errorSet,
  merge,
  type NoContextErr,
  type SetErr,
} from "../../src/index.ts"

type Entity = { id: string }
type Ok = { ok: number }

const StoreError = errorSet("StoreError", [
  "not_found",
  "conflict",
]).init<Entity>()
const OtherError = errorSet("OtherError", ["not_found"]).init<Entity>()
const KeyedError = errorSet("KeyedError", {
  missing: ["id"],
  other: [],
}).init<Entity>()

declare const pick: () => number
const noContext = StoreError.not_found`not found`
const withContext = StoreError.conflict`conflict on ${"id"}`({ id: "a" })
const otherNoContext = OtherError.not_found`other`

const onlyNoContext = (): Ok | typeof noContext =>
  pick() > 0 ? noContext : { ok: 1 }
const mixed = ():
  | Ok
  | typeof noContext
  | typeof withContext
  | typeof otherNoContext => {
  switch (pick()) {
    case 0:
      return noContext
    case 1:
      return withContext
    case 2:
      return otherNoContext
    default:
      return { ok: 1 }
  }
}

// Set guard, no-context only: the false branch is exactly the success value
{
  const value = onlyNoContext()
  if (StoreError(value)) {
    expectTypeOf(value).toEqualTypeOf<NoContextErr<"not_found", "StoreError">>()
  } else {
    expectTypeOf(value).toEqualTypeOf<Ok>()
  }
}

// Set guard, mixed: removes this set's context and no-context errors only;
// another set's error with the same kind name stays (guards are set-precise)
{
  const value = mixed()
  if (StoreError(value)) {
    expectTypeOf(value.kind).toEqualTypeOf<"not_found" | "conflict">()
    expectTypeOf(value.set).toEqualTypeOf<"StoreError">()
    expectTypeOf(value.message).toEqualTypeOf<string>()
    switch (value.kind) {
      case "not_found":
      case "conflict":
        break
      default:
        expectTypeOf(value).toBeNever()
    }
  } else {
    expectTypeOf(value).toEqualTypeOf<Ok | typeof otherNoContext>()
  }
}

// Set guard on an unknown value: data stays usable
{
  const value: unknown = noContext
  if (StoreError(value)) {
    expectTypeOf(value.data.id).toEqualTypeOf<string | undefined>()
  }
}

// Kind guard of a no-context kind
{
  const value = onlyNoContext()
  if (StoreError.not_found(value)) {
    expectTypeOf(value.kind).toEqualTypeOf<"not_found">()
  } else {
    expectTypeOf(value).toEqualTypeOf<Ok>()
  }
}

// Kind guard of a kind with declared keys: unchanged, data keeps its keys
{
  const value: unknown = KeyedError.missing`missing ${"id"}`({ id: "a" })
  if (KeyedError.missing(value)) {
    expectTypeOf(value.data.id).toEqualTypeOf<string>()
  }
}

// Merged guard: removes every merged set's no-context errors
{
  const Both = merge(StoreError, OtherError)
  const value = mixed()
  if (Both(value)) {
    expectTypeOf(value.set).toEqualTypeOf<"StoreError" | "OtherError">()
  } else {
    expectTypeOf(value).toEqualTypeOf<Ok>()
  }
}

// A context-only union keeps working as before
{
  const value = pick() > 0 ? withContext : ({ ok: 1 } as Ok)
  if (!StoreError(value)) {
    expectTypeOf(value).toEqualTypeOf<Ok>()
  }
}

// any and broad Err values still narrow to the set's error type
{
  const loose: any = noContext
  if (StoreError(loose)) {
    expectTypeOf(loose.kind).toEqualTypeOf<"not_found" | "conflict">()
  }
  const broad: Err = noContext
  if (StoreError(broad)) {
    expectTypeOf(broad.kind).toEqualTypeOf<"not_found" | "conflict">()
    expectTypeOf(broad.set).toEqualTypeOf<"StoreError">()
  }
}

// Guards still work as filter predicates and as plain unknown-guards
{
  const values: unknown[] = [noContext, { ok: 1 }]
  expectTypeOf(values.filter(StoreError)).toEqualTypeOf<
    SetErr<"not_found" | "conflict", Entity, "StoreError">[]
  >()
  const kinds: unknown[] = [noContext]
  expectTypeOf(kinds.filter(StoreError.not_found)).toEqualTypeOf<
    (
      | Err<"not_found", Partial<Entity>, "StoreError">
      | NoContextErr<"not_found", "StoreError">
    )[]
  >()
  const plain: (value: unknown) => value is Err<string, object, string> =
    StoreError
  expectTypeOf(plain).toBeFunction()
}

// recover removes the set's no-context errors from its result type
{
  const value = onlyNoContext()
  const recovered = StoreError.recover(value, {
    not_found: () => 0,
    conflict: () => 1,
  })
  expectTypeOf(recovered).toEqualTypeOf<Ok | number>()
}
