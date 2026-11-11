/**
 * init<T>() accepts interface entity types (0.5.0, TASK-066, audit A13).
 * Interfaces have no implicit index signature, so `T extends Record<string, unknown>`
 * rejected them with TS2344.
 */

import { expectTypeOf } from "expect-type"
import { type Err, errorSet } from "../../src/index.ts"

interface Account {
  balance: number
  id: string
  owner: string
}

const AccountError = errorSet("AccountError", [
  "not_found",
  "overdrawn",
]).init<Account>()

// Template keys are constrained to the interface's keys
const overdrawn =
  AccountError.overdrawn`Account ${"id"} is overdrawn by ${"balance"}`({
    id: "a1",
    balance: -5,
  })
expectTypeOf(overdrawn.data).toEqualTypeOf<Pick<Account, "id" | "balance">>()
expectTypeOf(overdrawn.set).toEqualTypeOf<"AccountError">()

// @ts-expect-error - "missing" is not a key of Account
expectTypeOf(AccountError.not_found`${"missing"}`).toBeFunction()

// The creator requires the referenced fields with the interface's types
// @ts-expect-error - balance must be a number
AccountError.overdrawn`Balance ${"balance"}`({ balance: "5" })

// Kind guards narrow data to Partial<Account>
declare const value: unknown
if (AccountError.not_found(value)) {
  expectTypeOf(value.data).toEqualTypeOf<Partial<Account>>()
  expectTypeOf(value.kind).toEqualTypeOf<"not_found">()
}

// recover, capture and from work with interface entities
expectTypeOf(AccountError.from(value)).toEqualTypeOf<
  Err<"not_found" | "overdrawn", Partial<Account>, "AccountError"> | undefined
>()
const recovered = AccountError.recover(
  overdrawn as Account | typeof AccountError.Type,
  {
    _: () => null,
  }
)
expectTypeOf(recovered).toEqualTypeOf<Account | null>()

// Err accepts interface data
interface NotFoundData {
  id: string
}
type AccountNotFound = Err<"not_found", NotFoundData, "AccountError">
expectTypeOf<AccountNotFound["data"]>().toEqualTypeOf<NotFoundData>()

// The type-alias form is unchanged
type AccountAlias = { id: string; owner: string; balance: number }
const AliasError = errorSet("AliasError", ["not_found"]).init<AccountAlias>()
expectTypeOf(
  AliasError.not_found`Account ${"id"}`({ id: "a1" }).data
).toEqualTypeOf<Pick<AccountAlias, "id">>()
