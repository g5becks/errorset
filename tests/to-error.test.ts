/**
 * toError(): a real Error for loggers, APMs and Error-typed APIs (TASK-070, audit A7).
 * @module tests/to-error
 */

import { describe, expect, it } from "bun:test"
import { errorSet, isErr, toError } from "../src/index.ts"

const TO_ERROR_FRAME = /\bat toError\b/u

const UserError = errorSet("ToError.UserError", ["not_found", "invalid"]).init<{
  id: string
}>()

describe("toError", () => {
  it("converts a template error", () => {
    const err = UserError.not_found`User ${"id"} not found`({ id: "u1" })
    const error = toError(err)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("ToError.UserError.not_found")
    expect(error.message).toBe("User u1 not found")
    expect(error.cause).toBe(err)
    expect(String(error)).toBe("ToError.UserError.not_found: User u1 not found")
  })

  it("converts a no-context error", () => {
    const err = UserError.invalid`Invalid user`
    const error = toError(err)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("ToError.UserError.invalid")
    expect(error.message).toBe("Invalid user")
    expect(error.cause).toBe(err)
  })

  it("captures a stack at conversion time that starts at the caller", () => {
    const convertHere = () => toError(UserError.invalid`x`)
    const { stack } = convertHere()
    expect(typeof stack).toBe("string")
    expect(stack?.startsWith("ToError.UserError.invalid: x\n")).toBe(true)
    // The toError frame itself is excluded (engines may inline the caller's frame)
    expect(stack).not.toMatch(TO_ERROR_FRAME)
  })

  it("keeps the original error intact and recognizable through cause", () => {
    const err = UserError.not_found`User ${"id"}`({ id: "u2" })
    const error = toError(err)
    expect(isErr(error)).toBe(false)
    expect(UserError.not_found(error.cause)).toBe(true)
    expect(Object.isFrozen(err)).toBe(true)
  })

  it("returns a new, ordinary Error each time", () => {
    const err = UserError.invalid`x`
    const first = toError(err)
    expect(toError(err)).not.toBe(first)
    expect(Object.isFrozen(first)).toBe(false)
    expect(Object.keys(first)).toEqual([])
  })

  it("can be thrown and caught like any Error", () => {
    const err = UserError.invalid`Invalid user`
    expect(() => {
      throw toError(err)
    }).toThrow("Invalid user")
  })
})
