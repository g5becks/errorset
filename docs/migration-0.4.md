# Migrating from errorset 0.3 to 0.4

errorset 0.4.0 fixes identity and correctness problems found in the 0.3 audit. Most
applications need only a few mechanical changes, but **guards now check which set an error
came from**, so code that shares kind names across sets can take different branches after
the upgrade. Read [Consumers with shared kind names](#consumers-with-shared-kind-names) before
upgrading.

Every entry below matches a `### Breaking changes` entry in [CHANGELOG.md](../CHANGELOG.md).

**Requirements** (unchanged since 0.3.1): Bun ≥ 1.3.14 or Node ≥ 22; any TypeScript from 5.9
to 7.x (no peer dependency).

## Checklist

1. Give every error set a unique name ([set identity](#1-errors-record-their-set-and-guards-are-set-precise)).
2. Audit every guard site where two sets share a kind name ([shared kind names](#consumers-with-shared-kind-names)).
3. Make every `recover` call exhaustive or add `_` ([recover](#2-recover-is-exhaustive)).
4. Rename kinds listed in `RESERVED_KINDS` ([reserved kinds](#3-reserved-kind-names-are-rejected)).
5. Narrow `err.cause` before reading it ([cause](#4-cause-accepts-any-value-and-capture-keeps-the-original-exception)).
6. Delete `format`/`colors` options ([config](#5-format-and-colors-are-removed-configure-returns-a-disposer)).
7. Replace ``X.kind`msg`({ cause })`` with `.with({ cause })` ([no-context errors](#6-no-context-errors-are-plain-objects)).
8. Stop mutating errors after creation ([immutability](#7-errors-are-immutable)).
9. Replace the internal helpers with `errorSet().init()` and `merge()` ([internal helpers](#8-internal-helpers-are-no-longer-exported)).
10. Replace `value[ERR] === true` with `isErr(value)` ([brand](#9-the-brand-is-a-registry-symbol-with-a-protocol-number)).

---

## 1. Errors record their set, and guards are set-precise

**What changed.** Every error has an enumerable, readonly `set` field holding its set's name,
and it appears in `toJSON` output. Set guards, kind guards, `instanceof`, `recover`, `inspect`
and merged guards compare the set as well as the kind. The `Err` type gains a third type
parameter, the set name: `Err<Kind, Data, SetName>`.

**Why.** In 0.3 only the kind was compared, so `OrderError.invalid_symbol(err)` was `true` for
a `PositionError.invalid_symbol` error (audit A1).

**Before (0.3):**

```typescript
const OrderError = errorSet("OrderError", ["invalid_symbol", "rejected"]).init<Order>();
const PositionError = errorSet("PositionError", ["invalid_symbol"]).init<Position>();

const err = PositionError.invalid_symbol`Bad ${"symbol"}`({ symbol: "XYZ" });
OrderError(err);                // true  (wrong)
OrderError.invalid_symbol(err); // true  (wrong)
Object.keys(err);               // ["kind", "message", "data"]

type NotFound = Err<"not_found", { id: string }>;
```

**After (0.4):**

```typescript
OrderError(err);                // false
OrderError.invalid_symbol(err); // false
PositionError(err);             // true
Object.keys(err);               // ["set", "kind", "message", "data"]
err.set;                        // "PositionError"

type NotFound = Err<"not_found", { id: string }, "UserError">;
// or, simpler:
type UserErr = typeof UserError.Type;
```

**How to migrate.**

- Hand-written `Err` types need the set name as the third argument, or use `typeof X.Type`.
- Tests or snapshots that compare `Object.keys(err)` or JSON output must expect `set`.
- **Set names must be unique.** Defining a name again with the same kinds is silent (hot
  reload, tests); defining it with different kinds logs a one-time `console.warn`, because
  those sets would accept each other's errors for the kinds they share. Use namespaced names
  such as `"billing/PaymentError"` if several packages define sets.

### Consumers with shared kind names

If two or more of your sets share a kind name (for example `not_found`, `validation_failed`,
`invalid_symbol`), any code that *accidentally* relied on cross-set matching will take a
different branch after the upgrade. TypeScript does not flag this: the guard still compiles,
it just returns `false` where it used to return `true`.

1. **List the shared kinds.** Collect every `errorSet(name, [kinds])` call and find the kind
   names that appear in more than one set. This one-liner prints each kind and the sets that
   define it (adjust the path; it only sees definitions whose kind list is on one line, so
   check multi-line definitions by hand):

   ```bash
   grep -rhoE 'errorSet\("[^"]+", *\[[^]]*\]' src \
     | sed -E 's/errorSet\("([^"]+)", *\[(.*)\]/\1 \2/' \
     | awk '{ set=$1; $1=""; gsub(/[" ]/, ""); n=split($0, k, ","); for (i=1;i<=n;i++) if (k[i]!="") print k[i], set }' \
     | sort | awk '{ sets[$1]=sets[$1] " " $2; c[$1]++ } END { for (k in c) if (c[k]>1) print k ":" sets[k] }'
   ```

2. **Find the guard sites for those sets.** Search for `XError(`, `XError.kind(`,
   `instanceof XError`, `XError.recover(` and `XError.inspect(` for every set in the list.
3. **For each site, ask where the value comes from.** If the value can hold an error from a
   *different* set with the same kind name (for example a function that returns
   `Order | OrderError | PositionError`, or an error that passed through a shared helper), the
   0.3 guard matched it and the 0.4 guard does not.
   - If the old behavior was a bug, the new branch is correct; add a test for it.
   - If the code meant "any set's `not_found`", say so explicitly: check each set
     (`OrderError.not_found(r) || PositionError.not_found(r)`), combine the sets with
     `const AnyError = OrderError.merge(PositionError)`, or switch on `isErr(r) && r.kind`.
4. **Check functions that re-tag errors.** Code that built an error with one set and checked
   it with another (for example a mapper in an adapter layer) must check with the set that
   created it.
5. **Run your tests with the warning visible.** A `console.warn` about a redefined set name
   means two different sets share a name; rename one.

### Bundled copies

Plugins built with their own copy of errorset (or a duplicate install of another version)
are recognized by the host's guards in 0.4 (see [the brand](#9-the-brand-is-a-registry-symbol-with-a-protocol-number)).
Recognition works by set name, so unique set names matter even more across plugin
boundaries. Sharing one copy is still better: build plugins with errorset marked external
(for example `bun build --external @takinprofit/errorset`) so the host and its plugins share
one configuration and one version.

---

## 2. `recover` is exhaustive

**What changed.** `recover` handlers must cover every kind of the set (with `_` optional), or
cover some kinds and include the `_` catch-all. Keys that are not kinds of the set are
rejected.

**Why.** In 0.3, `recover(value, {})` or a partial map compiled and then threw
`No handler found…` at runtime (audit A10).

**Before (0.3):** compiles, throws at runtime for `suspended`:

```typescript
const user = UserError.recover(result, {
  not_found: () => guestUser,
});
```

**After (0.4):** a type error; fix it with every kind or a catch-all:

```typescript
const user = UserError.recover(result, {
  not_found: () => guestUser,
  _: e => fail(e),
});
```

**How to migrate.** Add the missing kinds or `_` to every call the compiler flags. Untyped
(JavaScript) callers still get a runtime error, now worded
`recover() has no handler for "<Set>.<kind>"`; update code that matches the old message.

---

## 3. Reserved kind names are rejected

**What changed.** Kind names that collide with the set's members or with built-in function
properties fail to compile (the `NoReserved` constraint, with a message naming the word), and
`errorSet()` throws `"<name>" is a reserved kind name in errorset; rename the kind` before
defining anything. The full list is exported as `RESERVED_KINDS`: the set's members
(`recover`, `inspect`, `merge`, `capture`, `captureAsync`, `kinds`, `Type`, `from`), the
`recover` catch-all `_`, and the `Function.prototype`/`Object.prototype` names (`name`,
`length`, `call`, `apply`, `bind`, `constructor`, `toString`, `valueOf`, `__proto__`, …).

**Why.** In 0.3 the member names compiled and then threw a cryptic `TypeError` at `init()`,
and built-in names such as `name` silently shadowed function properties (audit A3). `from` is
reserved for the rehydration API planned for 0.5.0.

**Before (0.3):**

```typescript
const FileError = errorSet("FileError", ["name", "from"]).init<File>(); // compiled
```

**After (0.4):**

```typescript
const FileError = errorSet("FileError", ["invalid_name", "from_failed"]).init<File>();
```

**How to migrate.** Rename every kind that appears in `RESERVED_KINDS`, and update the code
that creates and checks those kinds.

---

## 4. `cause` accepts any value, and `capture` keeps the original exception

**What changed.** `ErrorOptions.cause` and `Err.cause` are typed `unknown`, following ES2022
`Error.cause`: a native `Error`, another errorset error or any thrown value is accepted.
`capture` and `captureAsync` attach the caught value as the mapped error's `cause` (unless the
mapper set one), so stacks, `code`, `errno` and nested causes survive. Non-`Error` throws reach
the mapper wrapped in an `Error` with a readable message (strings as-is, objects as cycle-safe
JSON) instead of `"[object Object]"`. `toJSON` renders a native `Error` cause as
`{ name, message, code? }`.

**Why.** In 0.3 only errorset errors type-checked as a cause, and `capture` flattened the
original exception into a message, losing its stack and code (audit A6).

**Before (0.3):**

```typescript
// Type error (TS2739): a native Error was not an accepted cause
DbError.unavailable`Database unavailable`({ cause: new Error("ECONNREFUSED") });

const r = DbError.capture(() => db.query(sql), e => DbError.query_failed`${"message"}`({ message: e.message }));
r.cause;            // undefined: the SqliteError and its code were gone
r.cause?.kind;      // compiled, because cause was typed as an errorset error
```

**After (0.4):**

```typescript
DbError.unavailable`Database unavailable`.with({ cause: new Error("ECONNREFUSED") });

const r = DbError.capture(() => db.query(sql), e => DbError.query_failed`${"message"}`({ message: e.message }));
r.cause;            // the original SqliteError (stack, code, errno intact)

if (isErr(r.cause)) {
  r.cause.kind;     // narrow before reading errorset fields
}
if (UserError(r.cause)) {
  r.cause.data.id;  // or narrow to a specific set
}
```

**How to migrate.**

- Code that reads `err.cause.kind` or `err.cause.data` must narrow first with `isErr` or a set
  guard.
- Error-mapping layers that copied an exception's message into the error can keep the
  exception itself as `cause` instead of flattening it: `capture` does this automatically, and
  hand-written mappers can pass `{ cause: e }`.
- Code that relied on a captured error having no `cause` must expect one.
- Messages built from `e.message` for thrown plain objects change from `"[object Object]"` to
  JSON.

---

## 5. `format` and `colors` are removed; `configure()` returns a disposer

**What changed.** The `format` and `colors` options and the `Format` type, deprecated in 0.3.1
because they never had an effect, are gone: passing them is a type error, and `configure()`
ignores them (and any unknown option) at runtime. `configure()` returns a function that
restores the previous configuration. Global configuration is documented as
application-only.

**Why.** The options were no-ops (audits A11, A12), and global configuration called from a
library changed every other library's errors.

**Before (0.3):**

```typescript
import { configure, type Format } from "@takinprofit/errorset";

configure({ format: "pretty", colors: true, includeStack: true });
afterEach(() => resetConfig());
```

**After (0.4):**

```typescript
import { configure } from "@takinprofit/errorset";

const restore = configure({ includeStack: true });
afterEach(() => restore());

logger.error(JSON.stringify(err)); // formatting is the logger's job
```

**How to migrate.** Delete `format`/`colors` from `configure()` and `init()` calls and the
`Format` import. Libraries that call `configure()` should move their options to their own sets
with `errorSet(name, kinds).init<T>(config)`.

---

## 6. No-context errors are plain objects

**What changed.** ``X.kind`static message` `` used to return a *function* with error
properties (`CallableErr`). It now returns a plain error object (`NoContextErr`) like every
other error. Options such as `cause` go through a non-enumerable `.with(options)`, which
returns a new error and leaves the original unchanged.

**Why.** A function can never cross a `structuredClone`, `postMessage`, worker or IPC
boundary, and two error shapes made every consumer handle both (audit A4). A structured clone
now carries the data (`set`, `kind`, `message`, `data`, `cause`) but not the brand symbol;
rehydration with `from()` is planned for 0.5.0.

**Before (0.3):**

```typescript
return UserError.invalid`Invalid user data`({ cause: previous });
return UserError.invalid`Invalid user data`();
typeof UserError.invalid`Invalid user data`; // "function"
import type { CallableErr } from "@takinprofit/errorset";
```

**After (0.4):**

```typescript
return UserError.invalid`Invalid user data`.with({ cause: previous });
return UserError.invalid`Invalid user data`;
typeof UserError.invalid`Invalid user data`; // "object"
import type { NoContextErr } from "@takinprofit/errorset";
```

**How to migrate.** Replace ``X.kind`msg`({ cause })`` with ``X.kind`msg`.with({ cause })``
and ``X.kind`msg`()`` with ``X.kind`msg` ``. Rename `CallableErr` to `NoContextErr`. Code that
checked `typeof err === "function"` must expect `"object"`.

---

## 7. Errors are immutable

**What changed.** Every error and its `data` object are frozen at creation. The freeze is
shallow: values nested inside `data` keep their own mutability, and the entity you pass in is
not frozen. Writing, adding or deleting a field throws a `TypeError` in strict mode (every ES
module and class body) and fails silently in sloppy scripts. `.with()` and `capture` derive
new frozen errors instead of mutating.

**Why.** `err.message = "changed"` succeeded in 0.3 despite the `readonly` types, and errors
pass through many layers (audit A8). Freezing costs about 6–9 ns per object: template-error
creation measured +14.5 ns, no-context errors +7.3 ns (see the CHANGELOG).

**Before (0.3):**

```typescript
const err = UserError.not_found`User ${"id"} not found`({ id });
err.message = `${err.message} (retrying)`; // silently allowed
err.data.id = "redacted";
(err as any).cause = upstream;
```

**After (0.4):**

```typescript
// err.message = "…" now throws a TypeError (read-only property); create a new error instead
const retried = UserError.not_found`User ${"id"} not found (retrying)`({ id });
const redacted = UserError.not_found`User ${"id"} not found`({ id: "redacted" });
const withCause = UserError.not_found`User ${"id"} not found`({ id }, { cause: upstream });
```

**How to migrate.** Create a new error instead of modifying one. Attach causes with the
`cause` option, `.with({ cause })` or `capture`.

---

## 8. Internal helpers are no longer exported

**What changed.** `createKindFunction`, `createSetGuard` and `createSetGuardWithKinds`,
deprecated in 0.3.1, are removed from the package entry. There is no `./internal` subpath.

**Why.** They exposed implementation details that the identity and immutability changes
needed to change (audit C1).

**Before (0.3):**

```typescript
import { createSetGuard } from "@takinprofit/errorset";
const isApiError = createSetGuard(["timeout", "unavailable"]);
```

**After (0.4):**

```typescript
import { errorSet } from "@takinprofit/errorset";
const ApiError = errorSet("ApiError", ["timeout", "unavailable"]).init();
ApiError(value); // the set itself is the guard
// combine existing sets with merge():
const ServiceError = UserError.merge(DbError);
```

**How to migrate.** Build sets with `errorSet(name, kinds).init<T>()` and combine guards with
`merge()` or `Set.merge()`.

---

## 9. The brand is a registry symbol with a protocol number

**What changed.** `ERR` is now `Symbol.for("@takinprofit/errorset/err")` instead of a
per-module `Symbol("err")`, and an error's `[ERR]` value is the protocol number `1` (exported
as `ERR_PROTOCOL`, type `ErrProtocol`) instead of `true`.

**Why.** Errors created by another copy of errorset in the same process (a bundled plugin, a
duplicate install) failed `isErr` and every guard in 0.3 (audit A2).

**Before (0.3):**

```typescript
if ((value as any)[ERR] === true) { … }
const fake = { [ERR]: true, kind: "not_found", message: "x", data: {} };
```

**After (0.4):**

```typescript
if (isErr(value)) { … }
const fake = { [ERR]: ERR_PROTOCOL, set: "UserError", kind: "not_found", message: "x", data: {} };
```

**How to migrate.** Use `isErr(value)` or a set guard instead of reading the brand. Code that
builds error-like objects by hand must use `[ERR]: ERR_PROTOCOL` and include `set`. The `Err`
type's `[ERR]` property is now `ErrProtocol` (`1`).
