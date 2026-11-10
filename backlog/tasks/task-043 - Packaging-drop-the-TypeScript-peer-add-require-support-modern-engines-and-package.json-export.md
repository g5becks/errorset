---
id: TASK-043
title: >-
  Packaging: drop the TypeScript peer, add require() support, modern engines and
  package.json export
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T18:23:00Z'
labels:
  - packaging
milestone: m-0
dependencies:
  - TASK-042
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
- The `typescript: ^5` peer dependency is wrong. The package only ships `.d.ts` files, which work on TS 5.9, 6.0 and 7.0, and the peer range causes conflicts for TS 6/7 consumers, agentx included.
- `exports` has only an `import` condition, so `require()` fails on Node 26 and Bun.
- `engines.node >=18` is EOL.
- There is no `./package.json` export.

Audit refs: D1, D4.

## Implementation
1. Remove `peerDependencies.typescript`. (Or use `>=5.4` with `peerDependenciesMeta.typescript.optional: true` if you think a floor is useful. Record the decision; removal is preferred because the CI matrix proves 5.9+.)
2. `exports`: `".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "default": "./dist/index.js" }` and `"./package.json": "./package.json"`. Node 22+ and Bun can then `require()` the ESM build.
3. `engines`: `{ "node": ">=22", "bun": ">=1.3.14" }`, matching the CI matrix.
4. Source maps: decide whether to ship JS source maps plus `src/` (as StrataDB does) or none. Record the decision.
5. `bun build` keeps `--target node`; make sure `dist/index.js` has no Bun-only APIs (grep the bundle for `Bun.`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 peerDependencies no longer constrains TypeScript to ^5 (removed, or optional >=5.4); the decision is recorded
- [x] #2 exports has types/import/default for . plus ./package.json; require('@takinprofit/errorset') works on Node 22, Node LTS and Bun (checked against the packed tarball)
- [x] #3 engines is node >=22 and bun >=1.3.14, matching the CI matrix
- [x] #4 The source-map decision is implemented and recorded; dist/index.js contains no Bun-only APIs
- [x] #5 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [x] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove peerDependencies.typescript (decision: remove; the CI matrix proves TS 5.9/6.0/7.0 and the package ships only .d.ts).
2. exports: "." {types, import, default} + "./package.json".
3. engines: node >=22, bun >=1.3.14.
4. Source maps: decide (none vs linked + src/); grep dist/index.js for Bun-only APIs and top-level await (which would break require(esm)).
5. Pack with bun pm pack; in a temp dir install the tarball and require()/import it on Node 22, Node LTS (Docker) and Bun.
6. CHANGELOG, quality gate, ci-local HEAD.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: peerDependencies.typescript removed; exports "." = {types, import, default} plus "./package.json"; engines node >=22, bun >=1.3.14.
- Decision (peer): removed rather than an optional >=5.4 floor. The package ships only .d.ts files and CI proves TS 5.9.3/6.0.3/7.0.2.
- Decision (source maps): ship none. dist/index.js is one unminified 8.7 KB bundle whose stack traces are readable as-is; shipping maps plus src/ would grow the tarball for little gain. Recorded in CHANGELOG.
- Bundle check: grep dist/index.js for "Bun." finds nothing; the only await is inside captureAsync (no top-level await, so require(esm) works).
- Verification: bun pm pack tarball (files: package.json, LICENSE, README.md, dist/{index.js,index.d.ts,types.d.ts,config.d.ts}) installed into a temp consumer; require() of the package and of ./package.json plus an error round trip, and ESM import, pass on Bun 1.4.4, Node 22.23.4 and Node 26.13.0 (node:22-slim, node:lts-slim).
- Quality gate passed; Verified with scripts/ci-local.sh (d8d12a1, PASS); GitHub Actions unavailable (billing lock).
- Breaking change: none for supported runtimes; engines now exclude EOL Node 18/20 (advisory field only).
<!-- SECTION:NOTES:END -->
