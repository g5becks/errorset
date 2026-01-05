<p align="center">
  <img src="./logo.png" alt="errorset logo" width="300" />
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
import { errorSet } from "errorset";

type User = { id: string; name: string; email: string };

// Define your error set — bound to a domain type
const UserError = errorSet<User>("UserError", "not_found", "suspended", "invalid");
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
bun add errorset

# npm/yarn/pnpm
npm install errorset
```

Requires TypeScript 5+.

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

Define error sets with `errorSet<T>()` where `T` is your domain type:

```typescript
import { errorSet } from "errorset";

type User = { id: string; name: string; email: string };

// Name first, then error kinds
const UserError = errorSet<User>("UserError", "not_found", "suspended", "invalid");

// Export a type with the same name for type-value identity
export type UserError = typeof UserError.Type;
```

With this pattern, `UserError` works like a native class or enum — you can use it in both type and value positions:

```typescript
// In type position (function signatures)
function getUser(id: string): User | UserError { ... }

// In value position (runtime guards)
if (UserError(result)) { ... }
```

### Alternative Object Syntax

You can also create error sets with an options object:

```typescript
const UserError = errorSet<User>({
  name: "UserError",
  kinds: ["not_found", "suspended", "invalid"]
});
```

This form supports **per-instance configuration** that overrides global settings:

```typescript
const VerboseError = errorSet<User>({
  name: "VerboseError",
  kinds: ["error"],
  config: {
    includeStack: true,
    format: "pretty"
  }
});
```

Per-instance config only affects that error set — other sets continue using global config.

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

### Empty Templates

For errors that don't need a message:

```typescript
UserError.suspended``(user);  // message: "", data: {}
```

### Error Chaining

Wrap lower-level errors with the `cause` option:

```typescript
const dbResult = DbError.capture(() => db.query(sql), mapError);
if (DbError(dbResult)) {
  return UserError.not_found`User ${"id"} not found`({ id }, { cause: dbResult });
}
```

Access the chain via `result.cause`:

```typescript
if (ServiceError(result)) {
  console.log(result.kind);          // "processing_failed"
  console.log(result.cause?.kind);   // "not_found"
  console.log(result.cause?.data);   // { id: "user1" }
}
```

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
import { isErr } from "errorset";

if (isErr(result)) {
  console.log(result.kind, result.message);
}
```

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
const UserError = errorSet<User>("UserError", "not_found", "suspended");
const DbError = errorSet<DbContext>("DbError", "timeout", "connection");

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
  console.log(result.kind);  // "query_failed"
}
```

### `captureAsync` — Wrap Async Code

```typescript
const result = await DbError.captureAsync(
  async () => await db.query(sql),
  (e) => DbError.query_failed`Query failed: ${"message"}`({ sql, message: e.message })
);
```

---

## Configuration

```typescript
import { configure } from "errorset";

configure({
  format: "pretty" | "json" | "minimal",
  includeStack: boolean,     // Stack traces (V8 only, off by default)
  includeTimestamp: boolean, // Timestamps (off by default)
  colors: boolean,           // ANSI colors in pretty format
  stackDepth: number,        // Max stack trace depth
});

// Environment-based configuration
configure(
  process.env.NODE_ENV === "development"
    ? { format: "pretty", colors: true, includeStack: true }
    : { format: "json", includeTimestamp: true }
);
```

Stack traces are disabled by default because error sets represent *expected* failures, not bugs. Enable them during development if you need to trace where errors originate.

---

## Debugger Output

Errors have custom `console.log` output:

```typescript
const err = UserError.not_found`User ${"id"} not found`({ id: "abc123" });
console.log(err);
// Output: UserError.not_found { id: "abc123" }
```

---

## API Reference

| API | Purpose |
|---|---|
| `errorSet<T>(name, ...kinds)` | Define error set (positional) |
| `errorSet<T>({ name, kinds, config? })` | Define error set (object) |
| `type X = typeof X.Type` | Type-value identity |
| `Set.kind\`msg\`(data)` | Create error |
| `Set.kind\`msg\`(data, { cause })` | Create with cause |
| `Set(value)` | Set-level guard |
| `value instanceof Set` | Alternative guard |
| `Set.kind(value)` | Kind-level guard |
| `isErr(value)` | Universal guard |
| `Set.recover(val, handlers)` | Expression-style handling |
| `Set.inspect(val, handlers)` | Side effects only |
| `Set.merge(other)` | Combine sets |
| `Set.capture(fn, map)` | Wrap sync code |
| `Set.captureAsync(fn, map)` | Wrap async code |
| `[...Set]` | Iterate kinds |
| `configure(options)` | Set global options |

---

## Philosophy

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
