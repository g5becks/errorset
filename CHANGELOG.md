# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `require("@takinprofit/errorset")` now works on Node 22+ and Bun: `exports` gains `default` and a `./package.json` entry alongside `types` and `import`.
- CI workflow (`.github/workflows/ci.yml`): lint, typecheck, coverage, build and type tests on Linux and macOS for Bun 1.3.14, 1.4.4 and latest; TypeScript 5.9/6.0/7.0 compatibility (7.1 beta advisory); a Node 22/LTS import check. `scripts/ci-local.sh` runs the same jobs locally, and lefthook now runs typecheck and tests on pre-push.

### Changed

- Removed the `typescript: ^5` peer dependency. The package ships only `.d.ts` files, and CI verifies them on TypeScript 5.9, 6.0 and 7.0, so TypeScript 6/7 projects no longer get peer conflicts.
- `engines` is now `node >=22` and `bun >=1.3.14`, matching the CI matrix (Node 18 is end-of-life).
- No source maps are shipped: `dist/index.js` is a single unminified bundle, so stack traces stay readable without them.
- Develop and build on TypeScript 7.0 (`typescript ~7.0.2` devDependency) instead of an unpinned `bunx tsc` and the `@typescript/native-preview` dev build. Declaration output is unchanged: `dist/index.d.ts`, `dist/types.d.ts` and `dist/config.d.ts` match a TypeScript 5.9 build byte for byte.
- Type tests run from source with `expect-type` under the project's TypeScript compiler (`bun run test:types`), replacing `tsd` and its bundled TypeScript 5.9. `typecheck` no longer depends on a prior build.
