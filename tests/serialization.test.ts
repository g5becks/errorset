/**
 * Serialization and string conversion of both error shapes (audit A4 option a, A7).
 * @module tests/serialization
 */

import { describe, expect, it } from "bun:test"
import { errorSet } from "../src/index.ts"

type User = { id: string; name: string }

const UserError = errorSet("UserError", ["not_found", "invalid"]).init<User>()
const DbError = errorSet("DbError", ["timeout"]).init<{ table: string }>()

const roundTrip = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe("toJSON", () => {
  it("serializes a template error to kind, message and data", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "1" })
    expect(roundTrip(err)).toEqual({
      set: "UserError",
      kind: "not_found",
      message: "User 1 not found",
      data: { id: "1" },
    })
  })

  it("serializes a callable no-context error instead of dropping it", () => {
    const err = UserError.invalid`Invalid user data`
    expect(JSON.stringify(err)).toBe(
      '{"set":"UserError","kind":"invalid","message":"Invalid user data","data":{}}'
    )
  })

  it("keeps both shapes when nested in another object", () => {
    const template = UserError.not_found`User ${"id"} not found`({ id: "1" })
    const callable = UserError.invalid`Invalid user data`
    expect(roundTrip({ error: template, other: callable })).toEqual({
      error: {
        set: "UserError",
        kind: "not_found",
        message: "User 1 not found",
        data: { id: "1" },
      },
      other: {
        set: "UserError",
        kind: "invalid",
        message: "Invalid user data",
        data: {},
      },
    })
  })

  it("serializes an errorset cause recursively", () => {
    const db = DbError.timeout`Query on ${"table"} timed out`({
      table: "users",
    })
    const callableCause = UserError.invalid`Invalid user data`
    const err = UserError.not_found`User ${"id"} not found`(
      { id: "1" },
      { cause: db }
    )
    const wrapped = UserError.invalid`Invalid user data`.with({
      cause: callableCause,
    })

    expect(roundTrip(err)).toEqual({
      set: "UserError",
      kind: "not_found",
      message: "User 1 not found",
      data: { id: "1" },
      cause: {
        set: "DbError",
        kind: "timeout",
        message: "Query on users timed out",
        data: { table: "users" },
      },
    })
    expect(roundTrip(wrapped)).toEqual({
      set: "UserError",
      kind: "invalid",
      message: "Invalid user data",
      data: {},
      cause: {
        set: "UserError",
        kind: "invalid",
        message: "Invalid user data",
        data: {},
      },
    })
  })

  it("serializes a native Error cause as name and message", () => {
    const native = new TypeError("bad input")
    const err = UserError.not_found`User ${"id"} not found`(
      { id: "1" },
      { cause: native }
    )
    expect(roundTrip(err)).toEqual({
      set: "UserError",
      kind: "not_found",
      message: "User 1 not found",
      data: { id: "1" },
      cause: { name: "TypeError", message: "bad input" },
    })
  })

  it("serializes the error created by calling a callable error", () => {
    const err = UserError.invalid`Invalid user data`.with({})
    expect(roundTrip(err)).toEqual({
      set: "UserError",
      kind: "invalid",
      message: "Invalid user data",
      data: {},
    })
  })
})

describe("toString", () => {
  it("formats a template error as Set.kind: message", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "1" })
    expect(String(err)).toBe("UserError.not_found: User 1 not found")
    expect(`${err}`).toBe("UserError.not_found: User 1 not found")
  })

  it("formats a callable error and its called form the same way", () => {
    const callable = UserError.invalid`Invalid user data`
    expect(String(callable)).toBe("UserError.invalid: Invalid user data")
    expect(String(callable.with({}))).toBe(
      "UserError.invalid: Invalid user data"
    )
  })
})

describe("enumerability", () => {
  it("adds no enumerable keys to either shape", () => {
    const template = UserError.not_found`User ${"id"} not found`({ id: "1" })
    const callable = UserError.invalid`Invalid user data`
    const called = callable.with({ cause: template })

    expect(Object.keys(template)).toEqual(["set", "kind", "message", "data"])
    expect(Object.keys(callable)).toEqual(["set", "kind", "message", "data"])
    expect(Object.keys(called)).toEqual([
      "set",
      "kind",
      "message",
      "data",
      "cause",
    ])
    for (const err of [template, callable, called]) {
      expect(Object.getOwnPropertyDescriptor(err, "toJSON")?.enumerable).toBe(
        false
      )
      expect(Object.getOwnPropertyDescriptor(err, "toString")?.enumerable).toBe(
        false
      )
    }
  })
})
