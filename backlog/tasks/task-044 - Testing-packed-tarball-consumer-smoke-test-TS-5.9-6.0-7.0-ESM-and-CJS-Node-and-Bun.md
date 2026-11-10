---
id: TASK-044
title: >-
  Testing: packed-tarball consumer smoke test (TS 5.9/6.0/7.0, ESM and CJS, Node
  and Bun)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T18:38:00Z'
labels:
  - testing
  - packaging
milestone: m-0
dependencies:
  - TASK-043
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Nothing checks the *published* shape of the package. During the audit, a manual check passed on TS 5.9, 6.0 and 7.0 (`bundler` and `nodenext`, `skipLibCheck: false`), and CJS `require` failed. Audit ref: Q5.

## Implementation
Port StrataDB's packed-consumer approach (`/Users/takinprofit/Dev/StrataDb/scripts/smoke-consumer.ts`):
1. Add `scripts/smoke-consumer.ts` and a `test:consumer` script (`bun run build && bun scripts/smoke-consumer.ts`).
2. Run `bun pm pack` into a temp directory, then install the tarball into isolated fixtures with **production dependencies only**.
3. Type-check a consumer file that uses the public API, including one `@ts-expect-error` for a bad template key, on TS 5.9.3, 6.0.3 and 7.0.2. Test both `moduleResolution: bundler` and `nodenext`, with `skipLibCheck: false`.
4. At runtime: ESM `import` and CJS `require` on Bun and on Node (22 and LTS when available). Create an error, guard it, and `recover` it.
5. Add the smoke test to `ci.yml` and `scripts/ci-local.sh`.
6. Mutation check: break `types` in the packed package.json, or remove the `default` export condition, and confirm the smoke test fails.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 bun run test:consumer packs the package and type-checks a consumer on TS 5.9.3, 6.0.3 and 7.0.2 with bundler and nodenext, skipLibCheck false
- [x] #2 The consumer runs ESM import and CJS require on Bun and Node, creating, guarding and recovering an error
- [x] #3 The smoke test runs in ci.yml and scripts/ci-local.sh
- [x] #4 Mutation check recorded: a broken types path or missing default condition makes test:consumer fail
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
- [x] #6 Building with every CI Bun version (incl. 1.3.14) produces a working dist/index.js; package.json sideEffects keeps dist/ side-effect free for consumer bundlers
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. scripts/smoke-consumer.ts (ported from StrataDB): bun pm pack into a temp dir; fixtures installed with --production.
2. Type-check consumer.ts (bundler; nodenext) and consumer.cts (nodenext CJS) on TS 5.9.3/6.0.3/7.0.2, skipLibCheck false, @ts-expect-error for a bad template key.
3. Assert every path the packed package.json references exists (TS falls back to sibling .d.ts, so a broken types path is otherwise invisible).
4. Runtime: consumer.mjs (import) and consumer.cjs (require) on Bun and Node: create, guard, recover.
5. test:consumer script; ci.yml check (SMOKE_NODE=skip) and node job (SMOKE_NODE=require); ci-local mirrors via SMOKE_KEEP + node containers.
6. Mutation checks: broken types path, removed default condition.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: scripts/smoke-consumer.ts + test:consumer (bun run build && bun scripts/smoke-consumer.ts). Packs with bun pm pack, installs the tarball into isolated fixtures with --production, type-checks consumer.ts (bundler; nodenext ESM) and consumer.cts (nodenext CJS, import = require) on TS 5.9.3/6.0.3/7.0.2 with skipLibCheck false and a @ts-expect-error bad template key, asserts every path the packed package.json references exists, then runs consumer.mjs (import) and consumer.cjs (require) on Bun and Node: create, set/kind guards, message, recover.
- CI wiring: ci.yml check job runs test:consumer with SMOKE_NODE=skip; node job runs it with SMOKE_NODE=require on Node 22 and lts/*. ci-local mirrors this: check legs use SMOKE_NODE=skip; the node job builds the fixture with SMOKE_KEEP and runs consumer.mjs/.cjs in node:22-slim and node:lts-slim. prepublishOnly now includes test:consumer.
- Mutation checks (scratch clone): exports["."].types -> ./dist/missing.d.ts initially PASSED because TS falls back to the .d.ts beside the import target, so I added the published-path check; it now fails ("packed package.json references missing files: ./dist/missing.d.ts"). Removing the default condition fails ("Cannot find module" from consumer.cjs on Bun). Unmutated run passes.
- Bug found by the smoke test (AC #6 added before fixing): Bun 1.3.14 emitted a 16-line dist/index.js (export list only, all code dropped) because the package declared sideEffects:false. Not fixed by --ignore-dce-annotations, an import-then-export entry, or --splitting. Fix: sideEffects ["./src/*.ts"]. Bun 1.3.14 now emits the full 313-line bundle (diff vs 1.4.4 is cosmetic: one local rename, export order); the Bun 1.4.4 output is byte-identical to before. Consumer tree-shaking unchanged: an unused-import app bundled with Bun 1.4.4 contains no errorset code with either setting. Consumers bundling the 1.4.4-built tarball with Bun 1.3.14 were never affected.
- Verification: strict gate (each step exit-checked) passes. Verified with scripts/ci-local.sh (0871e74, PASS); GitHub Actions unavailable (billing lock). The previous run on e67de5d FAILED on both Bun 1.3.14 legs (the bug above).
- Breaking change: none.
<!-- SECTION:NOTES:END -->
