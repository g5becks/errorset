# Error Sets for TypeScript

> Domain-bound, type-safe error handling inspired by Zig.

## Vision

**Goal**: The defacto TypeScript error handling library for large-scale development.

**Core Insight**: Errors should be bound to domain types, not arbitrary strings. Template literal holes should be constrained to valid field names. Context should be extracted automatically.

---

## Philosophy: When to Use Error Sets vs Throw

Error sets are designed for **expected domain failures** — outcomes that are failures but are part of normal program behavior.

| Use Error Sets For | Use `throw` For |
|--------------------|-----------------|
| User not found | Null pointer dereference |
| Validation failed | Array index out of bounds |
| Payment declined | Invalid function arguments |
| Resource unavailable | Assertion failures |
| Business rule violations | Programmer mistakes |

**The distinction**: If a failure is *possible* and *expected* given valid inputs, return an error. If a failure indicates a *bug* that should never happen, throw.

```typescript
// ERROR SET: Expected failure - user might not exist
function findUser(id: string): User | UserError {
  const user = db.get(id);
  if (!user) return UserError.not_found`User ${"id"} not found`({ id });
  return user;
}

// THROW: Bug - programmer passed invalid argument
function findUser(id: string): User | UserError {
  if (!id) throw new Error("findUser requires an id"); // Invariant violation
  // ...
}
```

**Stack traces** are primarily useful for debugging unexpected failures. Since error sets represent expected failures, stack traces are optional and disabled by default. Enable them during development if you need to trace where errors originate:

```typescript
configure({
  includeStack: process.env.NODE_ENV === "development",
});
```

---

## The Problem with Current Approaches

| Approach | Problem |
|----------|---------|
| `try/catch` | Invisible control flow, untyped errors |
| `Result<T,E>` | Wrapping/unwrapping overhead, verbose |
| `neverthrow` et al | Still Result-based, doesn't scale to large codebases |
| String errors | No structure, no type safety, no context |

---

## The Solution: Domain-Bound Error Sets

```typescript
type User = { name: string; age: number; id: string };

// Define error set bound to domain type
const UserError = errorSet<User>("UserError", "connection", "validation", "not_found");

// Create error - template holes are constrained to keyof User
const err = UserError.connection`Failed to connect for ${"name"} (id: ${"id"})`(user);
//                                                       ^^^^^^       ^^^^
//                                            Must be keyof User - compile error otherwise

// Result:
// {
//   [ERR]: true,
//   kind: "connection",
//   message: "Failed to connect for name: John (id: abc123)",
//   data: { name: "John", id: "abc123" }
// }
```

---

## Core Concepts

### 1. Domain Binding

Error sets are tied to entity types. `UserError` knows about `User`. `OrderError` knows about `Order`.

```typescript
type User = { name: string; id: string };
type Order = { orderId: string; total: number; userId: string };

const UserError = errorSet<User>("UserError", "not_found", "invalid", "suspended");
const OrderError = errorSet<Order>("OrderError", "payment_failed", "out_of_stock", "cancelled");
```

### 2. Type-Safe Template Holes

Template literal holes are constrained to `keyof T`. Invalid field names are compile errors.

```typescript
UserError.not_found`User ${"name"} not found`(user);    // ✓ Valid
UserError.not_found`User ${"email"} not found`(user);   // ✗ Compile error: "email" not in User
```

### 3. Automatic Context Extraction

Referenced fields are automatically extracted into the error's data payload.

```typescript
// Instead of this (manual, error-prone):
return {
  type: "not_found",
  message: `User ${user.name} not found`,
  data: { name: user.name, id: user.id }
};

// Just this (automatic):
return UserError.not_found`User ${"name"} not found (id: ${"id"})`(user);
// data automatically contains: { name: "John", id: "abc123" }
```

### 4. Error Chaining

Errors can wrap other errors using the `cause` property:

```typescript
const dbResult = DbError.capture(() => db.query(sql), mapDbError);
if (DbError(dbResult)) {
  // Wrap the database error in a domain error
  return UserError.not_found`User ${"id"} not found`({ id }, { cause: dbResult });
}
```

---

## Core API

### Defining Error Sets

```typescript
import { errorSet } from "errorset";

type User = { name: string; age: number; id: string };

// Error set bound to User type
// Kinds are SIMPLE - no namespace prefix needed
export const UserError = errorSet<User>("UserError",
  "not_found",    // NOT "user:not_found"
  "suspended",    // NOT "user:suspended"
  "invalid"
);

// TYPE-VALUE IDENTITY: Export a type with the same name
// This allows UserError to be used in both type and value positions
export type UserError = typeof UserError.Type;
```

With this pattern, `UserError` works like a native `class` or `enum`:

```typescript
// In type position (function signature)
function getUser(id: string): User | UserError { ... }

// In value position (runtime guard)
if (UserError(result)) { ... }
```

No more `.Type` suffix needed in signatures.

### Creating Errors

Template holes specify which fields to extract from the entity into the error's `data`:

```typescript
const user = { id: "abc123", name: "John", email: "john@example.com", age: 25 };

// Template holes extract specific fields
const err = UserError.not_found`User ${"id"} does not exist`(user);

err.kind     // "not_found"
err.message  // "User abc123 does not exist"
err.data     // { id: "abc123" } - only the fields in template holes

// Multiple fields extracted
UserError.invalid`User ${"name"} (id: ${"id"}) has invalid age: ${"age"}`(user);
// data: { name: "John", id: "abc123", age: 25 }

// Empty template - just creates the error kind
UserError.suspended``(user);  // message: "", data: {}
```

### Error Chaining with `cause`

Wrap lower-level errors with higher-level context using the `cause` option (like ES2022 `Error.cause`):

```typescript
// Lower layer returns a specific error
function findUser(id: string): User | UserError {
  const user = db.get(id);
  if (!user) return UserError.not_found`User ${"id"} not found`({ id });
  return user;
}

// Higher layer wraps with additional context
function processOrder(userId: string, orderId: string): Order | ServiceError {
  const user = findUser(userId);

  if (UserError.not_found(user)) {
    // Wrap the original error - it becomes the cause
    return ServiceError.processing_failed`Cannot process order ${"orderId"}: user missing`({ orderId }, { cause: user });  // Original error preserved
  }

  // ... continue processing
}

// Access the error chain
const result = processOrder("user1", "order1");
if (ServiceError(result)) {
  console.log(result.kind);        // "processing_failed"
  console.log(result.message);     // "Cannot process order order1: user missing"
  console.log(result.cause?.kind); // "not_found" (original error)
  console.log(result.cause?.data); // { id: "user1" }
}
```

### Guards: Checking for Errors

Error sets provide **two levels of guards**:

#### Set-Level Guard (Callable Error Set)

Check if a value is ANY error from the set:

```typescript
function getUser(id: string): User | UserError {
  // ...
}

const result = getUser("123");

// The error set IS the guard - just call it
if (UserError(result)) {
  // result is UserError (union of all user errors)
  console.log(result.kind);  // "not_found" | "suspended" | "invalid"
  return;
}

// After the guard, TypeScript knows it's User
console.log(result.name);
```

#### Alternative: `instanceof` Syntax

Error sets also support `instanceof` via `Symbol.hasInstance`:

```typescript
const result = getUser("123");

// Both are equivalent:
if (UserError(result)) { ... }           // Callable guard
if (result instanceof UserError) { ... } // instanceof syntax

// TypeScript narrows the type in both cases
```

Use whichever style feels more natural. The callable guard is more explicit; `instanceof` may feel more familiar to developers coming from class-based error handling.

#### Tag-Level Guard

Check if a value is a SPECIFIC error tag:

```typescript
const result = getUser("123");

// Check for specific kind
if (UserError.not_found(result)) {
  // result.kind is specifically "not_found"
  console.log(result.data.id);  // Type-safe access to data
  return;
}

if (UserError.suspended(result)) {
  // result.kind is specifically "suspended"
  notifyAdmin(result.data.name);
  return;
}

// After all error checks, result is User
console.log(result.name);
```

> **How does this work?** Each kind function (e.g., `UserError.not_found`) serves dual purposes:
> - **As a tagged template literal**: `UserError.not_found`User ${"id"} not found`(...)` → creates an error
> - **As a type guard**: `UserError.not_found(result)` → checks if value is this specific error
>
> At runtime, the function detects whether it received a `TemplateStringsArray` (from a tagged template) or a regular value (for type guarding). TypeScript declaration overloading provides type safety for both usages.

#### String Coercion

Kind functions also support string coercion via `toString()` and `Symbol.toPrimitive`:

```typescript
// In template literals
console.log(`Error type: ${UserError.not_found}`);  // "Error type: not_found"

// Loose equality (==) works
if (result.kind == UserError.not_found) { ... }  // true

// But strict equality (===) requires the guard:
if (UserError.not_found(result)) { ... }  // Preferred - also narrows types
```

### Composing Error Sets with `merge`

Merge combines tags from multiple error sets into a new set:

```typescript
const UserError = errorSet<User>("UserError", "not_found", "suspended");
const DbError = errorSet<DbContext>("DbError", "timeout", "connection");

// Merge returns a NEW callable error set
const ServiceError = UserError.merge(DbError);

// ServiceError can check for ANY error from either set
if (ServiceError(result)) {
  // result.kind is "not_found" | "suspended" | "timeout" | "connection"
}
```

**Important**: Merged error sets are **untyped for data**. The data property becomes `Record<string, unknown>` because merged sets contain errors from different domains with different data shapes. Use the original sets for type-safe data access:

```typescript
const result = doOperation();

if (ServiceError(result)) {
  // result.data is Record<string, unknown> - not type-safe

  // For type-safe access, use original sets:
  if (UserError(result)) {
    console.log(result.data.name);  // Type-safe: knows User fields
  } else if (DbError(result)) {
    console.log(result.data.query); // Type-safe: knows DbContext fields
  }
}
```

---

## Handling Errors

### Primary: Native Control Flow

The recommended way to handle errors is using native JavaScript control flow. The `kind` property is a string literal union that TypeScript recognizes for narrowing:

```typescript
const result = findUser(id);

// Native narrowing via switch
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

// After the block, result is guaranteed to be User
console.log(result.name);
```

Or use tag-level guards with if-statements:

```typescript
if (UserError.not_found(result)) return { status: 404 };
if (UserError.suspended(result)) return { status: 403 };
if (UserError(result)) return result;  // Propagate unhandled

// result is User here
```

**Why native control flow?** It uses TypeScript's built-in exhaustiveness checking and narrowing without any custom patterns.

### Helper Methods

For cases where native control flow is verbose, error sets provide two helper methods:

#### `recover` - Switch as Expression

Since JavaScript's `switch` isn't an expression, `recover` provides expression-style handling. It guarantees the success type by requiring all cases (or a `_` catch-all):

```typescript
const result = getUser(id);

// Option 1: Catch-all fallback
const user = UserError.recover(result, {
  _: () => guestUser,  // Any error becomes guest user
});

// Option 2: Handle each case explicitly
const user = UserError.recover(result, {
  not_found: () => guestUser,
  suspended: () => guestUser,
  invalid: () => guestUser,
});

// user is strictly User - no error types possible
console.log(user.name);  // Always safe
```

**When to use**: When you need a guaranteed value and want expression-style handling.

#### `inspect` - Side Effects Only

Observe errors without changing the type or control flow:

```typescript
const result = getUser(id);

// Log specific errors without changing anything
UserError.inspect(result, {
  suspended: (e) => audit.log(`Blocked user: ${e.data.id}`),
  not_found: (e) => metrics.increment("user.not_found"),
});

// result type unchanged - still User | UserError
// Continue with normal flow
if (UserError(result)) return result;
```

**When to use**: Logging, metrics, auditing - any side effect that shouldn't affect control flow.

### Comparison Table

| Approach | Purpose | Return Type |
|----------|---------|-------------|
| `switch` / `if` | Primary - native control flow | You control it |
| `recover` | Expression-style, guarantee success | `T \| R` |
| `inspect` | Side effects only | `void` |

---

## Propagation

Propagation is just returning. No special syntax needed.

```typescript
function processCheckout(id: string): Receipt | UserError | DbError {
  const user = getUser(id);
  if (UserError(user)) return user;  // Propagate user errors

  const order = getOrder(user.id);
  if (DbError(order)) return order;  // Propagate db errors

  return createReceipt(user, order);
}
```

---

## Async Support

### `capture` - Wrap Throwing Code

The `capture` method wraps code that might throw and converts exceptions to error set values. It handles both sync and async code:

```typescript
// Sync capture
const result = DbError.capture(
  () => db.querySync(sql),
  (e) => DbError.query_failed`Query failed: ${"message"}`({ sql, message: e.message })
);

// Async capture - returns Promise
const result = await DbError.capture(
  async () => await db.query(sql),
  (e) => DbError.query_failed`Query failed: ${"message"}`({ sql, message: e.message })
);

// The mapper receives the caught Error
if (DbError(result)) {
  console.log(result.kind);       // "query_failed"
  console.log(result.data.sql);   // The SQL that failed
}
```

**Type behavior**:
- If `fn` returns `T`, capture returns `T | ErrorType`
- If `fn` returns `Promise<T>`, capture returns `Promise<T | ErrorType>`

---

## Handling Tag Collisions

When merging sets with the same tag name, you have two options:

### Option A: Use Distinct Tags (Recommended)

```typescript
const UserError = errorSet<User>("UserError", "user_not_found", "user_suspended");
const OrderError = errorSet<Order>("OrderError", "order_not_found", "order_cancelled");

const ServiceError = UserError.merge(OrderError);
// No ambiguity - tags are distinct
```

### Option B: Use Tag-Level Guards

```typescript
const UserError = errorSet<User>("UserError", "not_found", "suspended");
const OrderError = errorSet<Order>("OrderError", "not_found", "cancelled");

const ServiceError = UserError.merge(OrderError);

const result = doOperation();

if (ServiceError(result)) {
  // Ambiguous: result.kind could be "not_found" from either set

  // Use tag-level guards from original sets:
  if (UserError.not_found(result)) {
    // Specifically UserError's not_found
    console.log(result.data.name);
  } else if (OrderError.not_found(result)) {
    // Specifically OrderError's not_found
    console.log(result.data.orderId);
  }
}
```

---

## Error Set Granularity

### When to Use One Set with Many Tags

Use a single error set when errors share the same domain context:

```typescript
// Good: All errors relate to User domain
const UserError = errorSet<User>("UserError",
  "not_found",
  "suspended",
  "invalid_email",
  "weak_password",
  "duplicate_email"
);
```

### When to Use Multiple Sets

Use separate error sets when:

1. **Different domains** - Errors belong to different bounded contexts
2. **Different data shapes** - Errors need different context fields
3. **Different handling** - Errors are typically handled at different layers

```typescript
// Different domains with different data needs
const AuthError = errorSet<AuthContext>("AuthError", "invalid_credentials", "token_expired", "forbidden");
const ValidationError = errorSet<ValidationContext>("ValidationError", "invalid_field", "missing_required");
const DbError = errorSet<DbContext>("DbError", "connection", "timeout", "constraint_violation");
```

### Rule of Thumb

Ask: "Would I handle these errors together or separately?"

- **Together** → Same error set
- **Separately** → Different error sets

---

## Configuration

```typescript
import { configure } from "errorset";

configure({
  // Formatting
  format: "pretty" | "json" | "minimal",

  // Optional context (off by default)
  includeTimestamp: boolean,
  includeStack: boolean,  // Only enable for debugging (V8 only)
  stackDepth: number,

  // Development aids
  colors: boolean,  // ANSI colors in pretty format
});

// Environment-based configuration
configure(
  process.env.NODE_ENV === "development"
    ? { format: "pretty", colors: true, includeStack: true }
    : { format: "json", includeTimestamp: true }
);
```

### Debugger Visibility

Error values include a custom inspection method for Node.js debuggers. When you `console.log` an error, it displays cleanly:

```typescript
const err = UserError.not_found`User ${"id"} not found`({ id: "abc123" });
console.log(err);
// Output: UserError.not_found { id: "abc123" }
```

This uses `Symbol.for('nodejs.util.inspect.custom')` — no prototype pollution, just clean debugger output.

### Zero-Cost Stack Traces

When `includeStack: true`, stack traces are captured using `Error.captureStackTrace()` (V8 engines: Node.js, Chrome, Edge, Bun). This attaches a stack to the plain object without creating an `Error` instance.

```typescript
configure({ includeStack: true });

const err = UserError.not_found`User ${"id"} not found`({ id: "abc" });
console.log(err.stack);
// "    at getUser (src/users.ts:42)
//      at handleRequest (src/handler.ts:15)"
```

**Note**: In non-V8 environments (Firefox, Safari), `includeStack` is silently ignored.

### Output Formats

**Pretty (development)**:
```
UserError.not_found - User abc123 not found
  at getUser (src/users.ts:42)
```

**JSON (production)**:
```json
{"kind":"not_found","message":"User abc123 not found","data":{"id":"abc123"},"timestamp":1704395200}
```

**Minimal (performance-critical)**:
```
not_found:abc123
```

---

## Type System

### Core Error Type

```typescript
declare const ERR: unique symbol;

type Err<Kind extends string, Data extends Record<string, unknown> = Record<string, unknown>> = {
  readonly [ERR]: true;
  readonly kind: Kind;
  readonly message: string;
  readonly data: Data;
  readonly cause?: Err<string, Record<string, unknown>>;
  readonly timestamp?: number;
  readonly stack?: string;
};
```

### Error Set Type

```typescript
type ErrorSet<T extends Record<string, unknown>, Kinds extends string> = {
  // SET-LEVEL GUARD - check for any error from this set
  (value: unknown): value is Err<Kinds, Partial<T>>;

  // INSTANCEOF SUPPORT - alternative syntax via Symbol.hasInstance
  [Symbol.hasInstance](value: unknown): value is Err<Kinds, Partial<T>>;

  // KIND CONSTRUCTORS - create errors with template literals
  [Kind in Kinds]: {
    // Template literal creator
    <K extends keyof T & string>(
      strings: TemplateStringsArray,
      ...keys: K[]
    ): (
      entity: Pick<T, K>,
      options?: { cause?: Err<string> }
    ) => Err<Kind, Pick<T, K>>;

    // KIND-LEVEL GUARD - check for this specific kind
    (value: unknown): value is Err<Kind, Partial<T>>;
  };

  // HELPER METHODS
  recover<R>(
    result: unknown,
    handlers: { [Kind in Kinds]: (e: Err<Kind, Partial<T>>) => R } | { _: (e: Err<Kinds, Partial<T>>) => R }
  ): T | R;

  inspect(
    result: unknown,
    handlers: Partial<{ [Kind in Kinds]: (e: Err<Kind, Partial<T>>) => void }>
  ): void;

  // COMPOSITION
  merge<OtherKinds extends string>(
    other: ErrorSet<Record<string, unknown>, OtherKinds>
  ): ErrorSet<Record<string, unknown>, Kinds | OtherKinds>;

  // BRIDGE
  capture<R>(
    fn: () => R,
    map: (e: Error) => Err<Kinds, Partial<T>>
  ): R extends Promise<infer U> ? Promise<U | Err<Kinds, Partial<T>>> : R | Err<Kinds, Partial<T>>;

  // TYPE HELPER
  Type: Err<Kinds, Partial<T>>;
};
```

### Implementation

```typescript
const ERR = Symbol("err");

export function errorSet<T extends Record<string, unknown>>(
  name: string,  // Used for debugger output
  ...kinds: string[]
): ErrorSet<T, (typeof kinds)[number]> {

  // Create the callable set-level guard
  const isError = (value: unknown): value is Err<string, Partial<T>> => {
    return !!(
      value &&
      typeof value === "object" &&
      ERR in value &&
      (value as any)[ERR] === true &&
      kinds.includes((value as any).kind)
    );
  };

  const set = isError as ErrorSet<T, (typeof kinds)[number]>;

  // Add Symbol.hasInstance for instanceof support
  Object.defineProperty(set, Symbol.hasInstance, {
    value: (value: unknown): boolean => isError(value),
  });

  // Add Symbol.iterator for iteration support
  Object.defineProperty(set, Symbol.iterator, {
    value: function* () { yield* kinds; },
  });

  // Attach kind constructors and kind-level guards
  for (const kind of kinds) {
    const kindFn = ((
      stringsOrValue: TemplateStringsArray | unknown,
      ...keys: (keyof T)[]
    ) => {
      // If called with template literal, return creator function
      if (Array.isArray(stringsOrValue) && "raw" in stringsOrValue) {
        const strings = stringsOrValue as TemplateStringsArray;
        return (entity: Partial<T>, options?: { cause?: Err<string> }) => {
          const data: Record<string, unknown> = {};
          let message = strings[0];

          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = entity[key];
            data[key as string] = value;
            message += String(value ?? "") + (strings[i + 1] ?? "");
          }

          const err: Err<typeof kind, typeof data> = {
            [ERR]: true,
            kind,
            message,
            data,
            // Custom inspection for Node.js debuggers
            [Symbol.for('nodejs.util.inspect.custom')]() {
              return `${name}.${kind} ${JSON.stringify(data)}`;
            },
          };

          // Zero-cost stack trace (V8 only)
          if (config.includeStack && typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(err, kindFn);
          }

          if (options?.cause) (err as any).cause = options.cause;
          return err;
        };
      }

      // If called with a value, act as kind-level guard
      return !!(
        stringsOrValue &&
        typeof stringsOrValue === "object" &&
        ERR in stringsOrValue &&
        (stringsOrValue as any)[ERR] === true &&
        (stringsOrValue as any).kind === kind
      );
    }) as any;

    // String coercion support
    kindFn.toString = () => kind;
    kindFn[Symbol.toPrimitive] = () => kind;

    (set as any)[kind] = kindFn;
  }

  // recover - force success value (requires all handlers or _ catch-all)
  set.recover = (result, handlers) => {
    if (!isError(result)) return result as T;
    const handler = handlers[result.kind as keyof typeof handlers] ?? (handlers as any)._;
    if (handler) return handler(result as any);
    throw new Error(`Unhandled error in recover: ${result.kind}`);
  };

  // inspect - side effects only
  set.inspect = (result, handlers) => {
    if (!isError(result)) return;
    const handler = handlers[result.kind as keyof typeof handlers];
    if (handler) handler(result as any);
  };

  // merge - combine sets (loses type binding)
  set.merge = (other) => {
    const otherKinds = Object.keys(other).filter(
      (k) => typeof (other as any)[k] === "function" && k !== "recover" && k !== "inspect" && k !== "merge" && k !== "capture"
    );
    return errorSet<Record<string, unknown>>("MergedError", ...kinds, ...otherKinds) as any;
  };

  // capture - wrap throwing code
  set.capture = (fn, map) => {
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.catch((e) => map(e instanceof Error ? e : new Error(String(e)))) as any;
      }
      return result;
    } catch (e) {
      return map(e instanceof Error ? e : new Error(String(e)));
    }
  };

  return set;
}

// Helper to check if any value is an error from any set
export function isErr(value: unknown): value is Err<string, Record<string, unknown>> {
  return !!(
    value &&
    typeof value === "object" &&
    ERR in value &&
    (value as any)[ERR] === true
  );
}
```

---

## Complete Example

```typescript
// ═══════════════════════════════════════════════════════════
// types.ts - Domain types
// ═══════════════════════════════════════════════════════════
type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
};

type Order = {
  orderId: string;
  userId: string;
  total: number;
  status: "pending" | "paid" | "shipped";
};

type DbContext = {
  query: string;
  message: string;
};

// ═══════════════════════════════════════════════════════════
// errors.ts - Error sets
// ═══════════════════════════════════════════════════════════
import { errorSet, configure } from "errorset";

configure({
  format: process.env.NODE_ENV === "development" ? "pretty" : "json",
  includeStack: process.env.NODE_ENV === "development",
});

export const UserError = errorSet<User>("UserError",
  "not_found",
  "invalid",
  "suspended",
  "unauthorized"
);
export type UserError = typeof UserError.Type;

export const OrderError = errorSet<Order>("OrderError",
  "not_found",
  "payment_failed",
  "already_shipped"
);
export type OrderError = typeof OrderError.Type;

export const DbError = errorSet<DbContext>("DbError",
  "connection",
  "timeout",
  "query_failed"
);
export type DbError = typeof DbError.Type;

// ═══════════════════════════════════════════════════════════
// repository.ts - Data layer
// ═══════════════════════════════════════════════════════════
function findUser(id: string): User | UserError | DbError {
  // Wrap throwing database call
  const user = DbError.capture(
    () => db.findById<User>(id),  // Returns User | null, throws on DB error
    (e) => DbError.query_failed`Query failed: ${"message"}`({ query: "findById", message: e.message })
  );

  // If capture caught an error, propagate it
  if (DbError(user)) return user;

  // Normal business logic - library doesn't touch this
  if (user === null) {
    return UserError.not_found`User ${"id"} does not exist`({ id });
  }

  if (user.suspended) {
    return UserError.suspended`User ${"name"} (id: ${"id"}) is suspended`(user);
  }

  // Happy path - just return the user
  return user;
}

function findOrder(orderId: string): Order | OrderError | DbError {
  const order = DbError.capture(
    () => db.findById<Order>(orderId),
    (e) => DbError.query_failed`Query failed: ${"message"}`({ query: "findById", message: e.message })
  );

  if (DbError(order)) return order;

  if (order === null) {
    return OrderError.not_found`Order ${"orderId"} does not exist`({ orderId });
  }

  return order;
}

// ═══════════════════════════════════════════════════════════
// service.ts - Business logic
// ═══════════════════════════════════════════════════════════

// Merge errors at the service boundary
const ServiceError = UserError.merge(OrderError).merge(DbError);
type ServiceError = typeof ServiceError.Type;

function shipOrder(userId: string, orderId: string): Order | ServiceError {
  const user = findUser(userId);
  if (ServiceError(user)) return user;  // Propagate any service error

  if (user.role !== "admin") {
    return UserError.unauthorized`User ${"name"} cannot ship orders`(user);
  }

  const order = findOrder(orderId);
  if (ServiceError(order)) return order;

  if (order.status === "shipped") {
    return OrderError.already_shipped`Order ${"orderId"} already shipped`(order);
  }

  return { ...order, status: "shipped" };
}

// ═══════════════════════════════════════════════════════════
// handler.ts - HTTP layer
// ═══════════════════════════════════════════════════════════
function handleShipOrder(req: Request): Response {
  const { userId, orderId } = req.body;
  const result = shipOrder(userId, orderId);

  // Side effects - logging/metrics (use original sets for specific handling)
  UserError.inspect(result, {
    suspended: (e) => audit.log(`Blocked: ${e.data.name}`),
    unauthorized: (e) => audit.log(`Unauthorized: ${e.data.name}`),
  });

  DbError.inspect(result, {
    timeout: () => metrics.increment("db.timeout"),
    connection: () => metrics.increment("db.connection_error"),
  });

  // Check using merged type, handle with native switch
  if (ServiceError(result)) {
    switch (result.kind) {
      case "not_found":
        return { status: 404, body: result.message };
      case "suspended":
      case "unauthorized":
        return { status: 403, body: result.message };
      case "invalid":
        return { status: 400, body: result.message };
      case "payment_failed":
        return { status: 402, body: "Payment required" };
      case "already_shipped":
        return { status: 409, body: "Already shipped" };
      case "connection":
      case "timeout":
      case "query_failed":
        return { status: 500, body: "Database error" };
    }
  }

  return { status: 200, body: result };
}

// Alternative: Use recover for expression-style handling
function handleShipOrderRecover(req: Request): Response {
  const { userId, orderId } = req.body;
  const result = shipOrder(userId, orderId);

  // If it's an error, recover handles it; otherwise return success
  if (ServiceError(result)) {
    return ServiceError.recover(result, {
      _: (e) => ({ status: 500, body: e.message }),
    });
  }
  return { status: 200, body: result };
}
```

---

## Adoption & Ecosystem

Most libraries throw errors. We provide bridges to convert them.

### `capture` - Wrap Any Throwing Code

```typescript
const DbError = errorSet<{ sql: string; message: string }>("DbError", "query", "connection");

// Sync
const result = DbError.capture(
  () => db.querySync(sql),
  (e) => DbError.query`Query failed: ${"message"}`({ sql, message: e.message })
);

// Async
const result = await DbError.capture(
  async () => await db.query(sql),
  (e) => DbError.query`Query failed: ${"message"}`({ sql, message: e.message })
);
```

### `defineAdapter` - Reusable Library Adapters

For creating shareable adapter packages:

```typescript
// better-sqlite3-errorset/index.ts
import { defineAdapter, errorSet } from "errorset";

type SqliteContext = {
  sql?: string;
  code?: string;
  message: string;
};

export const SqliteError = errorSet<SqliteContext>("SqliteError",
  "constraint",
  "syntax",
  "busy",
  "readonly",
  "corrupt",
  "unknown"
);
export type SqliteError = typeof SqliteError.Type;

export const sqlite = defineAdapter({
  errorSet: SqliteError,

  classify: (error: Error) => {
    const code = (error as any).code;
    if (code === "SQLITE_CONSTRAINT") return "constraint";
    if (code === "SQLITE_BUSY") return "busy";
    if (code === "SQLITE_READONLY") return "readonly";
    return "unknown";
  },

  extract: (error: Error, args: unknown[]) => ({
    message: error.message,
    code: (error as any).code,
    sql: typeof args[0] === "string" ? args[0] : undefined,
  }),
});
```

**Usage:**

```typescript
import { sqlite, SqliteError } from "better-sqlite3-errorset";

const result = sqlite.run(() => db.prepare(sql).all());

if (SqliteError(result)) {
  console.log(result.kind);      // "constraint" | "busy" | etc.
  console.log(result.data.sql);  // Type-safe
}
```

### For Library Authors

Libraries can export both APIs:

```typescript
// Traditional throwing API (backwards compatible)
export function query(sql: string): Result {
  // throws on error
}

// Error-set API
export function queryS(sql: string): Result | SqliteError {
  return SqliteError.capture(() => query(sql), mapError);
}

// Export error set for consumers
export { SqliteError } from "./errors";
```

---

## API Summary

```typescript
import { errorSet, configure, isErr } from "errorset";
```

| API | Usage | Purpose |
|-----|-------|---------|
| `errorSet<T>(name, ...kinds)` | `errorSet<User>("UserError", "not_found")` | Define error set |
| `type X = typeof X.Type` | `export type UserError = typeof UserError.Type` | Type-Value Identity |
| `Set.kind\`msg\`(data)` | `UserError.not_found\`...\`(user)` | Create error |
| `Set.kind\`msg\`(data, opts)` | `UserError.not_found\`...\`(user, { cause })` | Create with cause |
| `Set(value)` | `if (UserError(result))` | Set-level guard |
| `result instanceof Set` | `if (result instanceof UserError)` | Alternative guard |
| `Set.kind(value)` | `if (UserError.not_found(result))` | Kind-level guard |
| `${Set.kind}` | `` `Error: ${UserError.not_found}` `` | String coercion |
| `switch (err.kind)` | `case "not_found": ...` | Native handling |
| `Set.recover(val, handlers)` | `UserError.recover(result, { _: ... })` | Expression-style handling |
| `Set.inspect(val, handlers)` | `UserError.inspect(result, {...})` | Side effects only |
| `Set.merge(other)` | `UserError.merge(DbError)` | Combine sets |
| `Set.capture(fn, map)` | `DbError.capture(() => ..., map)` | Wrap throwing code |
| `[...Set]` | `[...UserError]` | Iterate kinds |
| `isErr(value)` | `if (isErr(value))` | Check any error |

---

## Design Principles

1. **Expected failures as values** - Error sets are for domain failures, not bugs
2. **Domain binding** - Errors know their entity type
3. **Type-safe templates** - Invalid field names don't compile
4. **Automatic context** - No manual data extraction
5. **Native control flow first** - Use `switch`/`if` for handling; helpers are secondary
6. **Composable** - Merge sets at boundaries
7. **Minimal API** - Guards, `recover`, `inspect`, `merge`, `capture` - nothing more

---

## Inspiration

- **Zig**: Error sets as first-class language feature
- **TypeScript**: Template literal types, mapped types, conditional types
- **Domain-Driven Design**: Errors belong to bounded contexts
- **Go**: Errors as values, explicit handling
