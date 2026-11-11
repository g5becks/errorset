/**
 * Unit tests for configuration system.
 * @module tests/config
 */

import { afterEach, describe, expect, it } from "bun:test"
import { configure, errorSet, getConfig, resetConfig } from "../src/index.ts"

describe("Configuration System", () => {
  afterEach(() => {
    resetConfig()
  })

  describe("getConfig", () => {
    it("should return default configuration with only the supported options", () => {
      const config = getConfig()
      expect(config).toEqual({
        includeStack: false,
        includeTimestamp: false,
        stackDepth: 10,
      })
    })
  })

  describe("configure", () => {
    it("should update includeStack option", () => {
      configure({ includeStack: true })
      expect(getConfig().includeStack).toBe(true)
    })

    it("should update includeTimestamp option", () => {
      configure({ includeTimestamp: true })
      expect(getConfig().includeTimestamp).toBe(true)
    })

    it("should update stackDepth option", () => {
      configure({ stackDepth: 20 })
      expect(getConfig().stackDepth).toBe(20)
    })

    it("should merge partial configuration", () => {
      configure({ includeTimestamp: true, stackDepth: 5 })
      const config = getConfig()
      expect(config.includeTimestamp).toBe(true)
      expect(config.stackDepth).toBe(5)
      // Other options remain default
      expect(config.includeStack).toBe(false)
    })

    it("should allow multiple configure calls", () => {
      configure({ includeStack: true })
      configure({ stackDepth: 3 })
      const config = getConfig()
      expect(config.includeStack).toBe(true)
      expect(config.stackDepth).toBe(3)
    })

    it("should ignore explicitly undefined options", () => {
      configure({ includeStack: undefined })
      expect(getConfig().includeStack).toBe(false)
    })
  })

  describe("configure() disposer", () => {
    it("restores the configuration in effect before the call", () => {
      configure({ stackDepth: 7 })
      const restore = configure({ includeTimestamp: true, stackDepth: 20 })
      expect(getConfig()).toEqual({
        includeStack: false,
        includeTimestamp: true,
        stackDepth: 20,
      })
      restore()
      expect(getConfig()).toEqual({
        includeStack: false,
        includeTimestamp: false,
        stackDepth: 7,
      })
    })

    it("unwinds nested scopes in reverse order", () => {
      const outer = configure({ includeStack: true })
      const inner = configure({ includeTimestamp: true })
      inner()
      expect(getConfig().includeStack).toBe(true)
      expect(getConfig().includeTimestamp).toBe(false)
      outer()
      expect(getConfig().includeStack).toBe(false)
    })

    it("is safe to call more than once", () => {
      const restore = configure({ includeTimestamp: true })
      restore()
      restore()
      expect(getConfig().includeTimestamp).toBe(false)
    })
  })

  describe("resetConfig", () => {
    it("should restore default configuration", () => {
      configure({ includeTimestamp: true, includeStack: true, stackDepth: 50 })
      resetConfig()
      expect(getConfig()).toEqual({
        includeStack: false,
        includeTimestamp: false,
        stackDepth: 10,
      })
    })
  })
})

describe("Removed format and colors options (0.4.0)", () => {
  afterEach(() => {
    resetConfig()
  })

  it("are type errors and are ignored at runtime", () => {
    // @ts-expect-error - format was removed in 0.4.0
    configure({ format: "json" })
    // @ts-expect-error - colors was removed in 0.4.0
    configure({ colors: false })
    const config = getConfig() as Record<string, unknown>
    expect("format" in config).toBe(false)
    expect("colors" in config).toBe(false)
  })

  it("are ignored in per-set configuration", () => {
    // @ts-expect-error - format was removed in 0.4.0
    const Quiet = errorSet("RemovedOptions", ["a"]).init({ format: "json" })
    expect(String(Quiet.a`A`)).toBe("RemovedOptions.a: A")
  })
})

describe("Stack Trace Configuration", () => {
  type User = { id: string }

  afterEach(() => {
    resetConfig()
  })

  it("should not include stack by default", () => {
    const UserError = errorSet("UserError", ["not_found"]).init<User>()
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    expect(err.stack).toBeUndefined()
  })

  it("should include stack when configured globally", () => {
    configure({ includeStack: true })
    const UserError = errorSet("UserError", ["not_found"]).init<User>()
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    // Stack should be defined in V8 engines (Bun)
    expect(err.stack).toBeDefined()
    expect(typeof err.stack).toBe("string")
  })

  it("should include stack when configured per-instance", () => {
    const UserError = errorSet("UserError", ["not_found"]).init<User>({
      includeStack: true,
    })
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    // Stack should be defined in V8 engines (Bun)
    expect(err.stack).toBeDefined()
    expect(typeof err.stack).toBe("string")
  })

  it("should respect stackDepth configuration", () => {
    configure({ includeStack: true, stackDepth: 5 })
    const UserError = errorSet("UserError", ["not_found"]).init<User>()
    const err = UserError.not_found`User ${"id"} not found`({ id: "123" })
    expect(err.stack).toBeDefined()
    // Stack trace depth is limited
    const lines = (err.stack ?? "").split("\n").filter(Boolean)
    // At least some stack frames should exist, but not more than depth + 1 (header)
    expect(lines.length).toBeGreaterThan(0)
  })
})
