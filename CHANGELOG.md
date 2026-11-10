# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Develop and build on TypeScript 7.0 (`typescript ~7.0.2` devDependency) instead of an unpinned `bunx tsc` and the `@typescript/native-preview` dev build. Declaration output is unchanged: `dist/index.d.ts`, `dist/types.d.ts` and `dist/config.d.ts` match a TypeScript 5.9 build byte for byte.
- Type tests run from source with `expect-type` under the project's TypeScript compiler (`bun run test:types`), replacing `tsd` and its bundled TypeScript 5.9. `typecheck` no longer depends on a prior build.
