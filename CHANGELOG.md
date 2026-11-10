# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Release tooling: `bun run release:prepare <version> [--dry-run]` prepares a verified release (changelog roll, version bump, tag, local CI, packed tarball with SHA-512 and release notes) without pushing or publishing; `.github/workflows/release.yml` publishes tags with npm trusted publishing and provenance; `CONTRIBUTING.md` documents the procedure. Retroactive tags `v0.1.0`, `v0.2.1` and `v0.3.0`, verified against the published tarballs.
- `toJSON()` and `toString()` on both error shapes (non-enumerable). `JSON.stringify` now yields `{ kind, message, data, cause? }` for template errors and for no-context errors, which previously serialized to nothing because they are functions; native `Error` causes serialize as `{ name, message }`. `String(err)` returns `"<SetName>.<kind>: <message>"`. Creation costs about 50 ns more per error (107 → 161 ns in `bun run bench`) until the shared-prototype work lands.
- Benchmark suite (`bun run bench`, `--runs N --json <file>`) with a recorded 0.3.0 baseline in `bench/baseline-0.3.0.json` (Bun 1.4.4, Apple M5). Not part of CI.
- `require("@takinprofit/errorset")` now works on Node 22+ and Bun: `exports` gains `default` and a `./package.json` entry alongside `types` and `import`.
- CI workflow (`.github/workflows/ci.yml`): lint, typecheck, coverage, build and type tests on Linux and macOS for Bun 1.3.14, 1.4.4 and latest; TypeScript 5.9/6.0/7.0 compatibility (7.1 beta advisory); a Node 22/LTS import check. `scripts/ci-local.sh` runs the same jobs locally, and lefthook now runs typecheck and tests on pre-push.

### Fixed

- `includeTimestamp` now works, globally and per set: errors of both shapes get a numeric `timestamp` (`Date.now()`) at creation, which is also included in `toJSON` output. When it is off, the property is absent. It was documented before but never implemented.
- Building from source with Bun 1.3.x produced an empty `dist/index.js` (the bundler dropped every module because the package declared `"sideEffects": false`). `sideEffects` is now `["./src/*.ts"]`: source files count as side-effectful for our own build, and the published `dist/` files remain side-effect free for consumer bundlers (an unused import is still dropped entirely). Bun 1.4 output is byte-identical; published tarballs were never affected when built with Bun 1.4.

### Deprecated

- `createKindFunction`, `createSetGuard` and `createSetGuardWithKinds`. They are internal helpers that were exported by mistake; they remain exported in 0.3.x and are removed from the public entry in 0.4.0. Use `errorSet(name, kinds).init<T>()`.
- The `format` and `colors` configuration options (and the `Format` type). They never had any effect; `configure()` still accepts them, and they are removed in 0.4.0. Format errors in your logger with `JSON.stringify(err)` or `String(err)`.

### Changed

- Dev tooling: `@types/bun` pinned to 1.4.4 (was `latest`); ultracite 8.1.1, Biome 2.6.6 and lefthook 2.2.2, all pinned exactly. No runtime changes.
- Removed the `typescript: ^5` peer dependency. The package ships only `.d.ts` files, and CI verifies them on TypeScript 5.9, 6.0 and 7.0, so TypeScript 6/7 projects no longer get peer conflicts.
- `engines` is now `node >=22` and `bun >=1.3.14`, matching the CI matrix (Node 18 is end-of-life).
- No source maps are shipped: `dist/index.js` is a single unminified bundle, so stack traces stay readable without them.
- Develop and build on TypeScript 7.0 (`typescript ~7.0.2` devDependency) instead of an unpinned `bunx tsc` and the `@typescript/native-preview` dev build. Declaration output is unchanged: `dist/index.d.ts`, `dist/types.d.ts` and `dist/config.d.ts` match a TypeScript 5.9 build byte for byte.
- Type tests run from source with `expect-type` under the project's TypeScript compiler (`bun run test:types`), replacing `tsd` and its bundled TypeScript 5.9. `typecheck` no longer depends on a prior build.

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

[Unreleased]: https://github.com/g5becks/errorset/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/g5becks/errorset/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/g5becks/errorset/compare/v0.1.0...v0.2.1
[0.1.0]: https://github.com/g5becks/errorset/releases/tag/v0.1.0
