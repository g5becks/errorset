/**
 * Variadic, set-aware merge() with recover and inspect (TASK-067, audit A9).
 * @module tests/merge
 */

import { describe, expect, it, mock } from "bun:test"
import { errorSet, merge } from "../src/index.ts"

type Order = { orderId: string; symbol: string }
type Position = { positionId: string; symbol: string }
type Account = { accountId: string }

const OrderError = errorSet("Merge.OrderError", [
  "invalid_symbol",
  "rejected",
]).init<Order>()
const PositionError = errorSet("Merge.PositionError", [
  "invalid_symbol",
  "fetch_failed",
]).init<Position>()
const AccountError = errorSet("Merge.AccountError", ["locked"]).init<Account>()
const OtherError = errorSet("Merge.OtherError", ["invalid_symbol"]).init()

const orderErr = OrderError.invalid_symbol`Bad ${"symbol"}`({ symbol: "X" })
const positionErr = PositionError.invalid_symbol`Bad ${"symbol"}`({
  symbol: "Y",
})
const accountErr = AccountError.locked`Account ${"accountId"} locked`({
  accountId: "a1",
})
const rejectedErr = OrderError.rejected`Rejected`
const fetchErr = PositionError.fetch_failed`Fetch failed`

describe("merge(...sets)", () => {
  it("merges three sets at once", () => {
    const All = merge(OrderError, PositionError, AccountError)
    for (const err of [orderErr, positionErr, accountErr, rejectedErr]) {
      expect(All(err)).toBe(true)
      expect(err instanceof All).toBe(true)
    }
    expect(All(OtherError.invalid_symbol`x`)).toBe(false)
    expect(All({ set: "Merge.OrderError", kind: "rejected" })).toBe(false)
  })

  it("lists each kind name once, in first-seen order", () => {
    expect(merge(OrderError, PositionError, AccountError).kinds).toEqual([
      "invalid_symbol",
      "rejected",
      "fetch_failed",
      "locked",
    ])
  })

  it("is the same as chained merges and the set method", () => {
    const viaFunction = merge(OrderError, PositionError, AccountError)
    const viaMethod = OrderError.merge(PositionError, AccountError)
    const chained = merge(merge(OrderError, PositionError), AccountError)
    for (const guard of [viaMethod, chained]) {
      expect(guard.kinds).toEqual(viaFunction.kinds)
      for (const err of [orderErr, positionErr, accountErr, fetchErr]) {
        expect(guard(err)).toBe(true)
      }
      expect(guard(OtherError.invalid_symbol`x`)).toBe(false)
    }
  })

  it("de-duplicates repeated sets", () => {
    const Twice = merge(
      OrderError,
      OrderError,
      merge(OrderError, PositionError)
    )
    expect(Twice.kinds).toEqual(["invalid_symbol", "rejected", "fetch_failed"])
    expect(Twice(orderErr)).toBe(true)
  })

  it("a merged guard can be merged again with its own merge method", () => {
    const Both = merge(OrderError, PositionError)
    const All = Both.merge(AccountError)
    expect(All(accountErr)).toBe(true)
    expect(All(positionErr)).toBe(true)
    expect(Both(accountErr)).toBe(false)
  })

  it("a single set merges to an equivalent guard", () => {
    const Only = merge(OrderError)
    expect(Only(orderErr)).toBe(true)
    expect(Only(positionErr)).toBe(false)
    expect(Only.kinds).toEqual(["invalid_symbol", "rejected"])
  })

  it("leaves the original sets unchanged", () => {
    merge(OrderError, PositionError)
    expect(OrderError.kinds).toEqual(["invalid_symbol", "rejected"])
    expect(OrderError(positionErr)).toBe(false)
  })
})

describe("merged recover", () => {
  const Trading = merge(OrderError, PositionError, AccountError)

  const fullHandlers = {
    "Merge.OrderError": {
      invalid_symbol: () => "order.invalid_symbol",
      rejected: () => "order.rejected",
    },
    "Merge.PositionError": {
      invalid_symbol: () => "position.invalid_symbol",
      fetch_failed: () => "position.fetch_failed",
    },
    "Merge.AccountError": {
      locked: () => "account.locked",
    },
  }

  it("dispatches by (set, kind), so shared kind names stay distinct", () => {
    expect(Trading.recover(orderErr, fullHandlers)).toBe("order.invalid_symbol")
    expect(Trading.recover(positionErr, fullHandlers)).toBe(
      "position.invalid_symbol"
    )
    expect(Trading.recover(accountErr, fullHandlers)).toBe("account.locked")
  })

  it("passes the error to its handler", () => {
    const handler = mock((e: unknown) => e)
    Trading.recover(positionErr, {
      "Merge.PositionError": { invalid_symbol: handler },
      _: () => null,
    })
    expect(handler).toHaveBeenCalledWith(positionErr)
  })

  it("falls back to the _ catch-all", () => {
    const handlers = {
      "Merge.OrderError": { invalid_symbol: () => "order" },
      _: (e: { set: string; kind: string }) => `_:${e.set}.${e.kind}`,
    }
    expect(Trading.recover(orderErr, handlers)).toBe("order")
    expect(Trading.recover(positionErr, handlers)).toBe(
      "_:Merge.PositionError.invalid_symbol"
    )
    expect(Trading.recover(rejectedErr, handlers)).toBe(
      "_:Merge.OrderError.rejected"
    )
  })

  it("returns values that are not merged errors unchanged", () => {
    const value = { orderId: "o1" }
    expect(Trading.recover(value, fullHandlers)).toBe(value)
    const other = OtherError.invalid_symbol`x`
    expect(Trading.recover(other, { _: () => "handled" })).toBe(other)
  })

  it("ignores inherited properties of the handler map", () => {
    // handlers.constructor is Object, and Object.assign is a function
    const Weird = errorSet("constructor", ["assign"]).init()
    const handlers = { _: () => "catch-all" }
    // A set named "constructor" is legal; cast because TS checks the literal's
    // inherited constructor against the handler map's "constructor" key
    expect(merge(Weird).recover(Weird.assign`x`, handlers as never)).toBe(
      "catch-all"
    )
  })

  it("throws a clear error for untyped callers without a matching handler", () => {
    const untyped = Trading.recover as (
      value: unknown,
      handlers: object
    ) => unknown
    expect(() => untyped(fetchErr, {})).toThrow(
      'recover() has no handler for "Merge.PositionError.fetch_failed"'
    )
  })
})

describe("merged inspect", () => {
  const Trading = merge(OrderError, PositionError)

  it("calls the handler for the error's (set, kind) only", () => {
    const order = mock(() => undefined)
    const position = mock(() => undefined)
    const handlers = {
      "Merge.OrderError": { invalid_symbol: order },
      "Merge.PositionError": { invalid_symbol: position },
    }
    Trading.inspect(positionErr, handlers)
    expect(position).toHaveBeenCalledWith(positionErr)
    expect(order).not.toHaveBeenCalled()
  })

  it("does nothing for unhandled kinds, other sets and non-errors", () => {
    const order = mock(() => undefined)
    const handlers = { "Merge.OrderError": { invalid_symbol: order } }
    Trading.inspect(rejectedErr, handlers)
    Trading.inspect(fetchErr, handlers)
    Trading.inspect(OtherError.invalid_symbol`x`, handlers)
    Trading.inspect({ orderId: "o1" }, handlers)
    expect(order).not.toHaveBeenCalled()
  })
})
