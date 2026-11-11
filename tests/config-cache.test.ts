/**
 * Each set caches its effective configuration; configure(), its disposer and
 * resetConfig() invalidate the cache (TASK-071).
 * @module tests/config-cache
 */

import { afterEach, describe, expect, it } from "bun:test"
import { configure, errorSet, resetConfig } from "../src/index.ts"

const GlobalSet = errorSet("ConfigCache.Global", ["a"]).init<{ id: string }>()
const OwnSet = errorSet("ConfigCache.Own", ["a"]).init<{ id: string }>({
  includeTimestamp: false,
})

const hasTimestamp = (err: object): boolean => "timestamp" in err
const template = () => GlobalSet.a`x ${"id"}`({ id: "1" })
const noContext = () => GlobalSet.a`x`

afterEach(() => {
  resetConfig()
})

describe("cached template creators", () => {
  it("a call site with different hole values creates the right errors", () => {
    type Entity = { id: string; name: string }
    const E = errorSet("ConfigCache.Creators", ["a"]).init<Entity>()
    const make = (key: "id" | "name") => E.a`value ${key}`
    const entity = { id: "1", name: "Ann" }
    const byId = make("id")(entity)
    const byName = make("name")(entity)
    const byIdAgain = make("id")(entity)
    expect(byId.message).toBe("value 1")
    expect(byId.data as unknown).toEqual({ id: "1" })
    expect(byName.message).toBe("value Ann")
    expect(byName.data as unknown).toEqual({ name: "Ann" })
    expect(byIdAgain.data as unknown).toEqual({ id: "1" })
  })

  it("the same call site reuses its creator, other call sites don't", () => {
    type Entity = { id: string }
    const E = errorSet("ConfigCache.Reuse", ["a"]).init<Entity>()
    const site = () => E.a`x ${"id"}`
    expect(site()).toBe(site())
    expect(E.a`y ${"id"}`).not.toBe(site())
  })
})

describe("cached effective configuration", () => {
  it("picks up configure() after errors were already created", () => {
    expect(hasTimestamp(template())).toBe(false)
    expect(hasTimestamp(noContext())).toBe(false)
    configure({ includeTimestamp: true })
    expect(hasTimestamp(template())).toBe(true)
    expect(hasTimestamp(noContext())).toBe(true)
    expect(hasTimestamp(noContext().with({}))).toBe(true)
  })

  it("picks up the disposer restoring the previous configuration", () => {
    const restore = configure({ includeTimestamp: true })
    expect(hasTimestamp(template())).toBe(true)
    restore()
    expect(hasTimestamp(template())).toBe(false)
    expect(hasTimestamp(noContext())).toBe(false)
  })

  it("picks up resetConfig()", () => {
    configure({ includeTimestamp: true })
    expect(hasTimestamp(template())).toBe(true)
    resetConfig()
    expect(hasTimestamp(template())).toBe(false)
  })

  it("keeps per-set options over global ones across changes", () => {
    configure({ includeTimestamp: true })
    expect(hasTimestamp(OwnSet.a`x ${"id"}`({ id: "1" }))).toBe(false)
    configure({ includeStack: true })
    const err = OwnSet.a`x ${"id"}`({ id: "1" })
    expect(hasTimestamp(err)).toBe(false)
    expect("stack" in err).toBe(true)
  })

  it("picks up stack options for sets with their own config", () => {
    expect("stack" in OwnSet.a`x`).toBe(false)
    configure({ includeStack: true })
    expect("stack" in OwnSet.a`x`).toBe(true)
  })
})
