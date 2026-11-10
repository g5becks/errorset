/**
 * Set identity (audit A1, TASK-055): every error records its set, guards are
 * set-precise, merge keeps set precision, and the duplicate set-name policy.
 * @module tests/set-identity
 */

import { afterEach, describe, expect, it, spyOn } from "bun:test"
import { createSetGuardWithKinds, errorSet, merge } from "../src/index.ts"

type Ctx = { symbol: string }

const OrderError = errorSet("Identity.OrderError", [
  "invalid_symbol",
  "rejected",
]).init<Ctx>()
const PositionError = errorSet("Identity.PositionError", [
  "invalid_symbol",
  "fetch_failed",
]).init<Ctx>()
const AccountError = errorSet("Identity.AccountError", [
  "invalid_symbol",
]).init<Ctx>()

const orderErr = OrderError.invalid_symbol`bad ${"symbol"}`({ symbol: "X" })
const positionErr = PositionError.invalid_symbol`bad ${"symbol"}`({
  symbol: "X",
})
const accountErr = AccountError.invalid_symbol`bad ${"symbol"}`({ symbol: "X" })

describe("errors record their set", () => {
  it("sets an enumerable set field on every error shape", () => {
    const callable = OrderError.rejected`Rejected`
    expect(orderErr.set).toBe("Identity.OrderError")
    expect(callable.set).toBe("Identity.OrderError")
    expect(callable().set).toBe("Identity.OrderError")
    expect(Object.keys(orderErr)).toContain("set")
    expect(Object.keys(callable)).toContain("set")
  })
})

describe("set-precise guards", () => {
  it("set, kind and instanceof guards reject another set's same-kind error", () => {
    expect(OrderError(positionErr)).toBe(false)
    expect(OrderError.invalid_symbol(positionErr)).toBe(false)
    expect(positionErr instanceof OrderError).toBe(false)
    expect(OrderError(orderErr)).toBe(true)
    expect(OrderError.invalid_symbol(orderErr)).toBe(true)
    expect(orderErr instanceof OrderError).toBe(true)
  })

  it("recover and inspect leave another set's error untouched", () => {
    const handled: string[] = []
    const value = OrderError.recover(positionErr, { _: () => "handled" })
    OrderError.inspect(positionErr, {
      invalid_symbol: () => handled.push("inspected"),
    })
    expect(value).toBe(positionErr)
    expect(handled).toEqual([])
    expect(OrderError.recover(orderErr, { _: () => "handled" })).toBe("handled")
  })
})

describe("merge keeps set precision", () => {
  const Merged = merge(OrderError, PositionError)

  it("accepts each merged set's errors and rejects a third set with the same kind", () => {
    expect(Merged(orderErr)).toBe(true)
    expect(Merged(positionErr)).toBe(true)
    expect(Merged(PositionError.fetch_failed`Failed`)).toBe(true)
    expect(Merged(accountErr)).toBe(false)
    expect(accountErr instanceof Merged).toBe(false)
  })

  it("rejects a kind that only exists in another merged set", () => {
    // "fetch_failed" is a PositionError kind; an OrderError never has it
    const forged = { ...OrderError.rejected`x`, kind: "fetch_failed" }
    expect(Merged(forged)).toBe(false)
  })

  it("can merge again with a third set", () => {
    const All = merge(Merged, AccountError)
    expect(All(accountErr)).toBe(true)
    expect(All(orderErr)).toBe(true)
    expect(All({ kind: "invalid_symbol" })).toBe(false)
  })
})

describe("deprecated helpers without a set name", () => {
  it("accept the kinds from any set, alone and when merged", () => {
    const AnySet = createSetGuardWithKinds<"invalid_symbol", Ctx>([
      "invalid_symbol",
    ])
    expect(AnySet(orderErr)).toBe(true)
    expect(AnySet(positionErr)).toBe(true)

    const Mixed = merge(AnySet, OrderError)
    expect(Mixed(positionErr)).toBe(true)
    expect(Mixed(OrderError.rejected`Rejected`)).toBe(true)
    expect(Mixed(PositionError.fetch_failed`Failed`)).toBe(false)
  })
})

describe("merging a guard without member data", () => {
  it("treats its kinds as accepted from any set (e.g. a guard from an older copy)", () => {
    // 0.3.x guards carry only `kinds`; merge falls back to "this kind, any set"
    const legacyGuard = Object.assign((_value: unknown) => false, {
      kinds: ["invalid_symbol"],
    }) as unknown as Parameters<typeof merge>[0]
    const Mixed = merge(legacyGuard, OrderError)
    expect(Mixed(positionErr)).toBe(true)
    expect(Mixed(OrderError.rejected`Rejected`)).toBe(true)
    expect(Mixed(PositionError.fetch_failed`Failed`)).toBe(false)
  })
})

describe("duplicate set names", () => {
  const warn = spyOn(console, "warn").mockImplementation(() => undefined)

  afterEach(() => {
    warn.mockClear()
  })

  it("redefining a name with the same kinds is silent (hot reload, tests)", () => {
    errorSet("Identity.Reloaded", ["a", "b"]).init()
    errorSet("Identity.Reloaded", ["b", "a"]).init()
    expect(warn).not.toHaveBeenCalled()
  })

  it("redefining a name with different kinds warns once per name and does not throw", () => {
    errorSet("Identity.Conflict", ["a"]).init()
    expect(() => errorSet("Identity.Conflict", ["a", "b"]).init()).not.toThrow()
    errorSet("Identity.Conflict", ["c"]).init()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('"Identity.Conflict"')
  })

  it("sets with the same name share identity", () => {
    const First = errorSet("Identity.Shared", ["x"]).init()
    const Second = errorSet("Identity.Shared", ["x"]).init()
    expect(Second(First.x`From the first definition`)).toBe(true)
  })
})
