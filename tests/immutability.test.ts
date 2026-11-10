/**
 * Errors and their data are frozen (TASK-061, audit A8). ES modules are strict mode,
 * so every write to a frozen error throws a TypeError.
 * @module tests/immutability
 */

import { afterEach, describe, expect, it } from "bun:test"
import { configure, errorSet, resetConfig } from "../src/index.ts"

type Item = { id: string; tags: string[] }

const ItemError = errorSet("Immutability.ItemError", [
  "missing",
  "locked",
]).init<Item>()

afterEach(() => {
  resetConfig()
})

const writable = (target: object): Record<PropertyKey, unknown> =>
  target as Record<PropertyKey, unknown>

describe("errors are frozen", () => {
  const shapes = () => ({
    template: ItemError.missing`Item ${"id"} missing`({ id: "1" }),
    noContext: ItemError.locked`Item locked`,
    withCause: ItemError.locked`Item locked`.with({ cause: new Error("root") }),
  })

  it("every error shape and its data are frozen", () => {
    for (const err of Object.values(shapes())) {
      expect(Object.isFrozen(err)).toBe(true)
      expect(Object.isFrozen(err.data)).toBe(true)
    }
  })

  it("writing and adding fields throw; deleting fails", () => {
    for (const err of Object.values(shapes())) {
      expect(() => {
        writable(err).message = "changed"
      }).toThrow(TypeError)
      expect(() => {
        writable(err).kind = "other"
      }).toThrow(TypeError)
      expect(() => {
        writable(err).extra = true
      }).toThrow(TypeError)
      expect(Reflect.deleteProperty(err, "set")).toBe(false)
      expect(err.set).toBe("Immutability.ItemError")
      expect(() => {
        writable(err.data).id = "changed"
      }).toThrow(TypeError)
    }
  })

  it("freezes timestamp and stack when they are enabled", () => {
    configure({ includeTimestamp: true, includeStack: true })
    const err = ItemError.missing`Item ${"id"} missing`({ id: "1" })
    expect(typeof err.timestamp).toBe("number")
    expect(() => {
      writable(err).timestamp = 0
    }).toThrow(TypeError)
    expect(Object.isFrozen(err)).toBe(true)
  })

  it("data is frozen shallowly: nested values keep their own mutability", () => {
    const tags = ["a"]
    const err = ItemError.missing`Item ${"id"} ${"tags"}`({ id: "1", tags })
    expect(err.data.tags).toBe(tags)
    expect(Object.isFrozen(err.data.tags)).toBe(false)
  })

  it("the caller's entity object is not frozen", () => {
    const entity = { id: "1", tags: [] }
    ItemError.missing`Item ${"id"} missing`(entity)
    expect(Object.isFrozen(entity)).toBe(false)
  })
})

describe("APIs that derive errors still work", () => {
  it("with() returns a new frozen error from a frozen one", () => {
    const base = ItemError.locked`Item locked`
    const derived = base.with({ cause: "busy" })
    expect(derived.cause).toBe("busy")
    expect(Object.isFrozen(derived)).toBe(true)
  })

  it("capture attaches the cause to a frozen copy of the mapper's error", () => {
    const mapped = ItemError.missing`Item ${"id"} missing`({ id: "1" })
    const root = new Error("io")
    const result = ItemError.capture(
      () => {
        throw root
      },
      () => mapped
    )
    expect(ItemError(result)).toBe(true)
    expect((result as { cause?: unknown }).cause).toBe(root)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(mapped)).toBe(true)
  })
})
