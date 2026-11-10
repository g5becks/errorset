/**
 * includeTimestamp (audit A11).
 * @module tests/timestamp
 */

import { afterEach, describe, expect, it } from "bun:test"
import { configure, errorSet, resetConfig } from "../src/index.ts"

type User = { id: string }

const makeSet = (config?: { includeTimestamp: boolean }) =>
  errorSet("UserError", ["not_found", "invalid"]).init<User>(config)

const shapes = (UserError: ReturnType<typeof makeSet>) => {
  const template = UserError.not_found`User ${"id"} not found`({ id: "1" })
  const callable = UserError.invalid`Invalid user data`
  const called = callable()
  return { template, callable, called }
}

afterEach(() => {
  resetConfig()
})

describe("includeTimestamp", () => {
  it("is off by default: the timestamp property is absent on every shape", () => {
    for (const err of Object.values(shapes(makeSet()))) {
      expect("timestamp" in err).toBe(false)
      expect(Object.keys(err)).not.toContain("timestamp")
    }
  })

  it("sets a numeric creation timestamp on every shape when enabled globally", () => {
    configure({ includeTimestamp: true })
    const before = Date.now()
    const errors = shapes(makeSet())
    const after = Date.now()
    for (const err of Object.values(errors)) {
      expect(typeof err.timestamp).toBe("number")
      expect(err.timestamp).toBeGreaterThanOrEqual(before)
      expect(err.timestamp).toBeLessThanOrEqual(after)
    }
  })

  it("can be enabled per set without touching the global config", () => {
    const errors = shapes(makeSet({ includeTimestamp: true }))
    for (const err of Object.values(errors)) {
      expect(typeof err.timestamp).toBe("number")
    }
    for (const err of Object.values(shapes(makeSet()))) {
      expect("timestamp" in err).toBe(false)
    }
  })

  it("lets a per-set false override a global true", () => {
    configure({ includeTimestamp: true })
    for (const err of Object.values(
      shapes(makeSet({ includeTimestamp: false }))
    )) {
      expect("timestamp" in err).toBe(false)
    }
  })

  it("includes the timestamp in JSON output when set", () => {
    configure({ includeTimestamp: true })
    const { template, callable } = shapes(makeSet())
    expect(typeof template.timestamp).toBe("number")
    expect(typeof callable.timestamp).toBe("number")
    expect(JSON.parse(JSON.stringify(template)).timestamp).toBe(
      template.timestamp
    )
    expect(JSON.parse(JSON.stringify(callable)).timestamp).toBe(
      callable.timestamp
    )
  })
})
