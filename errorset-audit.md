# errorset Audit — v0.3.0

| | |
|---|---|
| **Repository** | `/Users/takinprofit/Dev/errorset` (`g5becks/errorset`, branch `main`, clean) |
| **Package** | `@takinprofit/errorset@0.3.0` (published 2026-01-17; no commits since; no git tags) |
| **Audit date** | 2026-11-08 |
| **Runtimes used** | Bun 1.4.4 and 1.3.6; Node 26.13.0 (built `dist/` smoke test) |
| **Toolchains used** | TypeScript 5.9.3, 6.0.3, 7.0.2; repo-pinned `@typescript/native-preview` 7.0.0-dev.20260105.1 |
| **Primary consumer** | `agentx` (`core/src/errors.ts` defines ~35 error sets; 68+ files create errors and 570+ guard calls) |

---

## 0. Executive Summary

errorset is small (≈1,100 lines in `src/types.ts`, 87 in `src/config.ts`), readable and well documented, and its test suite is fast with 99.9% line coverage. The *type-level* design (template-hole keys constrained to `keyof T`, compile-time duplicate-kind detection) works across TS 5.9, 6.0 and 7.0 for consumers.

Its central promise is that **"a set's guard identifies errors from that set."** That promise doesn't hold:

1. **Errors don't record which set they belong to.** Set and kind guards match on the `kind` string only. Repro: `OrderError(positionError)` → `true`, and `OrderError.invalid_symbol(positionError)` → `true`. **In agentx, 20 kind names are shared across its error sets.** For example, `not_found` is in 6 sets, and `invalid_symbol` and `exchange_unavailable` are each in the 4 trading sets. Any `if (XError(result))` check can match another set's error.
2. **The brand is `Symbol("err")`, not a registry symbol.** Two copies of errorset don't recognize each other's errors. agentx plugins bundle their own copy, so the host's guards return `false` for plugin errors, as confirmed in the Phase 1 report.

Other confirmed problems:
- The no-context "callable error" form is a **function**. It vanishes from JSON and makes `structuredClone` throw.
- `recover()` with missing handlers **type-checks, then throws** at runtime.
- **Three documented config options do nothing** (`format`, `colors`, `includeTimestamp`).
- Captured exceptions **lose the original error**.
- Errors are **mutable** despite `readonly` types.
- Certain kind names (`kinds`, `Type`, `recover`, `merge`, `captureAsync`…) **compile, then throw a cryptic `TypeError`** at `init()`.

**Toolchain:** the repo's own `typecheck` fails on a fresh clone, because the type tests import `../dist`. The declaration build depends on an **unpinned `bunx tsc`**. It **breaks on TypeScript 7** (TS5011: declarations land in `dist/src/`); the fix is two tsconfig lines, after which TS 7's output is byte-identical to TS 5.9's. The peer dependency `typescript: ^5` is wrong for TS 6/7 consumers, including agentx. CommonJS `require()` fails on both Node and Bun. There is no CI.

**Recommended next release: `0.4.0`.** It's a correctness release with deliberate, documented breaking changes: set identity on errors, a registry brand, exhaustive `recover`, and dropping or implementing the no-op config. It's preceded by a non-breaking `0.3.1` with toolchain, packaging and TS 7 fixes. See §5.

### Baseline health (measured)

| Check | Result |
|---|---|
| `bun test` (Bun 1.4.4) | ✅ 129 pass / 0 fail, 226 `expect()`s, 6 files, 35 ms |
| `bun test` (Bun 1.3.6) | ✅ 129 pass / 0 fail |
| Coverage (`bunfig.toml` thresholds 99/96/99/99) | 99.89% lines, 100% functions; only `types.ts:531` uncovered |
| `bun run typecheck` (repo-pinned tsgo preview) | ❌ **13 errors on a fresh clone** (no `dist/`); ✅ 0 after `bun run build` |
| `tsc --noEmit` TS 5.9.3 | ✅ 0 errors (after build) |
| `tsc --noEmit` TS 6.0.3 / **7.0.2** | ❌ **12 errors** each, all from the `types: []` default; same set for both |
| `build:types` with TS 7.0.2 | ❌ TS5011; declarations emitted to `dist/src/*.d.ts`, which **breaks `types`** |
| `ultracite check --type-aware` | ✅ clean |
| `bun run build` | ✅ `dist/index.js` 8.7 KB (3 modules) + 3 `.d.ts` |
| `tsd` | ✅ pass (but it uses its bundled TS 5.9) |
| Published types in a consumer (TS 5.9 / 6.0 / 7.0; `bundler` and `nodenext`; `skipLibCheck: false`) | ✅ 0 errors; `@ts-expect-error` checks for bad template keys and duplicate kinds hold |
| CommonJS `require("@takinprofit/errorset")` (Node 26, Bun 1.4.4) | ❌ `ERR_PACKAGE_PATH_NOT_EXPORTED` / "Cannot find module" |
| CI | ❌ none (`.github/` has only `copilot-instructions.md`) |

### Evidence & severity legend
**[Repro]** confirmed by running a script against `src/` (Appendix A) · **[Type]** confirmed by a type-level probe · **[Code]** confirmed by reading the source (location given) · **[Measured]** a number from a command or benchmark.
**Critical** wrong control flow or data loss in normal use · **High** documented behavior broken or a likely production bug · **Medium** an edge case or a significant DX defect · **Low** polish.

---

## 1. Dependencies & APIs

errorset has **zero runtime dependencies**, which is good and should stay that way. All findings here concern the dev toolchain and packaging.

### D1 — `typescript: ^5` peer dependency is wrong · **High** · [Code][Measured]
The library doesn't use TypeScript at runtime. It ships `.d.ts` files that consumers' compilers read. Its own consumer test passes on TS 5.9, 6.0 and 7.0. The peer range `^5` produces peer warnings or resolution conflicts for TS 6/7 projects; agentx is on `~6.0.3` and moving to 7. `bun outdated` lists `typescript (peer) 5.9.3 → 7.0.2`.
**Fix:** remove the peer dependency, or widen it to `>=5.4` (the lowest version CI verifies) and mark it optional via `peerDependenciesMeta`. Add TypeScript as a pinned **devDependency** (see D2).

### D2 — The declaration build uses an unpinned `bunx tsc` and breaks on TS 7 · **High** · [Measured]
- `build:types` is `bunx tsc -p tsconfig.build.json`, but `typescript` is **not a devDependency**. `bunx` resolved a cached **5.9.3** here. On another machine, or once the cache resolves `latest`, it gets **7.0.2**.
- On TS 7.0.2 the build fails with **TS5011** ("The 'rootDir' setting must be explicitly set"), and the declarations are emitted to **`dist/src/*.d.ts`**. `package.json` points `types` at `./dist/index.d.ts`, so a successful publish would ship **no resolvable types**. The `&&` chain currently stops the publish, but only by accident.
- With `"rootDir": "./src"` and `"types": ["bun"]` added, TS 7 emits **0 errors and byte-identical declarations** to TS 5.9.

**Fix:** add `typescript@~7.0.2` as a devDependency. Use `tsc` (not `bunx tsc`) in scripts. Add `"rootDir": "./src"` to `tsconfig.build.json` and `"types": ["bun"]` to `tsconfig.json`.

### D3 — `typecheck` uses a stale pre-release compiler and fails on a fresh clone · **Medium** · [Measured]
- `typecheck` runs `bunx tsgo` from `@typescript/native-preview@^7.0.0-dev.20260105.1`, a January dev build. TS 7.0 went GA on 2026-07-08 and ships `tsc` in the regular `typescript` package. The `native-preview` package only publishes `-dev` builds.
- `test-d/index.test-d.ts` imports from `"../dist/index.js"`. Without a prior `build`, typecheck reports **13 errors**: a missing module, plus cascading `unknown` and unused-`@ts-expect-error` errors. With `dist/` present it reports 0. The result therefore depends on build state.
- Under TS 6/7 there are 12 errors, because `types` defaults to `[]`. They are `Error.captureStackTrace`/`stackTraceLimit` (×5), `console` (×1) and `bun:test` (×6).

**Fix:** drop `@typescript/native-preview` and use `tsc` from `typescript@7`. Set `"types": ["bun"]`. Point type tests at `src/` (or a path alias), so typecheck doesn't depend on a build. Run them in a dedicated `test:types` step (see Q4).

### D4 — Packaging: no CommonJS entry, an EOL engine floor, no `./package.json` export · **Medium** · [Repro][Code]
- `exports["."]` defines only an `import` condition. `require()` fails in **Node 26** (`ERR_PACKAGE_PATH_NOT_EXPORTED`) and **Bun 1.4.4**. Node ≥ 22 supports `require(esm)` when a `default` condition exists, so adding `"default"` makes the ESM build requirable with no dual build.
- `engines.node: ">=18"`: Node 18 reached end of life in April 2025. Use the lowest version CI actually tests (e.g. `>=20`) and add `"bun": ">=1.3"`.
- Add `"./package.json": "./package.json"` to `exports`.
- Ship source maps or not, but decide. Today the JS has none; declaration maps are off.
- There are no git tags for 0.1.0, 0.2.1 or 0.3.0. Tag them, and publish with npm provenance.

### D5 — Dev dependency drift · **Low** · [Measured]

| Package | Current | Latest | Note |
|---|---|---|---|
| `@biomejs/biome` | 2.3.11 | 2.6.6 | |
| `ultracite` | 7.0.8 | **8.1.1** | Major. Re-run `ultracite fix` after the upgrade and review rule changes. |
| `@types/bun` | `latest` (1.3.5 locked) | 1.4.4 | Pin it; `latest` is unreproducible. |
| `@typescript/native-preview` | 7.0.0-dev.20260105.1 | — | Remove (D3). |
| `lefthook` | 2.0.13 | 2.2.2 | |
| `tsd` | 0.33.0 | 0.33.0 | Bundles TS 5.9.3; replace (Q4). |

### D6 — Modern-syntax and platform opportunities · **Low** · [Code]
- `tsconfig.json` has template leftovers: `"jsx": "react-jsx"` and `"allowJs": true`. The repo has no JSX or JS sources; remove them.
- `captureStack` mutates the global `Error.stackTraceLimit` around each capture. That's correct, but not re-entrant if a capture triggers user code. Consider `Error.captureStackTrace` plus slicing the stack, or the TC39 `Error.stack` accessors when available.
- On `ErrorOptions.cause`, align with the ES2022 `cause` semantics that `Error` already uses (see A6).
- Errors can be frozen with `Object.freeze` at negligible cost to match the `readonly` types (A8). Measure it with the P1 benchmark.

---

## 2. API & DX Design

### 2.1 Identity & guards

#### A1 — Guards don't check set identity, so errors from different sets match each other · **Critical** · [Repro][Code]
An error object carries `kind`, `message`, `data`, the `ERR` brand and an inspect hook. It records **nothing about its set** (`types.ts:412-423`). `createSetGuard` checks `kinds.includes(kind)` (`types.ts:534`), and kind guards check `value.kind === kind` (`types.ts:451`). The set's `name` is used only in the debugger string.

Repro, with two sets sharing `invalid_symbol`:
- `OrderError(PositionError.invalid_symbol…)` → **`true`**.
- `OrderError.invalid_symbol(positionError)` → **`true`**.
- Object keys of the error: `kind, message, data, Symbol(err), Symbol(inspect)`. There is no set name.

> **agentx impact (measured from `core/src/errors.ts`):** of 158 distinct kinds across 31 parsed sets, **20 kind names are shared**: `validation_failed` (6 sets), `not_found` (6), `timeout` (5), `send_failed` (5), `cancelled` (5), `invalid_symbol` (4), `rate_limited` (4), `exchange_unavailable` (4), `parse_failed` (4), and 11 more. In code like `if (PositionError(result))` over a union that also contains `OrderError`, the wrong branch can run. TypeScript narrows *as if* the check were precise, so the compiler won't flag it.

**Fix:** add a set identity to every error. Recommended: a readonly, enumerable `set: "<name>"` field, so it survives JSON and logs. Make set and kind guards check `set === name && kind === …`.
- Decide the policy for duplicate set names. Warn through a module-level registry, or let `init({ id })` disambiguate.
- Expose `Err<Kind, Data, Set extends string>` in the types, so narrowing is set-precise.
- `merge()` must then combine `(set, kind)` pairs, not bare kinds (see A9).

This changes behavior, so it's breaking: list it first in the 0.4.0 changelog.

#### A2 — The brand symbol is per-module-instance, so guards fail across copies and bundles · **Critical** · [Repro (Phase 1)][Code]
`export const ERR = Symbol("err")` (`types.ts:13`). Every evaluation of the module creates a distinct symbol. Phase 1 reproduced this: an error created by one bundled copy fails **both** set and kind guards of another copy.

> **agentx impact:** plugins are built with `bun build` and no `--external`, so they bundle their own `@agentx/core` and errorset. `OrderError(result)` in `server/src/work/handlers/trading.ts:371` and `InitializationError(exchange)` in `infra/src/plugin-manager/manager.ts:493` return `false` for plugin-created errors. The same failure occurs whenever two versions of errorset are installed side by side.

**Fix:** `Symbol.for("@takinprofit/errorset/err")`, which is global and cross-realm-safe within a process, plus a numeric `protocol` version in the brand value so future shape changes can be detected. Keep `ERR` exported as that registry symbol. Document that brand checks work across copies, while `instanceof`-style identity does not. Add a test that loads two separately bundled copies (Appendix A, `xbundle`).

#### A3 — Reserved kind names compile, then throw at `init()` · **Medium** · [Repro][Type]
`errorSet("S", ["recover"]).init()` throws `TypeError: Attempting to change enumerable attribute of unconfigurable property`. The same happens for `kinds`, `Type`, `merge` and `captureAsync`, and by construction `inspect` and `capture`. The kind function is defined non-configurable first, and the later `defineProperty` for the method then fails. `name`, `length`, `toString`, `call`, `bind`, `constructor` and `__proto__` "work" but shadow function/object built-ins, which is surprising for tooling. The types accept every one of them.
**Fix:** add a `ReservedKinds` union and a `NoReserved<Kinds>` constraint next to `NoDuplicates`, for a compile-time error. Throw a clear runtime error naming the reserved word. Consider namespacing the helpers (e.g. `UserError.$recover`) to shrink the reserved set. That is breaking, so weigh it.

### 2.2 Error object shape & interoperability

#### A4 — The no-context "callable error" is a function: it vanishes from JSON and breaks `structuredClone` · **High** · [Repro][Code]
`X.kind\`static message\`` returns a function with error properties attached (`types.ts:330-389`). Repro:
- `typeof` → `"function"`.
- `JSON.stringify(err)` → `undefined`, and `JSON.stringify({ error: err })` → `{}`. **The error disappears from logs and HTTP responses.**
- `structuredClone(err)` → `DataCloneError`, so it can't cross workers, `postMessage` or IPC.

agentx's own conventions note use of this form (e.g. `BackupError.config_invalid\`…\``).
**Fix, two options:**
- **(a) Non-breaking (verified):** define a non-enumerable `toJSON()` on both error shapes returning `{ set, kind, message, data, cause }`. `JSON.stringify` calls `toJSON` on functions too, giving `{"kind":"boom",…}`. `structuredClone` still throws.
- **(b) Breaking (cleaner):** make the no-context form return a plain error object, and provide `.with({ cause })` or `X.kind\`msg\`({ cause })` via a separate creator.

Do (a) in 0.3.1 and decide (b) for 0.4.0.

#### A5 — Errors don't survive serialization, and there's no way to rehydrate them · **Medium** · [Repro]
Because the brand is a symbol key, `isErr(JSON.parse(JSON.stringify(err)))` → `false` and `isErr(structuredClone(err))` → `false`. Errors that cross a process, worker or HTTP boundary become plain objects that no guard recognizes.
**Fix:** with A1's string `set` field, add `XError.from(value: unknown): XError | undefined`, which validates `{ set, kind, message, data }` and re-brands. Add `toJSON` (A4a).

#### A6 — `cause` only accepts errorset errors, so captured exceptions lose the original error · **High** · [Repro][Type]
- `ErrorOptions.cause` is typed `Err<…>` (`types.ts:96-99`). Passing a native `Error` is a type error (TS2739), although it works at runtime.
- `capture`/`captureAsync` (`types.ts:807-859`) give the mapper an `Error`, but **never attach it** to the result. Repro: `{ hasCause: false }`. The stack, `code`, `errno` and nested `cause` of the real failure are discarded.
- Non-`Error` throws are converted with `new Error(String(x))`, so a thrown `{ code: 42 }` becomes the message `"[object Object]"`.

> **agentx impact:** `infra/src/stores/error-mapping.ts` converts StrataDB exceptions through `captureAsync`. Any `SQLiteError` code, `errno` or stack is reduced to a `message` string in `data`.

**Fix:** type `cause` as `unknown` (matching ES2022 `Error.cause`). Have `capture`/`captureAsync` attach the caught value as `cause` by default, and let the mapper override it. Preserve non-`Error` throws as `cause`, with a better message (`JSON` or `inspect`, not `String`).

#### A7 — `Err` isn't an `Error`: no `name`, `String(err)` is `[object Object]`, and it doesn't interoperate with `Error`-typed APIs · **Medium** · [Repro][Type]
Repro: `instanceof Error` → `false`, `name` → `undefined`, `String(err)` → `"[object Object]"`. Assigning `Err` to `Error` fails (TS2741, missing `name`). Treating errors as data is a deliberate design choice (README "Errors Are Just Data"), but loggers, APMs and error reporters key off `name`/`message`/`stack`.
**Fix, without becoming a class:**
- Add enumerable `name: "<SetName>"`. With A1 this can be the same field as `set`, or `name = "OrderError.invalid_symbol"`.
- Add a non-enumerable `toString()` returning `"<Set>.<kind>: <message>"`.
- Document an adapter, `toError(err): Error`, for APIs that need a real `Error` (it sets `cause: err`).

#### A8 — Errors are mutable despite `readonly` types · **Low** · [Repro]
`err.message = "changed"` and `err.data.id = "changed"` both succeed, and `Object.isFrozen(err)` is `false`. Errors are values that pass through many layers, and mutation is a source of action-at-a-distance bugs.
**Fix:** `Object.freeze(err)` and `Object.freeze(data)` (shallow). Check the P1 benchmark; freezing is typically a few ns.

#### A9 — `merge()` is limited: two sets only, duplicate kinds, and no kind functions · **Low** · [Repro][Code]
`merge(OrderError, PositionError).kinds` → `["invalid_symbol","order_rejected","invalid_symbol","fetch_failed"]`, with a duplicate. The merged guard has no kind functions, `recover` or `inspect`, and its data type becomes `Record<string, unknown>`.
**Fix:** a variadic `merge(...sets)`; de-duplicate by `(set, kind)` after A1; keep per-set data typing as a discriminated union over `set`; give the merged guard `recover`/`inspect`.

### 2.3 Handling helpers & configuration

#### A10 — `recover()` isn't exhaustive at compile time but throws at runtime · **High** · [Type][Repro]
`RecoverHandlers` makes every handler optional (`types.ts:562-571`). `UE.recover(r, { not_found: … })` (missing `suspended`, no `_`) and even `UE.recover(r, {})` **type-check**. At runtime, `recover` throws a generic `Error("No handler found…")` (`types.ts:626`). That is a thrown exception from the library whose purpose is to eliminate them, and the README calls it "guaranteed recovery".
**Fix:** two overloads. **(1)** All kinds required when no `_` is given; **(2)** a partial map plus a required `_`. Then the runtime throw is unreachable for typed callers; keep it only as a defensive branch.

#### A11 — Three documented configuration options do nothing · **High** · [Repro][Code]
`Config.format` (`"pretty" | "json" | "minimal"`), `colors` and `includeTimestamp` are referenced **nowhere** in `src/` outside their declaration. Repro: `configure({ includeTimestamp: true, format: "json", colors: false })` produced no `timestamp` and the same inspect output. `Err.timestamp?` exists in the type but is never set. The README ("Configuration" section) and `LLMS.txt` document all three as working.
**Fix:** implement `includeTimestamp` (cheap: `Date.now()` at creation). **Remove** `format` and `colors`: formatting belongs to the consumer's logger, consistent with "errors are data". Deprecate them in 0.3.1 with a JSDoc `@deprecated`, and remove them in 0.4.0.

#### A12 — Global mutable configuration · **Low** · [Code]
`configure()` mutates module-level state (`config.ts:44`) shared by **every** error set in the process, including sets defined by third-party libraries that use errorset. Per-set config exists (`init(config)`), but the global one leaks across library boundaries, and A2's multiple copies each have their own.
**Fix:** document the global as application-only. Keep library authors on per-set config. Consider making `configure` return a disposer for tests.

### 2.4 Type-system ergonomics

#### A13 — `interface` entity types are rejected · **Medium** · [Type]
`init<T extends Record<string, unknown>>()` rejects interfaces (TS2344: `'UserI' does not satisfy the constraint 'Record<string, unknown>'`), because interfaces lack an implicit index signature. This is a common TypeScript surprise. agentx enforces `type` aliases through lint, so it isn't affected, but external users will be.
**Fix:** constrain with `T extends object` (or `{ [K in keyof T]: unknown }`) and keep `keyof T & string` for the template keys.

#### A14 — Kind guards narrow `data` to `Partial<T>` · **Low (by design)** · [Type]
After `if (UE.not_found(r))`, `r.data.id` is `string | undefined`. The guard can't know which template keys were used, so this is sound. It does push consumers toward non-null assertions, which agentx's `oxlint-plugin-errorset/no-unguarded-data-access` rule exists to police.
**Option:** allow a kind to declare its data keys at definition time, e.g. `errorSet("UserError", { not_found: ["id"], suspended: ["id", "reason"] })`. Guards could then narrow `data` exactly. This is an additive API; keep the array form.

#### A15 — Message interpolation is lossy · **Low** · [Repro]
`String(value ?? "")` (`types.ts:407`). Objects render as `[object Object]`, and `null`/`undefined` render as an empty string. Repro: `"meta=[object Object] n="`.
**Fix:** render objects with `JSON.stringify` (with a cycle guard), and render `null`/`undefined` literally, or make the formatter configurable per set.

---

## 3. Quality & Testing

### Q1 — Current state
129 tests in 6 files; 99.89% lines. The suite passes on Bun 1.3.6 and 1.4.4 and runs in 35 ms. Type tests use `tsd` (`test-d/index.test-d.ts`, 361 lines). `tests/playground.test.ts` is a scratch file for the callable-error feature and should be folded into `error-set.test.ts`.

### Q2 — No CI; hooks don't run tests or typecheck · **High**
There is no workflow, and `lefthook.yml` has only a pre-commit `ultracite fix`. `prepublishOnly` (build → test → test:types → typecheck) is the only gate, and it runs only on the publisher's machine with that machine's unpinned `bunx` toolchain.
**Fix:** a `ci.yml` with frozen install → lint → typecheck (TS 7.0 primary; 6.0 and 5.9 for consumer compatibility) → `bun test --coverage` (keep the thresholds) → build → declaration check → pack smoke test (Q5), on Bun {1.3.x, latest} plus a Node LTS smoke run of `dist/`. Add pre-push `typecheck` + `test`.

### Q3 — High coverage, missing behavioral classes · **High**
99.9% coverage didn't catch A1–A11, because they need cross-set, cross-copy and serialization scenarios that no line-coverage metric can see. Add these suites; each Appendix A repro converts directly into a test.

| Suite | Covers |
|---|---|
| `identity.test.ts` | A1: sets sharing kind names never match each other (set and kind guards, `instanceof`, `merge`) |
| `cross-copy.test.ts` | A2: two separately built copies (`bun build` ×2) recognize each other's errors |
| `serialization.test.ts` | A4, A5: JSON and `structuredClone` round-trips for both error shapes; `from()` rehydration |
| `reserved-kinds.test.ts` + type test | A3: every reserved name is rejected with a clear error at compile and run time |
| `capture.test.ts` | A6: the original error is preserved as `cause` (Error, non-Error, rejected promise, sync throw inside an async fn) |
| `config.test.ts` (extend) | A11: `includeTimestamp` sets `timestamp`; removed options are gone |
| `recover.types.ts` | A10: a non-exhaustive `recover` without `_` fails to compile |
| `immutability.test.ts` | A8: writes throw in strict mode |

### Q4 — The type-test setup is fragile · **Medium**
- `test-d` imports `../dist/index.js`, which couples typecheck to build state (D3).
- `tsd` runs on its bundled TypeScript 5.9.3, so the type tests never exercise TS 6 or 7.
- The `tsd` config sets `esModuleInterop`, which is irrelevant here.

**Fix:** move the type tests to `expect-type` (or keep `@ts-expect-error` assertions) in `tests/types/*.test-d.ts`, importing `src/`. Check them with the project's own `tsc` on each CI TS version. Remove `tsd`. Also keep one *published-shape* check: the pack smoke test (Q5) typechecking against `dist/`.

### Q5 — No consumer smoke test · **Medium**
During this audit, a manual consumer check (unpacked npm tarball; TS 5.9, 6.0 and 7.0; `bundler` and `nodenext`; `skipLibCheck: false`) passed, and the CJS `require` check failed (D4). Automate both: `bun pm pack` → install into a fixture → typecheck on each TS version → run ESM import and CJS require on Node LTS and Bun.

### Q6 — Edge cases worth pinning with tests · **Low**
- Template keys repeated (`${"id"} … ${"id"}`).
- A template with keys called with a missing key at runtime (from JavaScript).
- Kind guards called with an array that has a `raw` property (the template detection heuristic at `types.ts:320-324`).
- Very large kind tuples, near the `HasDuplicates` recursion limit; measure where the type-check slows.
- `includeStack: true` on Bun (works here: a non-enumerable `stack`) vs. engines without `Error.captureStackTrace` (guarded; should be a no-op).

---

## 4. Performance & Chores

### 4.1 Performance (measured, Bun 1.4.4, 1M iterations)

| Operation | ns/op | Note |
|---|---|---|
| Create with 2 template keys, ``Small.a`…${"id"}…${"symbol"}`(ctx)`` | **116.7** | |
| Tagged template only (creator not yet called) | 10.4 | |
| Create callable no-context error | **120.8** | A new function plus 5 `defineProperty` calls per error |
| Baseline: plain object literal | 19.2 | |
| Baseline: `new Error(msg)` | 90.0 | |
| Set guard, 2-kind set | 5.9 | |
| Set guard, **40-kind set**, last kind | **42.1** | `Array.includes`, linear |
| Set guard on a non-error object | 5.0 | |
| Create with `includeStack: true` | 520.0 | Expected; off by default |

#### P1 — Per-error allocation overhead · **Medium** · [Measured][Code]
Each error allocates a fresh `[INSPECT]` closure (`types.ts:420-422`, `342-344`). The callable form allocates a function and runs 5 `defineProperty` calls. Every creation calls `captureStack`, which merges `{...globalConfig, ...instanceConfig}` before checking `includeStack`, even when stacks are off (`types.ts:255-262`).
**Fix:**
- Move `[INSPECT]`, `toJSON` (A4) and `toString` (A7) onto a **shared prototype**, created with `Object.create(errProto)`.
- Precompute the effective config once per set at `init()`, and re-read only when `configure()` bumps a version counter.
- Short-circuit `captureStack` before any object spread.

Target: about 2× faster creation, enforced as an acceptance threshold in ES-30. After A4(b), the callable form disappears or becomes cheap.

#### P2 — Linear guard for large sets · **Low** · [Measured]
42 ns at 40 kinds vs. 6 ns at 2. Use a `Set<string>` for membership when `kinds.length > ~8`. agentx's largest sets are `SqliteError` (21 kinds) and `DeploymentError` (34 kinds).

#### P3 — Bundle · **Low**
`dist/index.js` is 8.7 KB unminified, with no dependencies. Fine. Keep `sideEffects: false`. The barrel `index.ts` re-exports `createKindFunction`, `createSetGuard` and `createSetGuardWithKinds`, which are marked `@internal` but are public. Stop exporting them in 0.4.0, or move them to a `/internal` subpath.

### 4.2 Code hygiene & chores

| ID | Item | Action |
|---|---|---|
| C1 | `@internal` helpers exported publicly (`createKindFunction`, `createSetGuard`, `createSetGuardWithKinds`) | Deprecate in 0.3.1, remove in 0.4.0, or move to a subpath export. |
| C2 | The 1,084-line `types.ts` mixes types, runtime and helpers | After the fixes, split into `brand.ts`, `kind.ts`, `set.ts`, `helpers.ts` (recover/inspect/merge/capture), `types.ts`. |
| C3 | Agent-instruction duplication: `AGENTS.md` is **byte-identical** to `.github/copilot-instructions.md` (658 lines); `CLAUDE.md` (639), `GEMINI.md` (533) and `.claude/CLAUDE.md` (123) overlap heavily | Keep one source (`AGENTS.md`), with the others as short pointers. |
| C4 | `TASK_PLAN.md` (188 lines): the original 38-task build plan, fully superseded by `backlog/` (39 tasks, none open) | Archive to `backlog/docs/` or delete. |
| C5 | `ERROR_HANDLING_DESIGN.md` (1,784 lines) and `LLMS.txt` (732) document the no-op config options (A11) | Update with the 0.4.0 changes; generate `LLMS.txt` from the README to prevent drift. |
| C6 | `tsconfig.json` template leftovers (`jsx`, `allowJs`) | Remove (D6). |
| C7 | `tests/playground.test.ts` | Fold into the real suites. |
| C8 | No release automation or tags | Tag past versions; add changesets or release-please; publish with provenance. |
| C9 | The `oxlint-plugin-errorset` rules only activate in files that import `@takinprofit/errorset` directly (Phase 1 finding), while the recommended pattern centralizes sets and re-exports them | Owned by the oxlint-plugins audit. errorset can help by documenting the re-export pattern and, after A1, by giving guards a recognizable shape (e.g. a `set` field) that lint rules can key on. |

---

## 5. Action Plan / Roadmap

> **Process note for the implementing agent:** this repo tracks work with the Backlog.md CLI (see `CLAUDE.md`). Create each task with `backlog task create … --ac …`; never edit task files directly. The IDs below (`ES-xx`) are suggestions; keep the dependency order. Every bug-fix task starts by turning its Appendix A repro into a failing test.

### Release strategy

| Release | Theme | Compatibility |
|---|---|---|
| **0.3.1** | Toolchain, packaging, TS 7, non-breaking fixes and deprecations (Phase 0) | Non-breaking |
| **0.4.0** | Error identity and correctness (Phase 1) | **Breaking.** `set` field and set-precise guards; registry brand; exhaustive `recover` types; reserved kinds rejected; `format`/`colors` removed; `cause: unknown`; internal helpers unexported; possibly a plain object for the no-context form. Ship a migration guide. |
| **0.5.0** | DX additions and performance (Phases 2–3) | Additive |

Ship 0.4.0 together with the agentx changes listed at the end, because A1 and A2 change how agentx's guards behave.

### Phase 0 — Toolchain & packaging → 0.3.1

| ID | Task | Fixes | Acceptance criteria |
|---|---|---|---|
| ES-01 | CI quality gate | Q2 | `ci.yml`: frozen install → lint → typecheck (TS 7.0; 6.0 and 5.9 compatibility legs) → test + coverage thresholds → build → pack smoke test on Bun {1.3.x, latest} + Node LTS; lefthook pre-push runs typecheck + test. |
| ES-02 | TypeScript 7 toolchain | D2, D3, D5 | `typescript@~7.0.2` devDep; `@typescript/native-preview` removed; scripts call `tsc`, not `bunx tsc`/`bunx tsgo`; `"types": ["bun"]`; `"rootDir": "./src"` in the build config; TS 7 emits the same `dist/*.d.ts` layout as today (no `dist/src/`). |
| ES-03 | Build-independent type tests | D3, Q4 | Type tests import `src/` and use `expect-type`/`@ts-expect-error`; `tsc --noEmit` passes on a fresh clone with no `dist/`; `tsd` removed; type tests run on every CI TS leg. |
| ES-04 | Peer dependency and engines | D1, D4 | `typescript` peer removed (or `>=5.4`, optional); `engines` = tested Node LTS floor + `bun`; `exports` adds `"default"` and `"./package.json"`; `require()` works on Node ≥ 22 and Bun (smoke test). |
| ES-05 | Pin and upgrade dev deps | D5 | `@types/bun@1.4.4` pinned; Biome 2.6 / ultracite 8 (rules reviewed); lefthook 2.2; lint clean. |
| ES-06 | `toJSON` / `toString` on errors | A4a, A7 | `JSON.stringify` of both error shapes yields `{ kind, message, data, cause? }`; `String(err)` = `"<Set>.<kind>: <message>"`; tests for both. |
| ES-07 | Deprecate no-op config | A11 | `includeTimestamp` implemented (sets `timestamp`); `format` and `colors` marked `@deprecated` in types and docs; README/LLMS corrected. |
| ES-08 | Deprecate internal exports | C1 | `createKindFunction`, `createSetGuard`, `createSetGuardWithKinds` carry `@deprecated`; README stops mentioning them. |
| ES-09 | Repo hygiene | C3, C4, C6, C7, C8 | One agent-instructions source; `TASK_PLAN.md` archived; tsconfig leftovers removed; playground folded in; past versions tagged. |

### Phase 1 — Identity & correctness → 0.4.0 (breaking)

| ID | Task | Fixes | Depends on | Acceptance criteria |
|---|---|---|---|---|
| ES-10 | Registry brand + protocol version | A2 | ES-01 | `ERR = Symbol.for("@takinprofit/errorset/err")`; brand value carries a protocol number; the cross-copy test (two `bun build` copies) passes for set guards, kind guards and `isErr`. |
| ES-11 | Set identity on errors | A1 | ES-10 | Every error has enumerable readonly `set`; set and kind guards check set + kind; `instanceof` follows; the shared-kind repro returns `false`; `Err` gains a `Set` type parameter; duplicate set names are handled per a documented policy (warn or throw). |
| ES-12 | Exhaustive `recover` | A10 | — | A non-exhaustive handler map without `_` fails to compile (type test); a full map or `_` compiles; the runtime throw is unreachable from typed code. |
| ES-13 | Reserved kind names | A3 | — | Reserved names fail at compile time (`NoReserved`) and at runtime with a clear message naming the word; type and runtime tests for each. |
| ES-14 | `cause: unknown` and capture preserves the original | A6 | — | `ErrorOptions.cause` accepts any value; `capture`/`captureAsync` attach the caught value as `cause` by default; non-Error throws keep the original value and get a readable message. |
| ES-15 | Remove `format`/`colors`; finalize config | A11, A12 | ES-07 | Options removed from types and runtime; migration note; config docs list only working options. |
| ES-16 | Immutable errors | A8 | ES-11 | Errors and their `data` are frozen; strict-mode writes throw (tested); P1 benchmark shows < 10% creation overhead from freezing. |
| ES-17 | Remove internal exports | C1, P3 | ES-08 | Helpers no longer exported (or only via `/internal`). |
| ES-18 | No-context error shape decision | A4b | ES-06 | Decide and implement: either plain object + `.with({ cause })`, or keep callable (toJSON already fixes JSON). `structuredClone` behavior documented and tested. |
| ES-19 | 0.4.0 release | — | all above | CHANGELOG with "Breaking changes" + migration guide (agentx-specific notes below); tag + provenance publish. |

### Phase 2 — DX additions → 0.5.0

| ID | Task | Fixes | Acceptance criteria |
|---|---|---|---|
| ES-20 | Rehydration: `XError.from(unknown)` | A5 | Validates `{ set, kind, message, data }`, re-brands, and returns `undefined` for non-matching input; JSON/structuredClone round-trip tests. |
| ES-21 | `interface` entity types | A13 | `init<SomeInterface>()` compiles; template-key constraints unchanged (type tests). |
| ES-22 | Variadic, set-aware `merge` | A9 | `merge(a, b, c…)`; no duplicate `(set, kind)` pairs; the merged guard has `recover`/`inspect`; data is typed as a union over `set`. |
| ES-23 | Optional per-kind data keys | A14 | `errorSet(name, { kind: [keys] })` overload narrows `data` exactly in kind guards; the array form still works. |
| ES-24 | Better message interpolation | A15 | Objects JSON-rendered (cycle-safe), `null`/`undefined` literal; tests. |
| ES-25 | `toError(err)` adapter | A7 | Returns a real `Error` with `name`, `message`, `cause: err`; documented for logger/APM interop. |

### Phase 3 — Performance & structure (parallelizable with Phase 2)

| ID | Task | Fixes | Acceptance criteria |
|---|---|---|---|
| ES-30 | Shared prototype + cached config | P1 | `[INSPECT]`/`toJSON`/`toString` on a shared prototype; per-set effective config cached and invalidated by `configure()`; creation benchmark ≤ 60 ns/op (from 116.7) on the reference machine. |
| ES-31 | `Set`-based membership for large sets | P2 | A 40-kind guard ≤ 10 ns/op (from 42.1). |
| ES-32 | Split `types.ts` | C2 | No behavior change; all tests and benchmarks unchanged. |
| ES-33 | Benchmark suite in repo | P1, P2 | `bench/` with the Appendix A benchmark; CI job (manual) records results. |

### Downstream follow-ups for agentx (alongside errorset 0.4.0)

These belong in agentx's backlog:
1. **Audit shared-kind guard sites** before upgrading, especially `OrderError`/`PositionError`/`LeverageError`/`MarginError` (`invalid_symbol`, `exchange_unavailable`) and the six sets sharing `not_found`/`validation_failed`. After ES-11, any code that *accidentally relied* on cross-set matching will start taking different branches.
2. **Plugin bundles:** ES-10 fixes guard recognition across bundled copies. agentx should still consider `--external @agentx/core @takinprofit/errorset` for plugin builds, so plugins and the host share one copy (one config, one version).
3. **`error-mapping.ts`:** after ES-14, keep the StrataDB exception as `cause` instead of flattening it to `message`.
4. **TypeScript 7:** the peer-dependency fix (ES-04) removes the `typescript ^5` conflict for agentx's TS 6 → 7 move.
5. **`oxlint-plugin-errorset`:** coordinate with the oxlint-plugins audit, so the rules work with centrally defined, re-exported sets (C9).

---

## Appendix A — Reproduction scripts

The scripts are in the audit scratchpad (`/private/tmp/claude-501/-Users-takinprofit-Dev/239a07a4-30ee-4777-aea1-feeee3c1317b/scratchpad/errorset-repro/`: `repro.ts`, `types-probe.ts`, `bench.ts`; cross-copy: `…/scratchpad/xbundle/run.ts`). The scratchpad is temporary, so the essential cases are reproduced here:

```ts
import { errorSet, isErr, merge, configure, resetConfig } from "../src/index.ts"

// A1 — cross-set confusion (expected false, got true)
type Ctx = { symbol: string }
const OrderError = errorSet("OrderError", ["invalid_symbol", "order_rejected"]).init<Ctx>()
const PositionError = errorSet("PositionError", ["invalid_symbol", "fetch_failed"]).init<Ctx>()
const pe = PositionError.invalid_symbol`bad ${"symbol"}`({ symbol: "X" })
OrderError(pe)                 // true
OrderError.invalid_symbol(pe)  // true

// A2 — cross-copy (build src twice: bun build src/index.ts --outfile host.js / plugin.js)
// HostSet(PluginSet.kind`...`(...)) === false

// A3 — reserved kinds compile but throw at init()
errorSet("S", ["recover"]).init() // TypeError: Attempting to change enumerable attribute of unconfigurable property.

// A4 — callable no-context error
const E = errorSet("E", ["boom"]).init<{ id: string }>()
const callable = E.boom`static message`
typeof callable                    // "function"
JSON.stringify({ error: callable }) // "{}"
structuredClone(callable)           // DataCloneError

// A5 — brand lost across serialization
isErr(JSON.parse(JSON.stringify(E.boom`id ${"id"}`({ id: "1" })))) // false

// A6 — capture drops the original error
const C = errorSet("C", ["failed"]).init<{ message: string }>()
const r = C.capture(() => { throw new TypeError("root") }, (e) => C.failed`${"message"}`({ message: e.message }))
"cause" in (r as object) // false

// A8 — mutable
const reg = E.boom`id ${"id"}`({ id: "1" }); (reg as any).message = "changed" // succeeds

// A9 — merge duplicates kinds
merge(OrderError, PositionError).kinds // ["invalid_symbol","order_rejected","invalid_symbol","fetch_failed"]

// A10 — compiles, throws at runtime
E.recover(reg, {}) // Error: No handler found for error kind: boom…

// A11 — no-op config
configure({ includeTimestamp: true, format: "json", colors: false })
"timestamp" in E.boom`id ${"id"}`({ id: "1" }) // false
resetConfig()

// Type-level (types-probe.ts): these compile but shouldn't, or fail but shouldn't:
//   UE.recover(r, { not_found: () => null })   // compiles (A10)
//   UE.recover(r, {})                           // compiles (A10)
//   errorSet("RK", ["recover", "kinds"])        // compiles (A3)
//   errorSet("IE", ["x"]).init<SomeInterface>() // TS2344 (A13)
//   UE.not_found`x ${"id"}`({ id }, { cause: new Error() }) // TS2739 (A6)
```

## Appendix B — Commands run

```bash
cd /Users/takinprofit/Dev/errorset
bun install --frozen-lockfile --ignore-scripts      # node_modules/ (git-ignored)
bun test                                             # 129 pass, 99.89% lines
bun run typecheck                                    # fresh clone: 13 errors; after build: 0
bun run lint                                         # clean
bun run build                                        # dist/ (git-ignored); bunx tsc resolved TS 5.9.3
bunx tsd                                             # pass
bunx -p typescript@{5.9.3,6.0.3,7.0.2} tsc --noEmit  # 0 / 12 / 12 errors
bunx -p typescript@7.0.2 tsc -p tsconfig.build.json  # TS5011, emits dist/src/*.d.ts
#   + --types bun --rootDir src                      # 0 errors, identical to TS 5.9 output
npm pack @takinprofit/errorset@0.3.0                 # consumer fixture: TS 5.9/6.0/7.0 × bundler/nodenext OK; require() fails
<bun 1.3.6> test                                     # 129 pass
bun outdated
```

No tracked files in the errorset repo were modified (`git status` clean). `node_modules/` and `dist/` were created and are git-ignored.
