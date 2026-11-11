/**
 * Reserved kind names are rejected at runtime with a clear error (TASK-057, audit A3).
 * The compile-time check is in tests/types/reserved-kinds.test-d.ts.
 * @module tests/reserved-kinds
 */

import { describe, expect, it, test } from "bun:test"
import { errorSet, RESERVED_KINDS } from "../src/index.ts"

// Untyped entry point, as a JavaScript caller (or a cast) would use it
const untypedErrorSet = errorSet as unknown as (
  name: string,
  kinds: readonly string[]
) => { init: () => unknown }

describe("reserved kind names", () => {
  test.each([...RESERVED_KINDS])(
    "%p throws a clear error naming it",
    reserved => {
      expect(() => untypedErrorSet("Reserved", ["ok", reserved])).toThrow(
        `"${reserved}" is a reserved kind name in errorset; rename the kind`
      )
    }
  )

  it("rejects the name in errorSet(), before init() defines any property", () => {
    let builder: unknown
    expect(() => {
      builder = untypedErrorSet("Reserved", ["recover"])
    }).toThrow()
    expect(builder).toBeUndefined()
  })

  it("covers every member of an initialized set and the built-ins it inherits", () => {
    const Sample = errorSet("ReservedSample", ["ok"]).init()
    const inherited = [
      ...Object.getOwnPropertyNames(Sample),
      ...Object.getOwnPropertyNames(Function.prototype),
      ...Object.getOwnPropertyNames(Object.prototype),
    ].filter(property => property !== "ok")
    const reserved = new Set<string>(RESERVED_KINDS)
    expect(inherited.filter(property => !reserved.has(property))).toEqual([])
  })

  it("accepts names that only resemble reserved words", () => {
    const Allowed = errorSet("ReservedAllowed", [
      "recovered",
      "named",
      "to_string",
    ]).init()
    const err = Allowed.recovered`Recovered`
    expect(Allowed(err)).toBe(true)
    expect(Allowed.kinds).toEqual(["recovered", "named", "to_string"])
  })
})
