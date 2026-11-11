/**
 * Lossless message interpolation (TASK-069, audit A15): template values render
 * readably instead of `String(value ?? "")`.
 * @module tests/interpolation
 */

import { describe, expect, it } from "bun:test"
import { errorSet } from "../src/index.ts"

type Entity = { value: unknown }

const E = errorSet("Interpolation.E", ["shown"]).init<Entity>()
const render = (value: unknown): string =>
  E.shown`[${"value"}]`({ value }).message.slice(1, -1)

describe("message interpolation", () => {
  it("keeps strings as they are", () => {
    expect(render("plain")).toBe("plain")
    expect(render("")).toBe("")
    expect(render('with "quotes"')).toBe('with "quotes"')
  })

  it("renders null and undefined literally", () => {
    expect(render(null)).toBe("null")
    expect(render(undefined)).toBe("undefined")
  })

  it("renders numbers, booleans and symbols with String()", () => {
    expect(render(0)).toBe("0")
    expect(render(-1.5)).toBe("-1.5")
    expect(render(Number.NaN)).toBe("NaN")
    expect(render(false)).toBe("false")
    expect(render(Symbol("s"))).toBe("Symbol(s)")
  })

  it("renders bigint with an n suffix", () => {
    expect(render(10n)).toBe("10n")
    expect(render({ big: 10n })).toBe('{"big":"10n"}')
  })

  it("renders Date as an ISO string", () => {
    expect(render(new Date(Date.UTC(2026, 10, 10, 12, 0, 0)))).toBe(
      "2026-11-10T12:00:00.000Z"
    )
    expect(render(new Date(Number.NaN))).toBe("Invalid Date")
  })

  it("renders objects and arrays as JSON", () => {
    expect(render({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}')
    expect(render([1, "two", null])).toBe('[1,"two",null]')
    expect(render({})).toBe("{}")
    expect(render(Object.create(null))).toBe("{}")
    expect(render({ when: new Date(Date.UTC(2026, 0, 1)) })).toBe(
      '{"when":"2026-01-01T00:00:00.000Z"}'
    )
  })

  it("renders cycles as [Circular] without throwing, but not repeated references", () => {
    const cyclic: Record<string, unknown> = { id: 1 }
    cyclic.self = cyclic
    expect(render(cyclic)).toBe('{"id":1,"self":"[Circular]"}')
    const arr: unknown[] = [1]
    arr.push(arr)
    expect(render(arr)).toBe('[1,"[Circular]"]')
    const shared = { n: 1 }
    expect(render({ a: shared, b: shared })).toBe('{"a":{"n":1},"b":{"n":1}}')
  })

  it("truncates long JSON to 200 characters with an ellipsis", () => {
    const long = render({ text: "x".repeat(500) })
    expect(long).toHaveLength(201)
    expect(long.endsWith("…")).toBe(true)
    expect(long.startsWith('{"text":"xxx')).toBe(true)
    expect(render("y".repeat(500))).toHaveLength(500)
  })

  it("renders errors as name: message", () => {
    expect(render(new TypeError("bad input"))).toBe("TypeError: bad input")
    const errorsetErr = E.shown`inner`
    expect(render(errorsetErr)).toBe("Interpolation.E.shown: inner")
  })

  it("uses a class's own toString (URL, custom classes)", () => {
    expect(render(new URL("https://example.com/a?b=1"))).toBe(
      "https://example.com/a?b=1"
    )
    class Money {
      readonly cents = 150
      toString(): string {
        return `$${(this.cents / 100).toFixed(2)}`
      }
    }
    expect(render(new Money())).toBe("$1.50")
  })

  it("renders functions by name", () => {
    function namedFn(): void {
      // empty
    }
    expect(render(namedFn)).toBe("[Function: namedFn]")
    expect(render(Object.defineProperty(() => 1, "name", { value: "" }))).toBe(
      "[Function]"
    )
  })

  it("falls back to the object tag when JSON fails", () => {
    const throwing = {
      toJSON(): never {
        throw new Error("no")
      },
    }
    expect(render(throwing)).toBe("[object Object]")
  })

  it("data keeps the original values", () => {
    const value = { nested: [1, 2] }
    const err = E.shown`${"value"}`({ value })
    expect(err.data.value).toBe(value)
  })
})
