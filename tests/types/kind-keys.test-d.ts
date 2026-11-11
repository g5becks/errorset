/**
 * Per-kind data keys narrow data exactly (0.5.0, TASK-068, audit A14).
 */

import { expectTypeOf } from "expect-type"
import { type Err, errorSet } from "../../src/index.ts"

type User = { id: string; name: string; reason: string; email: string }

const UserError = errorSet("UserError", {
  not_found: ["id"],
  suspended: ["id", "reason"],
  invalid: [],
}).init<User>()

expectTypeOf(UserError.kinds).toEqualTypeOf<
  readonly ("not_found" | "suspended" | "invalid")[]
>()

// Kind guards narrow data to exactly the declared keys (no Partial, no `!`)
declare const value: unknown
if (UserError.suspended(value)) {
  expectTypeOf(value.data).toEqualTypeOf<Pick<User, "id" | "reason">>()
  expectTypeOf(value.data.reason).toEqualTypeOf<string>()
}
if (UserError.not_found(value)) {
  expectTypeOf(value.data).toEqualTypeOf<Pick<User, "id">>()
}
if (UserError.invalid(value)) {
  expectTypeOf(value.data).toEqualTypeOf<Pick<User, never>>()
}

// Creation: holes limited to declared keys; the entity must have every declared key
const suspended = UserError.suspended`User ${"id"} suspended: ${"reason"}`({
  id: "u1",
  reason: "spam",
})
expectTypeOf(suspended).toEqualTypeOf<
  Err<"suspended", Pick<User, "id" | "reason">, "UserError">
>()
const shortTemplate = UserError.suspended`User ${"id"} suspended`
// @ts-expect-error - reason is declared for suspended, so the entity must provide it
shortTemplate({ id: "u1" })
// @ts-expect-error - "name" is not a declared key of suspended
expectTypeOf(UserError.suspended`${"name"}`).toBeFunction()
// @ts-expect-error - "reason" is not a declared key of not_found
expectTypeOf(UserError.not_found`${"reason"}`).toBeFunction()

// A template without holes still needs the entity when keys are declared
const noHoles = UserError.not_found`User not found`({ id: "u1" })
expectTypeOf(noHoles.data).toEqualTypeOf<Pick<User, "id">>()

// A kind with no declared keys creates no-context errors
const invalid = UserError.invalid`Invalid user`
expectTypeOf(invalid.with).toBeFunction()

// Set-level types still cover every kind
expectTypeOf(UserError.Type.kind).toEqualTypeOf<
  "not_found" | "suspended" | "invalid"
>()

// init<T>() requires the declared keys to exist on T
// @ts-expect-error - "reason" is not a key of { id: string }
errorSet("Missing", { suspended: ["id", "reason"] }).init<{ id: string }>()

// Interfaces work too
interface Account {
  accountId: string
  balance: number
}
const AccountError = errorSet("AccountError", {
  overdrawn: ["accountId", "balance"],
}).init<Account>()
if (AccountError.overdrawn(value)) {
  expectTypeOf(value.data).toEqualTypeOf<
    Pick<Account, "accountId" | "balance">
  >()
}

// Reserved kind names are rejected in the object form
// @ts-expect-error - "recover" is a reserved kind name
errorSet("Reserved", { ok: [], recover: [] })

// The array form is unchanged
const Plain = errorSet("Plain", ["not_found"]).init<User>()
if (Plain.not_found(value)) {
  expectTypeOf(value.data).toEqualTypeOf<Partial<User>>()
}
