/**
 * Variadic, set-aware merge(): data narrows by set; recover is exhaustive over
 * (set, kind) pairs or has `_` (0.5.0, TASK-067, audit A9).
 */

import { expectTypeOf } from "expect-type"
import {
  type Err,
  errorSet,
  type GuardedError,
  type MergedGuard,
  merge,
} from "../../src/index.ts"

type Order = { orderId: string; symbol: string }
interface Position {
  positionId: string
  symbol: string
}
type Account = { accountId: string }

const OrderError = errorSet("OrderError", [
  "invalid_symbol",
  "rejected",
]).init<Order>()
const PositionError = errorSet("PositionError", [
  "invalid_symbol",
  "fetch_failed",
]).init<Position>()
const AccountError = errorSet("AccountError", ["locked"]).init<Account>()

type OrderErr = Err<"invalid_symbol" | "rejected", Partial<Order>, "OrderError">
type PositionErr = Err<
  "invalid_symbol" | "fetch_failed",
  Partial<Position>,
  "PositionError"
>
type AccountErr = Err<"locked", Partial<Account>, "AccountError">

const Trading = merge(OrderError, PositionError, AccountError)
type TradingErr = OrderErr | PositionErr | AccountErr

// The merged guard narrows to the union of the sets' error types, however it is built
expectTypeOf<GuardedError<typeof Trading>>().toEqualTypeOf<TradingErr>()
expectTypeOf(Trading).toExtend<MergedGuard<TradingErr>>()
expectTypeOf<MergedGuard<TradingErr>>().toExtend<typeof Trading>()
expectTypeOf<
  GuardedError<
    ReturnType<
      typeof OrderError.merge<[typeof PositionError, typeof AccountError]>
    >
  >
>().toEqualTypeOf<TradingErr>()
const chained = merge(merge(OrderError, PositionError), AccountError)
expectTypeOf<GuardedError<typeof chained>>().toEqualTypeOf<TradingErr>()
const viaMethod = OrderError.merge(PositionError).merge(AccountError)
expectTypeOf<GuardedError<typeof viaMethod>>().toEqualTypeOf<TradingErr>()
expectTypeOf(Trading.kinds).toEqualTypeOf<
  readonly ("invalid_symbol" | "rejected" | "fetch_failed" | "locked")[]
>()

// The guard narrows to a discriminated union over set; data narrows by set
declare const value: Order | Position | OrderErr | PositionErr | AccountErr
if (Trading(value)) {
  expectTypeOf(value).toEqualTypeOf<OrderErr | PositionErr | AccountErr>()
  if (value.set === "PositionError") {
    expectTypeOf(value.data).toEqualTypeOf<Partial<Position>>()
    expectTypeOf(value.kind).toEqualTypeOf<"invalid_symbol" | "fetch_failed">()
  } else if (value.set === "OrderError") {
    expectTypeOf(value.data).toEqualTypeOf<Partial<Order>>()
  }
} else {
  expectTypeOf(value).toEqualTypeOf<Order | Position>()
}

// recover: every (set, kind) pair handled -> compiles; result excludes the errors
const all = Trading.recover(value, {
  OrderError: {
    invalid_symbol: e => {
      expectTypeOf(e).toEqualTypeOf<
        Err<"invalid_symbol", Partial<Order>, "OrderError">
      >()
      return 1
    },
    rejected: () => 2,
  },
  PositionError: {
    invalid_symbol: e => {
      expectTypeOf(e.data).toEqualTypeOf<Partial<Position>>()
      return 3
    },
    fetch_failed: () => 4,
  },
  AccountError: { locked: () => 5 },
})
expectTypeOf(all).toEqualTypeOf<Order | Position | number>()

// recover: partial map plus "_" -> compiles; "_" receives the whole union
const partial = Trading.recover(value, {
  PositionError: { fetch_failed: () => "retry" },
  _: e => {
    expectTypeOf(e).toEqualTypeOf<OrderErr | PositionErr | AccountErr>()
    return "fail"
  },
})
expectTypeOf(partial).toEqualTypeOf<Order | Position | string>()

// @ts-expect-error - a missing pair (AccountError.locked) without "_" is not exhaustive
Trading.recover(value, {
  OrderError: { invalid_symbol: () => 1, rejected: () => 2 },
  PositionError: { invalid_symbol: () => 3, fetch_failed: () => 4 },
})

// @ts-expect-error - {} handles nothing
Trading.recover(value, {})

Trading.recover(value, {
  // @ts-expect-error - fetch_failed is not a kind of OrderError
  OrderError: { fetch_failed: () => 1 },
  _: () => 0,
})

// inspect: any subset of (set, kind) pairs
Trading.inspect(value, {
  PositionError: {
    invalid_symbol: e => {
      expectTypeOf(e.set).toEqualTypeOf<"PositionError">()
    },
  },
})
Trading.inspect(value, {})
Trading.inspect(value, {
  // @ts-expect-error - locked is not a kind of PositionError
  PositionError: { locked: () => undefined },
})
