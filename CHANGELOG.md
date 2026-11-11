# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking changes

- **Merged guards are typed per set, and `kinds` lists each name once (audit A9, TASK-067).** A merged guard used to type `data` as `Record<string, unknown>`; it now narrows to the union of the merged sets' error types, discriminated by `set`, so reading a `data` key that not every merged set has no longer compiles until you narrow (`if (err.set === "DbError") err.data.query`). `merged.kinds` no longer repeats a kind name that several sets share (membership was already per `(set, kind)` pair since 0.4.0, and is unchanged).
  *Migration:* narrow merged errors by `set` (or with the original set's guard) before reading set-specific `data` fields. Code that counted or indexed duplicate names in `merged.kinds` must expect each name once.

### Added

- **`XError.from(value)` rehydrates errors after JSON, `structuredClone`, workers or HTTP (audit A5, TASK-065).** It validates `{ set, kind, message, data, cause?, timestamp? }` (the set's own name, one of its kinds, a string message, a plain-object `data`, a numeric `timestamp`) and returns a branded, frozen error that every guard recognizes, with the same shape, `toJSON`, `toString` and (for empty `data`) `.with()` as a created error; anything else returns `undefined`. Extra fields are ignored, `timestamp` is kept, no stack is captured, `cause` is kept as-is (rehydrate an errorset cause with its own set's `from`), and a live error of the set is returned unchanged. There is no top-level `fromJSON`: rehydration needs the set to validate the kind.

- **Variadic, set-aware `merge` with `recover` and `inspect` (audit A9, TASK-067).** `merge(a, b, c, …)` and `X.merge(…others)` take any number of sets or merged guards; `(set, kind)` pairs are de-duplicated. The merged guard (`MergedGuard<E>`) narrows to the union of the sets' error types and has `recover` (exhaustive over every `(set, kind)` pair, or with a `_` catch-all), `inspect` and `merge`; handlers are nested by set name then kind (`{ OrderError: { rejected: e => … }, _: e => … }`) so sets that share a kind name get separate handlers. New exported types: `MergedGuard`, `MergedRecoverHandlers`, `MergedInspectHandlers`, `MergeInput`, `GuardedError`.

- **Exact data per kind: `errorSet(name, { kind: [keys] })` (audit A14, TASK-068).** The object form declares each kind's data keys (`{ not_found: ["id"], suspended: ["id", "reason"] }`); kind guards then narrow `data` to exactly `Pick<T, keys>` instead of `Partial<T>`, so no `!` is needed. Errors of a declared kind carry exactly the declared keys, taken from the entity (which must provide all of them), even when the template uses fewer; template holes are limited to declared keys; a kind declared with `[]` creates no-context errors; `init<T>()` requires `T` to have every declared key; `from()` rejects data missing a declared key. Reserved names are rejected as in the array form. The array form is unchanged. New exported types: `KindKeys`, `KindData`, `DeclaredKeys`, `NoReservedKeys`.

- **`toError(err)` adapter for Error-typed APIs (audit A7, TASK-070).** Returns a new, ordinary `Error` with `name` `"<Set>.<kind>"`, the error's `message`, `cause` set to the original errorset error (typed `Error & { readonly cause: E }`), and a stack captured at the call site (the `toError` frame excluded where `Error.captureStackTrace` exists). For loggers, APMs and reporters that read `name`/`message`/`stack`, and for APIs that require a thrown `Error`.

### Changed

- **Lossless message interpolation (audit A15, TASK-069).** Template values used to be rendered with `String(value ?? "")`, so objects became `[object Object]` and `null`/`undefined` became empty strings. Messages now render strings as-is, `null`/`undefined` literally, bigints with an `n` suffix (`10n`), dates as ISO strings (`Invalid Date` for invalid ones), errors and objects with their own `toString` (`URL`, errorset errors, custom classes) through it, functions as `[Function: name]`, and other objects and arrays as cycle-safe JSON (`"[Circular]"` for cycles only, truncated to 200 characters with `…`). `data` keeps the original values. Message text changes for those value types; code that matches exact messages built from them must expect the new text. No per-set `format` hook: formatting beyond this belongs to the logger.

- **Faster error creation (audit P1, TASK-071).** `toJSON`, `toString` and the inspect hook moved to a shared prototype (an inspect getter returns a function bound to the error, so detached calls still work); each set caches its effective configuration until `configure()`, its disposer or `resetConfig()` changes it; the stack/timestamp work is skipped with one check when both are off; each kind reuses the creator of its last template call site; template strings are copied once per creator. Measured on the same machine (Bun 1.4.4, `bun run bench --runs 3` medians, before → after): template errors 178.7 → 56.2 ns (0.3.0 baseline 107.4 ns, so 1.9× faster than 0.3.0), no-context errors 149.7 → 33.8 ns, `includeStack` errors 595.6 → 460.3 ns; guards unchanged. Errors are still frozen and deep-equal, serialize, inspect and print exactly as before; `toJSON`/`toString` are now inherited rather than own properties (still non-enumerable), and `err.constructor` is still `Object`.

- **Constant-time set guards (audit P2, TASK-072).** A set's guard keeps its kinds in a `Set` and inlines the brand, set and kind checks, so guard cost no longer grows with the number of kinds: a 40-kind set's guard on its last kind 43.0 → 5.1 ns, a 2-kind guard 6.8 → 5.6 ns (the 0.3.0 baseline, before set identity), non-errors 5.7 ns (Bun 1.4.4, `bun run bench --runs 5` medians). Merged guards keep per-set `Set`s.

### Fixed

- **A kind guard called with an array that has a `raw` property returned an error object (TASK-074).** `UserError.a(value)` detects tagged-template calls by shape, so an ordinary array with a `raw` array was treated as a template and returned a (truthy) error instead of `false`. Template strings must now also be frozen, as every real `TemplateStringsArray` is; the check runs only for call sites not seen before, so creation speed is unchanged (no-context creation got faster, 34 → 25 ns, from caching each call site's joined message). A deliberately frozen look-alike is still treated as a template.
- **`init<T>()` accepts `interface` entity types (audit A13, TASK-066).** The entity constraint was `T extends Record<string, unknown>`, which interfaces don't satisfy (no implicit index signature), so `init<Account>()` failed with TS2344. Entity types and `Err`'s `Data` parameter are now constrained to `object`; template keys are still `keyof T & string`, bad keys still fail to compile, and type aliases behave as before.

## [0.4.0] - 2026-11-11

### Breaking changes

Upgrading from 0.3? Follow the [0.3 → 0.4 migration guide](docs/migration-0.4.md): before/after code for every entry below, and steps to audit guards where several sets share a kind name.

- **Internal helpers removed from the public entry (audit C1).** `createKindFunction`, `createSetGuard` and `createSetGuardWithKinds`, deprecated in 0.3.1, are no longer exported. There is no `./internal` subpath: everything they did is available through `errorSet(name, kinds).init<T>()` and `merge()`.
  *Migration:* build sets with `errorSet(name, kinds).init<T>()`, and combine guards with `merge()` or `Set.merge()`.
- **Errors are immutable (audit A8).** Every error and its `data` object are frozen at creation (a shallow freeze: values nested inside `data` keep their own mutability, and the entity you pass in is not frozen). Writing, adding or deleting fields throws a `TypeError` in strict mode (all ES modules) and fails silently in sloppy scripts; before, `err.message = "changed"` succeeded despite the `readonly` types. `.with()` and `capture` derive new frozen errors instead of mutating. No-context errors share one frozen empty `data` object.
  *Migration:* code that modified errors after creation must create a new error instead (for a cause, use the `cause` option, `.with({ cause })` or `capture`). Measured creation cost: see ### Changed below.
- **No-context errors are plain objects (audit A4, option b).** ``X.kind`static message` `` used to return a function with error properties (`CallableErr`), which `structuredClone`, `postMessage` and worker/IPC boundaries reject. It now returns a plain error object (`NoContextErr`) like every other error; options such as `cause` go through a non-enumerable ``X.kind`message`.with({ cause })``, which returns a new error and leaves the original unchanged. A structured clone carries the data but not the brand symbol (rehydration with `from()` is planned for 0.5.0). Decision: option (b) over keeping the callable form (option a), because a function can never cross a structured-clone boundary and two error shapes made every consumer handle both.
  *Migration:* replace ``X.kind`msg`({ cause })`` with ``X.kind`msg`.with({ cause })`` and ``X.kind`msg`()`` with ``X.kind`msg`.with({})`` (or just ``X.kind`msg` ``). Rename the `CallableErr` type to `NoContextErr`. Code that checked `typeof err === "function"` must expect `"object"`.
- **`format` and `colors` are removed; `configure()` is application-only and returns a disposer (audits A11, A12).** The options (and the `Format` type), deprecated in 0.3.1 because they never had an effect, no longer exist in the types; passing them is a type error, and `configure()` ignores them (and any other unknown option) at runtime. `configure()` now returns a function that restores the previous configuration. Global configuration affects every error set in the process, so it is documented as application-only: libraries configure their own sets with `init(config)`.
  *Migration:* delete `format`/`colors` from `configure()` and `init()` calls and the `Format` import; format errors in your logger with `JSON.stringify(err)` or `String(err)`. Libraries that call `configure()` should move their options to `init(config)`. In tests, prefer `const restore = configure(…)` with `restore()` over `resetConfig()`.
- **`cause` accepts any value, and `capture`/`captureAsync` keep the original exception (audit A6).** `ErrorOptions.cause` and `Err.cause` are now `unknown` (ES2022 `Error.cause` semantics), so a native `Error` or any thrown value can be a cause; before, only errorset errors type-checked (TS2739). `capture` and `captureAsync` attach the caught value as the mapped error's `cause` unless the mapper set one, so stacks, `code`, `errno` and nested causes survive; the mapper's own error object is not modified. Non-`Error` throws reach the mapper wrapped in an `Error` with a readable message (strings as-is, objects as cycle-safe JSON) instead of `String(x)` (`"[object Object]"`), and `cause` keeps the original value. `toJSON` serializes a native `Error` cause as `{ name, message, code? }`.
  *Migration:* code that reads `err.cause.kind` or `err.cause.data` must narrow first: `if (isErr(err.cause)) …` or `if (UserError(err.cause)) …`. Code that relied on a captured error having no `cause` must expect one. Messages built from `e.message` for thrown objects change from `"[object Object]"` to JSON.
- **Reserved kind names are rejected (audit A3).** Kinds that collide with the set's members or with built-in function properties (`recover`, `inspect`, `merge`, `capture`, `captureAsync`, `kinds`, `Type`, `from`, `_`, `name`, `length`, `call`, `apply`, `bind`, `constructor`, `toString`, `valueOf`, `__proto__` and the other `Function.prototype`/`Object.prototype` names; full list in `RESERVED_KINDS`) now fail to compile through the `NoReserved` constraint, with a message naming the word, and `errorSet()` throws `"<name>" is a reserved kind name in errorset; rename the kind` before defining anything. Before, the set members compiled and then threw a cryptic `TypeError` at `init()`, and the built-in names silently shadowed function properties. `from` is reserved now for the rehydration API planned for 0.5.0, and `_` because it is `recover`'s catch-all key.
  *Migration:* rename any kind that is in `RESERVED_KINDS` (for example `name` → `invalid_name`, `from` → `from_failed`).
- **`recover` is exhaustive (audit A10).** `RecoverHandlers` now requires either a handler for every kind of the set (`_` optional) or a partial map plus a required `_` catch-all. `recover(value, {})`, a partial map without `_`, and handler keys that aren't kinds of the set no longer type-check; before, they compiled and then threw `No handler found…` at runtime. The runtime throw remains only for untyped callers, with a clearer message (`recover() has no handler for "<Set>.<kind>"`).
  *Migration:* add the missing kinds or a `_` catch-all to every `recover` call the compiler now flags. Code matching the old error message must match the new one.
- **Errors record their set, and guards are set-precise (audit A1).** Every error has an enumerable, readonly `set` field with its set's name (also in `toJSON` output), and set guards, kind guards, `instanceof`, `recover`, `inspect` and merged guards check it. Before, `OrderError(err)` and `OrderError.invalid_symbol(err)` returned `true` for a `PositionError.invalid_symbol` error because only the kind name was compared. Types follow: `Err<Kind, Data, Set>` carries the set name, so a guard no longer narrows a same-kind error from another set. Set names must be unique: redefining a name with different kinds logs a one-time `console.warn` (same kinds, e.g. hot reload, stay silent).
  *Migration:* guards no longer match errors from other sets with the same kind name; audit code that relied on cross-set matching (use the right set's guard, or `merge` the sets). Hand-written error types need the set name: `Err<"not_found", Data, "UserError">`, or use `typeof UserError.Type`. Code that compares `Object.keys(err)` or JSON output must expect the new `set` field. Give every error set a unique name.
- **Error brand is a registry symbol with a protocol number (cross-copy recognition).** `ERR` is now `Symbol.for("@takinprofit/errorset/err")` instead of a per-module `Symbol("err")`, and an error's `[ERR]` value is the protocol number `1` (exported as `ERR_PROTOCOL`, type `ErrProtocol`) instead of `true`. Errors created by another copy of errorset in the same process (a bundled plugin, a duplicate install, another version with the same protocol) now pass `isErr` and the set and kind guards; before, they failed all three.
  *Migration:* use `isErr(value)` or a set guard instead of reading the brand. Code that checks `value[ERR] === true` must check `value[ERR] === ERR_PROTOCOL` (or call `isErr`); code that builds error-like objects by hand with `[ERR]: true` must use `[ERR]: ERR_PROTOCOL`. The `Err` type's `[ERR]` property is now `ErrProtocol` (`1`).

### Changed

- **Errors and their `data` are frozen, at a measured creation cost (TASK-061).** Every error and its `data` object are `Object.freeze`d at creation, so assigning to (or adding or deleting) a field of an error or of its `data` throws a `TypeError` in strict mode (all ES modules, classes and `"use strict"` code). Freezing costs about 6–9 ns per object; measured with and without freezing on the same commit (Bun 1.4.4, Apple M5, 5 runs each), template-error creation goes from 161.8 to 176.8 ns (+14.5 ns, two freezes: the error and its `data`) and no-context creation from 138.8 to 146.3 ns (+7.3 ns, one freeze: no-context errors share a frozen empty `data`). Against the 0.3.0 baseline, template-error creation is 107.4 → 176.8 ns overall, most of it from `toJSON`/`toString` (0.3.1) and set identity; TASK-071 (0.5.0) targets that.

## [0.3.1] - 2026-11-10

### Added

- Release tooling: `bun run release:prepare <version> [--dry-run]` prepares a verified release (changelog roll, version bump, tag, local CI, packed tarball with SHA-512 and release notes) without pushing or publishing; `.github/workflows/release.yml` publishes tags with npm trusted publishing and provenance; `CONTRIBUTING.md` documents the procedure. Retroactive tags `v0.1.0`, `v0.2.1` and `v0.3.0`, verified against the published tarballs.
- `toJSON()` and `toString()` on both error shapes (non-enumerable). `JSON.stringify` now yields `{ kind, message, data, cause? }` for template errors and for no-context errors, which previously serialized to nothing because they are functions; native `Error` causes serialize as `{ name, message }`. `String(err)` returns `"<SetName>.<kind>: <message>"`. Creation costs about 50 ns more per error (107 → 161 ns in `bun run bench`) until the shared-prototype work lands.
- Benchmark suite (`bun run bench`, `--runs N --json <file>`) with a recorded 0.3.0 baseline in `bench/baseline-0.3.0.json` (Bun 1.4.4, Apple M5). Not part of CI.
- `require("@takinprofit/errorset")` now works on Node 22+ and Bun: `exports` gains `default` and a `./package.json` entry alongside `types` and `import`.
- CI workflow (`.github/workflows/ci.yml`): lint, typecheck, coverage, build and type tests on Linux and macOS for Bun 1.3.14, 1.4.4 and latest; TypeScript 5.9/6.0/7.0 compatibility (7.1 beta advisory); a Node 22/LTS import check. `scripts/ci-local.sh` runs the same jobs locally, and lefthook now runs typecheck and tests on pre-push.

### Changed

- Dev tooling: `@types/bun` pinned to 1.4.4 (was `latest`); ultracite 8.1.1, Biome 2.6.6 and lefthook 2.2.2, all pinned exactly. No runtime changes.
- Removed the `typescript: ^5` peer dependency. The package ships only `.d.ts` files, and CI verifies them on TypeScript 5.9, 6.0 and 7.0, so TypeScript 6/7 projects no longer get peer conflicts.
- `engines` is now `node >=22` and `bun >=1.3.14`, matching the CI matrix (Node 18 is end-of-life). This is advisory: npm only warns about it unless `engine-strict` is set.
- No source maps are shipped: `dist/index.js` is a single unminified bundle, so stack traces stay readable without them.
- Develop and build on TypeScript 7.0 (`typescript ~7.0.2` devDependency) instead of an unpinned `bunx tsc` and the `@typescript/native-preview` dev build. Declaration output is unchanged: `dist/index.d.ts`, `dist/types.d.ts` and `dist/config.d.ts` match a TypeScript 5.9 build byte for byte.
- Type tests run from source with `expect-type` under the project's TypeScript compiler (`bun run test:types`), replacing `tsd` and its bundled TypeScript 5.9. `typecheck` no longer depends on a prior build.

### Deprecated

- `createKindFunction`, `createSetGuard` and `createSetGuardWithKinds`. They are internal helpers that were exported by mistake; they remain exported in 0.3.x and are removed from the public entry in 0.4.0. Use `errorSet(name, kinds).init<T>()`.
- The `format` and `colors` configuration options (and the `Format` type). They never had any effect; `configure()` still accepts them, and they are removed in 0.4.0. Format errors in your logger with `JSON.stringify(err)` or `String(err)`.

### Fixed

- `includeTimestamp` now works, globally and per set: errors of both shapes get a numeric `timestamp` (`Date.now()`) at creation, which is also included in `toJSON` output. When it is off, the property is absent. It was documented before but never implemented.
- Building from source with Bun 1.3.x produced an empty `dist/index.js` (the bundler dropped every module because the package declared `"sideEffects": false`). `sideEffects` is now `["./src/*.ts"]`: source files count as side-effectful for our own build, and the published `dist/` files remain side-effect free for consumer bundlers (an unused import is still dropped entirely). Bun 1.4 output is byte-identical; published tarballs were never affected when built with Bun 1.4.

## [0.3.0] - 2026-01-17

### Changed

- **Breaking:** a template literal without holes now returns a `CallableErr`, an error value that is also a function, instead of an error creator. Use it directly (`UserError.invalid\`Invalid user data\``) or call it with `{ cause }` to chain errors. Code that passed an unused entity object to such a template needs updating.

## [0.2.1] - 2026-01-06

Includes the unpublished 0.2.0 changes.

### Changed

- **Breaking:** `errorSet` uses a builder: `errorSet("UserError", ["not_found", "suspended"]).init<User>()` replaces `errorSet<User>("UserError", "not_found", "suspended")`, so `kind` is inferred as a literal union.
- Kinds no longer need `as const` (TypeScript 5 const type parameters).

### Added

- Duplicate kinds are rejected at compile time (`NoDuplicates`, `HasDuplicates`) and at runtime (`Duplicate kind "x" in error set "Name"`).
- Per-set configuration through `.init<T>(config)`; `ErrorSetConfig` and `ErrorOptions` types.
- `LLMS.txt` API reference for AI agents.

## [0.1.0] - 2026-01-05

Initial release.

### Added

- `errorSet` with tagged-template error creation: template holes are constrained to the entity's keys, and the referenced fields become the error's `data`.
- Set-level guards (callable and `instanceof`), kind-level guards and the universal `isErr` guard.
- `recover`, `inspect`, `merge`, `capture` and `captureAsync` helpers, plus iteration over a set's kinds.
- Error chaining with `cause`, custom debugger output, optional stack capture and global `configure()`.

[Unreleased]: https://github.com/g5becks/errorset/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/g5becks/errorset/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/g5becks/errorset/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/g5becks/errorset/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/g5becks/errorset/compare/v0.1.0...v0.2.1
[0.1.0]: https://github.com/g5becks/errorset/releases/tag/v0.1.0
