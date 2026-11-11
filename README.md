<p align="center">
  <img src="./logo.png" alt="errorset logo" width="500" />
</p>

# errorset

**Domain-bound, type-safe error handling for TypeScript, inspired by Zig.**

> Expected failures should be values, not exceptions.

---

## Why This Library?

JavaScript has `try/catch` for error handling, but it comes with problems:
- **Invisible control flow** — you can't tell from a function signature which errors it might produce
- **Untyped errors** — `catch (e)` gives you `unknown`, not structured data
- **No exhaustiveness checking** — TypeScript can't help you handle all cases

Libraries like `neverthrow` address some of this, but they introduce functional patterns (`Result<T,E>`, `map`, `flatMap`) that can feel foreign in idiomatic TypeScript codebases.

**errorset** takes a different approach. It doesn't try to replace `try/catch` everywhere, and it doesn't introduce complex functional patterns. Instead, it gives you **plain objects** that represent expected failures, with full type safety and zero wrapping/unwrapping overhead.

## The Core Idea

Errors are just values. You return them from functions. You check them with guards. You use native `if/switch` to handle them.

```typescript
import { errorSet } from "@takinprofit/errorset";

type User = { id: string; name: string; email: string };

// Define your error set — bound to a domain type
const UserError = errorSet("UserError", ["not_found", "suspended", "invalid"])
  .init<User>();
export type UserError = typeof UserError.Type;

// Return errors instead of throwing
function findUser(id: string): User | UserError {
  const user = db.get(id);
  if (!user) {
    return UserError.not_found`User ${"id"} not found`({ id });
  }
  if (user.suspended) {
    return UserError.suspended`User ${"name"} is suspended`(user);
  }
  return user;
}

// Handle errors with native control flow
const result = findUser("abc123");

if (UserError(result)) {
  console.log(result.kind);    // "not_found" | "suspended" | "invalid"
  console.log(result.message); // "User abc123 not found"
  console.log(result.data);    // { id: "abc123" }
  return;
}

// After the guard, TypeScript knows it's a User
console.log(result.name);
```

---

## Installation

```bash
# bun
bun add @takinprofit/errorset

# npm/yarn/pnpm
npm install @takinprofit/errorset
```

Requires Bun ≥ 1.3.14 or Node.js ≥ 22 (ES modules and `require()`). Types are checked against
TypeScript 5.9, 6.0 and 7.0; there is no TypeScript peer dependency.

### Upgrading from 0.3

0.4.0 is a breaking release: guards check which set an error came from, errors are frozen,
no-context errors are plain objects, `recover` is exhaustive, and `cause` accepts any value.
Follow the [migration guide](docs/migration-0.4.md), which has before/after code for every
change and steps to audit code where several sets share a kind name.

---

## When to Use Error Sets vs `throw`

This library is for **expected failures** — outcomes that are failures but are normal parts of your application.

| Use Error Sets For | Use `throw` For |
|---|---|
| User not found | Null pointer dereference |
| Validation failed | Array index out of bounds |
| Payment declined | Invalid function arguments |
| Resource unavailable | Assertion failures |
| Business rule violations | Programmer mistakes |

**The rule**: If a failure is *possible* and *expected* given valid inputs, return an error. If a failure indicates a *bug* that should never happen, throw.

---

## Creating Error Sets

Define error sets with the builder pattern:

```typescript
import { errorSet } from "@takinprofit/errorset";

type User = { id: string; name: string; email: string };

// Name and kinds first, then bind the entity type with .init<T>()
const UserError = errorSet("UserError", ["not_found", "suspended", "invalid"])
  .init<User>();

// Export a type with the same name for type-value identity
export type UserError = typeof UserError.Type;
```

The `errorSet` function uses TypeScript 5.0's `const` type parameter feature to automatically infer literal types from the array. This ensures `result.kind` is typed as `"not_found" | "suspended" | "invalid"` rather than just `string`.

With this pattern, `UserError` works like a native class or enum — you can use it in both type and value positions:

```typescript
// In type position (function signatures)
function getUser(id: string): User | UserError { ... }

// In value position (runtime guards)
if (UserError(result)) { ... }
```

### Per-Instance Configuration

You can pass configuration options to `.init<T>()`:

```typescript
const VerboseError = errorSet("VerboseError", ["error"])
  .init<User>({
    includeStack: true,
    includeTimestamp: true
  });
```

Per-instance config only affects that error set — other sets continue using global config.

### Duplicate Detection

Error sets validate that all kinds are unique. Duplicates are caught at both compile time and runtime:

```typescript
// ❌ Compile-time error: TypeScript rejects duplicate kinds
const BadError = errorSet("BadError", ["not_found", "invalid", "not_found"])
  .init<User>();

// ❌ Runtime error (for JS consumers or edge cases):
// Error: Duplicate kind "not_found" in error set "BadError"
```

This prevents subtle bugs where duplicate kinds could cause property collisions or unexpected behavior.

### Reserved Kind Names

Kinds become properties of the error set, so a few names are reserved: the set's own members
(`recover`, `inspect`, `merge`, `capture`, `captureAsync`, `kinds`, `Type`, and `from`), the `_`
catch-all key of `recover`, and the names every JavaScript function inherits (`name`, `length`,
`call`, `apply`, `bind`, `constructor`, `toString`, `valueOf`, `__proto__`, …). The full list is
exported as `RESERVED_KINDS`. A reserved name fails to compile and throws a clear error at runtime:

```typescript
errorSet("JobError", ["recover", "timeout"]);
// ❌ Type error: '"recover" is a reserved kind name in errorset; rename the kind'
// Runtime (untyped callers): Error: "recover" is a reserved kind name in errorset; rename the kind
```

---

## Creating Errors

Use tagged template literals. The template holes specify which fields to extract from your domain object:

```typescript
const user = { id: "123", name: "John", email: "john@example.com" };

// Template holes are constrained to keyof User
const err = UserError.not_found`User ${"id"} does not exist`(user);
// TypeScript error: UserError.not_found`User ${"missing"} ...`  // "missing" is not keyof User

err.kind;    // "not_found"
err.message; // "User 123 does not exist"
err.data;    // { id: "123" } — only referenced fields
```

This is the key insight: template holes aren't just for interpolation. They tell errorset which fields matter for this error, and those fields are automatically extracted into `err.data`.

### Simplified Syntax for No-Context Errors

When your error message doesn't need any context data, use the template literal directly:

```typescript
// No template holes — the template itself is the error
return UserError.invalid`Invalid user data`;

// Add a cause with .with(): returns a new error, the original is unchanged
return UserError.invalid`Invalid user data`.with({ cause: previousError });
```

Errors without template holes are plain error objects (`NoContextErr`), like every other error:
they serialize with `JSON.stringify` and can be sent through `structuredClone`, `postMessage`
and worker or IPC boundaries. A structured clone carries the data (`set`, `kind`, `message`,
`data`, `cause`) but not the brand symbol, so guards don't recognize the clone until you
rehydrate it with [`from()`](#rehydration-from).

### Error Chaining

Wrap lower-level errors with the `cause` option:

```typescript
const dbResult = DbError.capture(() => db.query(sql), mapError);
if (DbError(dbResult)) {
  return UserError.not_found`User ${"id"} not found`({ id }, { cause: dbResult });
}
```

`cause` follows ES2022 `Error.cause`: it accepts any value (another errorset error, a native
`Error`, anything thrown) and is typed `unknown`, so narrow it before use:

```typescript
if (ServiceError(result) && UserError(result.cause)) {
  console.log(result.kind);        // "processing_failed"
  console.log(result.cause.kind);  // "not_found"
  console.log(result.cause.data);  // { id: "user1" }
}

// Native errors work too
return DbError.unavailable`Database unavailable`.with({ cause: new Error("ECONNREFUSED") });
```

### Immutability

Errors are frozen when they are created, and so is their `data` object. Assigning to, adding
or deleting a field throws a `TypeError` in strict mode (every ES module and class body):

```typescript
const err = UserError.not_found`User ${"id"} not found`({ id: "abc123" });
err.message = "changed"; // TypeError (read-only property)
err.data.id = "changed"; // TypeError (read-only property)
```

To change an error, create a new one; `.with()` and `capture` also return new errors. The
freeze is shallow: objects nested inside `data` keep their own mutability, and the entity you
pass in is never frozen. Freezing costs a few nanoseconds per object (about 15 ns per
template error on the reference machine).

---

## Checking for Errors

### Set-Level Guard

Check if a value is *any* error from a set:

```typescript
const result = getUser("123");

if (UserError(result)) {
  // result is UserError (union of not_found | suspended | invalid)
  console.log(result.kind);
  return;
}

// After guard, TypeScript knows it's User
console.log(result.name);
```

### Set Identity

Every error records the set that created it in a `set` field (`err.set === "UserError"`), and
set guards, kind guards, `instanceof`, `recover`, `inspect` and merged guards all check it. Two
sets that share a kind name never match each other's errors:

```typescript
const OrderError = errorSet("OrderError", ["invalid_symbol", "rejected"]).init<Order>();
const PositionError = errorSet("PositionError", ["invalid_symbol", "fetch_failed"]).init<Position>();

const err = PositionError.invalid_symbol`Bad symbol ${"symbol"}`({ symbol: "XYZ" });
OrderError(err);                // false
OrderError.invalid_symbol(err); // false
PositionError(err);             // true
```

The set name is part of the type too (`Err<Kind, Data, SetName>`), so narrowing a union of
`OrderError | PositionError` with `OrderError(value)` leaves only `OrderError`. When you write an
error type by hand, include the set name or use `typeof UserError.Type`.

**Set names must be unique.** Errors are matched by set name, not by object identity, which is
what lets separately bundled copies recognize each other. Defining the same name again with the
same kinds is fine (hot reload, tests); defining it with different kinds logs a one-time
`console.warn`, because those sets would accept each other's errors for the kinds they share.
Namespaced names such as `"billing/PaymentError"` avoid collisions.

### `instanceof` Syntax

Error sets support `instanceof` via `Symbol.hasInstance`:

```typescript
if (result instanceof UserError) { ... }
```

Both forms are equivalent — use whichever feels natural.

### Kind-Level Guard

Check for a *specific* error kind:

```typescript
if (UserError.not_found(result)) {
  // result.kind is specifically "not_found"
  console.log(result.data.id);
  return;
}

if (UserError.suspended(result)) {
  // result.kind is specifically "suspended"
  notifyAdmin(result.data.name);
  return;
}
```

### Universal Guard

Check if *any* value is *any* error from *any* set:

```typescript
import { isErr } from "@takinprofit/errorset";

if (isErr(result)) {
  console.log(result.kind, result.message);
}
```

### Across Copies and Versions

Errors are recognized by a brand stored under the registry symbol
`Symbol.for("@takinprofit/errorset/err")` (exported as `ERR`), not by object identity or
prototypes. Every copy of errorset loaded in the same process shares that symbol, so an
error created by a separately bundled plugin, a duplicate install or another version passes
`isErr` and the set and kind guards of your copy.

The brand's value is a protocol number (`ERR_PROTOCOL`, currently `1`). Guards accept the
protocols they understand, so copies with the same protocol interoperate; a future
incompatible error shape will bump it. Brand checks do not survive serialization:
`JSON.parse(JSON.stringify(err))` is plain data.

---

## Handling Errors

### Native Control Flow (Recommended)

The `kind` property is a string literal union. TypeScript narrows it naturally:

```typescript
if (isErr(result)) {
  switch (result.kind) {
    case "not_found":
      return { status: 404, body: result.message };
    case "suspended":
      return { status: 403, body: "Account suspended" };
    case "invalid":
      return { status: 400, body: result.message };
  }
}
```

Or with kind-level guards:

```typescript
if (UserError.not_found(result)) return { status: 404 };
if (UserError.suspended(result)) return { status: 403 };
if (UserError(result)) return result;  // Propagate any other

// result is User here
```

### `recover` — Expression-Style Handling

When you need a guaranteed value and want expression-style handling:

```typescript
const user = UserError.recover(result, {
  not_found: () => guestUser,
  suspended: () => guestUser,
  invalid: () => guestUser,
});
// user is strictly User — no error types possible

// Or use a catch-all:
const user = UserError.recover(result, {
  _: () => guestUser,
});
```

Recovery is exhaustive and checked by the compiler: handle every kind of the set, or handle
some kinds and add the `_` catch-all. `recover(result, {})`, a partial map without `_`, and
unknown kind keys are type errors, so `recover` never throws from typed code. (Untyped callers
that skip both get a clear runtime error naming the set and kind.)

### `inspect` — Side Effects Only

Observe errors for logging/metrics without changing control flow:

```typescript
UserError.inspect(result, {
  suspended: (e) => audit.log(`Blocked user: ${e.data.id}`),
  not_found: (e) => metrics.increment("user.not_found"),
});

// result type unchanged — continue with normal flow
if (UserError(result)) return result;
```

---

## Propagation

Propagation is just returning. No special syntax:

```typescript
function processCheckout(id: string): Receipt | UserError | DbError {
  const user = getUser(id);
  if (UserError(user)) return user;  // Propagate

  const order = getOrder(user.id);
  if (DbError(order)) return order;  // Propagate

  return createReceipt(user, order);
}
```

---

## Composing Error Sets

### `merge` — Combine at Boundaries

Merge error sets when you need to check for errors from multiple sources:

```typescript
const UserError = errorSet("UserError", ["not_found", "suspended"]).init<User>();
const DbError = errorSet("DbError", ["timeout", "connection"]).init<DbContext>();

const ServiceError = UserError.merge(DbError);

if (ServiceError(result)) {
  // result.kind is "not_found" | "suspended" | "timeout" | "connection"
}
```

**Note**: Merged sets lose data typing. For type-safe data access, use the original sets:

```typescript
if (ServiceError(result)) {
  if (UserError(result)) {
    console.log(result.data.name);  // Type-safe
  } else if (DbError(result)) {
    console.log(result.data.query); // Type-safe
  }
}
```

### Iteration

Error sets are iterable:

```typescript
const kinds = [...UserError];  // ["not_found", "suspended", "invalid"]

for (const kind of UserError) {
  console.log(kind);
}
```

---

## Bridging Throwing Code

### `capture` — Wrap Sync Code

Convert exceptions to error set values:

```typescript
const result = DbError.capture(
  () => db.querySync(sql),
  (e) => DbError.query_failed`Query failed: ${"message"}`({ sql, message: e.message })
);

if (DbError(result)) {
  console.log(result.kind);   // "query_failed"
  console.log(result.cause);  // the original exception, with its stack, code, errno...
}
```

The caught value is attached as `cause` unless your mapper sets one, so nothing about the
original failure is lost. The mapper always receives an `Error`: anything else that was thrown
(a string, a plain object) is wrapped in an `Error` whose message renders it readably (strings
as-is, objects as JSON), while `cause` keeps the original value. In JSON output a native `Error`
cause becomes `{ name, message, code? }`, without its stack.

### `captureAsync` — Wrap Async Code

```typescript
const result = await DbError.captureAsync(
  async () => await db.query(sql),
  (e) => DbError.query_failed`Query failed: ${"message"}`({ sql, message: e.message })
);
```

Rejections and synchronous throws inside the async function are handled the same way, with the
original value attached as `cause`.

---

## Configuration

```typescript
import { configure } from "@takinprofit/errorset";

configure({
  includeStack: boolean,     // Stack traces (V8 engines only, off by default)
  stackDepth: number,        // Max stack trace depth when includeStack is on (default 10)
  includeTimestamp: boolean, // Set err.timestamp = Date.now() at creation (off by default)
});

// Environment-based configuration
configure(
  process.env.NODE_ENV === "development"
    ? { includeStack: true }
    : { includeTimestamp: true }
);
```

The same options can be passed per set to `.init<T>(config)`; per-set values override the
global ones. When `includeTimestamp` is off, errors have no `timestamp` property at all.

**`configure()` is for applications.** It changes the defaults of every error set in the
process, including sets defined by libraries you depend on. If you publish a library, pass
options to your own sets with `.init<T>(config)` and never call `configure()`.

`configure()` returns a function that restores the previous configuration, which keeps tests
isolated:

```typescript
const restore = configure({ includeTimestamp: true });
try {
  // ...
} finally {
  restore();
}
```

Formatting is your logger's job: use `JSON.stringify(err)` or `String(err)` (see
[Serialization and Logging](#serialization-and-logging)). The `format` and `colors` options,
which never had an effect, were removed in 0.4.0.

Stack traces are disabled by default because error sets represent *expected* failures, not bugs. Enable them during development if you need to trace where errors originate.

---

## Debugger Output

Errors have custom `console.log` output:

```typescript
const err = UserError.not_found`User ${"id"} not found`({ id: "abc123" });
console.log(err);
// Output: UserError.not_found {"id":"abc123"}
```

## Serialization and Logging

Errors serialize to plain JSON, so they survive structured logs and HTTP responses:

```typescript
const err = UserError.not_found`User ${"id"} not found`({ id: "abc123" });

JSON.stringify(err);
// {"set":"UserError","kind":"not_found","message":"User abc123 not found","data":{"id":"abc123"}}

JSON.stringify({ error: UserError.invalid`Invalid user data` });
// {"error":{"set":"UserError","kind":"invalid","message":"Invalid user data","data":{}}}

String(err);  // "UserError.not_found: User abc123 not found"
`${err}`;     // same
```

The JSON shape is `{ set, kind, message, data, cause?, timestamp? }`. A `cause` that is an errorset error
serializes the same way, recursively; a native `Error` cause becomes `{ name, message, code? }`.
`toJSON` and `toString` are non-enumerable, so `Object.keys(err)` and spreading are
unchanged. Stack traces are not included in the JSON output.

### Rehydration: `from()`

The brand is a symbol, so an error that went through `JSON.stringify`, `structuredClone`,
`postMessage`, a worker or an HTTP response comes back as plain data that no guard
recognizes. `X.from(value)` turns it back into an error of set `X`:

```typescript
const body: unknown = await response.json();
const err = UserError.from(body);   // typeof UserError.Type | undefined

if (UserError.not_found(err)) {
  console.log(err.data.id);
}
```

`from()` checks that `value` is `{ set, kind, message, data, cause?, timestamp? }` with `set`
equal to the set's name, `kind` one of its kinds, `message` a string, `data` a plain object
and `timestamp` (if present) a number, and returns a branded, frozen error; for anything else
it returns `undefined`, so it is also a safe parser for untrusted input. Extra fields (such
as a `stack`) are ignored, the `timestamp` is kept, and no new stack is captured. `cause` is
kept as it arrived: rehydrate an errorset cause with its own set (`DbError.from(err.cause)`).
A live error of the set is returned unchanged.

---

## API Reference

| API | Purpose |
|---|---|
| `errorSet(name, kinds).init<T>()` | Define error set with builder pattern |
| `errorSet(name, kinds).init<T>(config)` | Define with per-instance config |
| `type X = typeof X.Type` | Type-value identity |
| `Set.kind\`msg\`` | Create error (no context) |
| `Set.kind\`msg\`.with({ cause })` | Create with cause (no context) |
| `Set.kind\`msg ${"field"}\`(data)` | Create error with context |
| `Set.kind\`msg ${"field"}\`(data, { cause })` | Create with context and cause |
| `err.set` / `err.kind` | Set name / kind of an error |
| `Set(value)` | Set-level guard |
| `value instanceof Set` | Alternative guard |
| `Set.kind(value)` | Kind-level guard |
| `isErr(value)` | Universal guard |
| `Set.recover(val, handlers)` | Expression-style handling |
| `Set.inspect(val, handlers)` | Side effects only |
| `Set.merge(other)` | Combine sets |
| `Set.capture(fn, map)` | Wrap sync code |
| `Set.captureAsync(fn, map)` | Wrap async code |
| `[...Set]` / `Set.kinds` | Iterate / list kinds |
| `JSON.stringify(err)` / `String(err)` | Serialize / format an error |
| `Set.from(value)` | Rehydrate a serialized or cloned error (or `undefined`) |
| `configure(options)` | Set global options (returns a restore function) |
| `ERR`, `ERR_PROTOCOL` | Brand symbol and protocol number |
| `RESERVED_KINDS` | Kind names that can't be used |

---

## Philosophy

### When in Rome

I've spent 16 years building software — 8 of those in TypeScript, and a significant portion in functional languages like Scala and F#. I have no issue with the `Result` type. I have no issue with category theory. What I *do* have an issue with is shoehorning functional idioms into languages where they don't belong.

When I write C#, I use object-oriented patterns and SOLID principles. When I write F#, I use discriminated unions and railway-oriented programming. **When in Rome, do as the Romans do.**

Libraries that force the `Result` type into TypeScript codebases often ignore the practical cost: `Result<T, E>` litters your entire codebase. Every function that could fail must return a wrapped type. Every caller must unwrap it. You end up with `.map()`, `.flatMap()`, and `.bind()` chains everywhere — functional ceremony in a language that isn't fundamentally functional.

### JavaScript Is Data-Oriented

If I had to categorize JavaScript (and by extension TypeScript), it wouldn't be functional. It wouldn't be object-oriented. It would be **data-oriented**.

JavaScript has more in common with Lua, Lisp, and Clojure than it does with Haskell or Java. Functions are data. Objects are just bags of properties. The language wants you to pass data around and transform it with plain functions. TypeScript's powerful type system can fool you into thinking you should impose structure from other paradigms, but the underlying language resists it.

### Errors Are Just Data

The most elegant error handling I've found for this paradigm draws inspiration from both **Go** and **Zig**: errors are values, returned alongside success values. No wrapping. No unwrapping. No special return type — just `User | UserError`.

That said, neither approach is without faults. Go's `if err != nil` is verbose and error values often lack structure. Zig's error sets are elegant but notoriously difficult to attach context to — you get an error code, but adding "which user?" or "what query failed?" requires workarounds.

This library takes the best of both and adapts it to TypeScript's strengths:

- Errors are plain objects in a union — no `Result<T, E>` wrapper
- Template literals automatically extract context into structured `data`
- You use native `if` statements and `switch` expressions
- TypeScript's type narrowing handles the rest

### Domain Errors, Not All Errors

This library doesn't aim to replace `try/catch` everywhere. Those constructs still have a place.

The target is **domain errors** — the well-defined failure modes within your business logic. User not found. Payment declined. Validation failed. These are expected outcomes that deserve explicit types and structured handling.

In the infrastructure layer, you might still catch database exceptions. In the application layer, you might wrap third-party APIs that throw. That's fine. `capture` and `captureAsync` exist precisely for bridging that world into typed error values at your domain boundary.

The goal is simple: within your domain, you should know exactly what can fail and handle it with the same clarity you bring to your success paths.

### Design Principles

1. **Expected failures are values** — not exceptions, not special monads
2. **Domain binding** — errors know their entity type
3. **Type-safe templates** — invalid field names don't compile
4. **Automatic context** — no manual data extraction
5. **Native control flow** — use `switch`/`if`, not `map`/`flatMap`
6. **Minimal API** — guards, `recover`, `inspect`, `merge`, `capture`

This library doesn't try to be everything. It's a focused tool for making expected failures explicit and type-safe while staying out of your way.

---

## License

MIT
