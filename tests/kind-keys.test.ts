/**
 * Per-kind data keys: errorSet(name, { kind: [keys] }) (TASK-068, audit A14).
 * Kind guards narrow data to exactly the declared keys; the type side is in
 * tests/types/kind-keys.test-d.ts.
 * @module tests/kind-keys
 */

import { describe, expect, it } from "bun:test"
import { errorSet, RESERVED_KINDS } from "../src/index.ts"

type User = { id: string; name: string; reason: string; email: string }

const UserError = errorSet("KindKeys.UserError", {
  not_found: ["id"],
  suspended: ["id", "reason"],
  invalid: [],
}).init<User>()

const user: User = { id: "u1", name: "Ann", reason: "spam", email: "a@x" }

describe("object form", () => {
  it("lists the kinds in declaration order", () => {
    expect(UserError.kinds).toEqual(["not_found", "suspended", "invalid"])
    expect([...UserError]).toEqual(["not_found", "suspended", "invalid"])
  })

  it("data has exactly the declared keys, whatever the template uses", () => {
    const err = UserError.suspended`User ${"id"} is suspended`(user)
    expect(err.data).toEqual({ id: "u1", reason: "spam" })
    expect(Object.keys(err.data)).toEqual(["id", "reason"])
    expect(err.message).toBe("User u1 is suspended")
  })

  it("a template without holes still takes the entity when keys are declared", () => {
    const creator = UserError.not_found`User not found` as unknown
    expect(typeof creator).toBe("function")
    const err = (
      creator as (entity: User) => { data: unknown; message: string }
    )(user)
    expect(err.data).toEqual({ id: "u1" })
    expect(err.message).toBe("User not found")
  })

  it("a kind declared with no keys creates no-context errors", () => {
    const err = UserError.invalid`Invalid user`
    expect(UserError.invalid(err)).toBe(true)
    expect(err.data).toEqual({})
    expect(typeof err.with).toBe("function")
  })

  it("guards, recover, JSON and from() work as for the array form", () => {
    const err = UserError.not_found`User ${"id"} not found`(user)
    expect(UserError(err)).toBe(true)
    expect(UserError.not_found(err)).toBe(true)
    expect(UserError.suspended(err)).toBe(false)
    expect(Object.isFrozen(err) && Object.isFrozen(err.data)).toBe(true)
    expect(UserError.recover(err, { _: e => e.kind })).toBe("not_found")
    const restored = UserError.from(JSON.parse(JSON.stringify(err)))
    expect(UserError.not_found(restored)).toBe(true)
  })

  it("from() rejects data missing a declared key", () => {
    expect(
      UserError.from({
        set: "KindKeys.UserError",
        kind: "suspended",
        message: "m",
        data: { id: "u1" },
      })
    ).toBeUndefined()
    expect(
      UserError.from({
        set: "KindKeys.UserError",
        kind: "suspended",
        message: "m",
        data: { id: "u1", reason: "r" },
      })
    ).toBeDefined()
  })

  it("serializes declared keys whose value is undefined", () => {
    const err = UserError.suspended`User ${"id"}`({
      ...user,
      reason: undefined as unknown as string,
    })
    expect(Object.keys(err.data)).toEqual(["id", "reason"])
  })
})

describe("object form validation", () => {
  // Untyped entry point, as a JavaScript caller (or a cast) would use it
  const untyped = errorSet as unknown as (
    name: string,
    kinds: unknown
  ) => { init: () => unknown }

  it("rejects reserved kind names", () => {
    for (const reserved of RESERVED_KINDS) {
      expect(() => untyped("KindKeys.Reserved", { [reserved]: [] })).toThrow(
        `"${reserved}" is a reserved kind name in errorset; rename the kind`
      )
    }
  })

  it("rejects key lists that are not arrays of strings", () => {
    expect(() => untyped("KindKeys.Bad", { a: "id" })).toThrow(
      'Kind "a" in error set "KindKeys.Bad" must list its data keys as an array of strings'
    )
    expect(() => untyped("KindKeys.Bad", { a: [1] })).toThrow(
      'Kind "a" in error set "KindKeys.Bad" must list its data keys as an array of strings'
    )
  })

  it("rejects a non-object kinds argument", () => {
    expect(() => untyped("KindKeys.Bad", "a")).toThrow(
      'errorSet("KindKeys.Bad", kinds): kinds must be an array of kind names or an object of kind names to data keys'
    )
    expect(() => untyped("KindKeys.Bad", null)).toThrow("kinds must be")
  })
})

describe("array form is unchanged", () => {
  it("still extracts the template's keys", () => {
    const Plain = errorSet("KindKeys.Plain", ["not_found"]).init<User>()
    const err = Plain.not_found`User ${"name"}`(user)
    expect(err.data).toEqual({ name: "Ann" })
  })
})
