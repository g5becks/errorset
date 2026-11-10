---
id: TASK-041
title: 'Testing: build-independent type tests with expect-type (replace tsd)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T17:41:00Z'
labels:
  - testing
  - toolchain
milestone: m-0
dependencies:
  - TASK-040
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`test-d/index.test-d.ts` imports `../dist/index.js`, so `typecheck` reports 13 errors on a fresh clone and 0 after a build. `tsd` runs on its own bundled TypeScript 5.9.3, so the type tests never exercise TS 6 or 7. Audit refs: D3, Q4.

## Implementation
1. Move the type tests to `tests/types/*.test-d.ts`, importing from `../../src/index.ts`. Use `expect-type` (pinned devDependency) and `@ts-expect-error` for negative cases. Keep every assertion in `test-d/index.test-d.ts`, including the bad-template-key and duplicate-kind checks.
2. Add `tests/types/tsconfig.json` (extends the root config, includes the type tests) and a `test:types` script: `tsc --noEmit -p tests/types/tsconfig.json`.
3. Remove `tsd`, the `tsd` block in package.json, and `test-d/`.
4. Mutation check: temporarily break one positive and one negative assertion, confirm `test:types` fails for each, then revert. Record this in the notes.
5. Update `prepublishOnly` to the new scripts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 From a fresh clone with no dist/, bun install && bun run typecheck && bun run test:types pass
- [ ] #2 Every assertion from test-d/index.test-d.ts exists in tests/types (count recorded in notes); tsd and test-d/ are removed
- [ ] #3 test:types passes with bunx -p typescript@5.9.3, @6.0.3 and @7.0.2 tsc -p tests/types/tsconfig.json
- [ ] #4 Mutation check recorded: a broken positive and a broken negative assertion each make test:types fail
- [ ] #5 Quality gate passes: bun run typecheck, bun run lint, bun test (bunfig.toml coverage thresholds), bun run build, and every other check script that exists at the time (test:types, test:consumer)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Port test-d/index.test-d.ts to tests/types/index.test-d.ts importing ../../src/index.ts; tsd expectType/expectError/expectAssignable -> expect-type expectTypeOf / @ts-expect-error.
2. tests/types/tsconfig.json extending root; test:types = tsc --noEmit -p tests/types/tsconfig.json.
3. Remove tsd, the tsd package.json block and test-d/; update prepublishOnly.
4. Verify fresh clone (no dist) typecheck + test:types; run on TS 5.9.3/6.0.3/7.0.2.
5. Mutation check (one positive, one negative assertion).
<!-- SECTION:PLAN:END -->
