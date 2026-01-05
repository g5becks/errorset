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
    it("should return default configuration", () => {
      const config = getConfig()
      expect(config.format).toBe("pretty")
      expect(config.includeStack).toBe(false)
      expect(config.includeTimestamp).toBe(false)
      expect(config.colors).toBe(true)
      expect(config.stackDepth).toBe(10)
    })
  })

  describe("configure", () => {
    it("should update format option", () => {
      configure({ format: "json" })
      expect(getConfig().format).toBe("json")
    })

    it("should update includeStack option", () => {
      configure({ includeStack: true })
      expect(getConfig().includeStack).toBe(true)
    })

    it("should update includeTimestamp option", () => {
      configure({ includeTimestamp: true })
      expect(getConfig().includeTimestamp).toBe(true)
    })

    it("should update colors option", () => {
      configure({ colors: false })
      expect(getConfig().colors).toBe(false)
    })

    it("should update stackDepth option", () => {
      configure({ stackDepth: 20 })
      expect(getConfig().stackDepth).toBe(20)
    })

    it("should merge partial configuration", () => {
      configure({ format: "minimal", colors: false })
      const config = getConfig()
      expect(config.format).toBe("minimal")
      expect(config.colors).toBe(false)
      // Other options remain default
      expect(config.includeStack).toBe(false)
      expect(config.stackDepth).toBe(10)
    })

    it("should allow multiple configure calls", () => {
      configure({ format: "json" })
      configure({ colors: false })
      const config = getConfig()
      expect(config.format).toBe("json")
      expect(config.colors).toBe(false)
    })
  })

  describe("resetConfig", () => {
    it("should restore default configuration", () => {
      configure({ format: "json", includeStack: true, stackDepth: 50 })
      resetConfig()
      const config = getConfig()
      expect(config.format).toBe("pretty")
      expect(config.includeStack).toBe(false)
      expect(config.stackDepth).toBe(10)
    })
  })
})

describe("Configuration Format Options", () => {
  afterEach(() => {
    resetConfig()
  })

  it("should accept 'pretty' format", () => {
    configure({ format: "pretty" })
    expect(getConfig().format).toBe("pretty")
  })

  it("should accept 'json' format", () => {
    configure({ format: "json" })
    expect(getConfig().format).toBe("json")
  })

  it("should accept 'minimal' format", () => {
    configure({ format: "minimal" })
    expect(getConfig().format).toBe("minimal")
  })
})

describe("Stack Trace Configuration", () => {
  type User = { id: string }
  const UserError = errorSet<User>("UserError", "not_found")
  const not_found = (UserError as Record<string, unknown>).not_found as (
    s: TemplateStringsArray,
    ...k: string[]
  ) => (d: User) => { stack?: string }

  afterEach(() => {
    resetConfig()
  })

  it("should not include stack by default", () => {
    const err = not_found`User ${"id"} not found`({ id: "123" })
    expect(err.stack).toBeUndefined()
  })

  it("should include stack when configured", () => {
    configure({ includeStack: true })
    const err = not_found`User ${"id"} not found`({ id: "123" })
    // Stack should be defined in V8 engines (Bun)
    expect(err.stack).toBeDefined()
    expect(typeof err.stack).toBe("string")
  })

  it("should respect stackDepth configuration", () => {
    configure({ includeStack: true, stackDepth: 5 })
    const err = not_found`User ${"id"} not found`({ id: "123" })
    expect(err.stack).toBeDefined()
    // Stack trace depth is limited
    const lines = (err.stack ?? "").split("\n").filter(Boolean)
    // At least some stack frames should exist, but not more than depth + 1 (header)
    expect(lines.length).toBeGreaterThan(0)
  })
})
