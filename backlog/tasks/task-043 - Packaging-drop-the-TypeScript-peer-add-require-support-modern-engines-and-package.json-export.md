---
id: TASK-043
title: >-
  Packaging: drop the TypeScript peer, add require() support, modern engines and
  package.json export
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
- [ ] #1 peerDependencies no longer constrains TypeScript to ^5 (removed, or optional >=5.4); the decision is recorded
- [ ] #2 exports has types/import/default for . plus ./package.json; require('@takinprofit/errorset') works on Node 22, Node LTS and Bun (checked against the packed tarball)
- [ ] #3 engines is node >=22 and bun >=1.3.14, matching the CI matrix
- [ ] #4 The source-map decision is implemented and recorded; dist/index.js contains no Bun-only APIs
- [ ] #5 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
