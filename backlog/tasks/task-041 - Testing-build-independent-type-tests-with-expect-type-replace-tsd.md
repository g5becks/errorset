---
id: TASK-041
title: 'Testing: build-independent type tests with expect-type (replace tsd)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T17:51:00Z'
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
- [x] #1 From a fresh clone with no dist/, bun install && bun run typecheck && bun run test:types pass
- [x] #2 Every assertion from test-d/index.test-d.ts exists in tests/types (count recorded in notes); tsd and test-d/ are removed
- [x] #3 test:types passes with bunx -p typescript@5.9.3, @6.0.3 and @7.0.2 tsc -p tests/types/tsconfig.json
- [x] #4 Mutation check recorded: a broken positive and a broken negative assertion each make test:types fail
- [x] #5 Quality gate passes: bun run typecheck, bun run lint, bun test (bunfig.toml coverage thresholds), bun run build, and every other check script that exists at the time (test:types, test:consumer)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Port test-d/index.test-d.ts to tests/types/index.test-d.ts importing ../../src/index.ts; tsd expectType/expectError/expectAssignable -> expect-type expectTypeOf / @ts-expect-error.
2. tests/types/tsconfig.json extending root; test:types = tsc --noEmit -p tests/types/tsconfig.json.
3. Remove tsd, the tsd package.json block and test-d/; update prepublishOnly.
4. Verify fresh clone (no dist) typecheck + test:types; run on TS 5.9.3/6.0.3/7.0.2.
5. Mutation check (one positive, one negative assertion).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: type tests live in tests/types/index.test-d.ts, import ../../src/index.ts and use expect-type 1.4.0 (pinned) plus @ts-expect-error; test:types = tsc --noEmit -p tests/types/tsconfig.json; tsd, its package.json block and test-d/ removed; prepublishOnly runs typecheck, test:types, test, build.
- Breaking change: none (dev tooling only).
- Verification (independent re-run): fresh git clone of release/v0.3.1 with no dist/ -> bun install --frozen-lockfile, bun run typecheck, bun run test:types all pass. bunx -p typescript@{5.9.3,6.0.3,7.0.2} tsc -p tests/types/tsconfig.json and tsc --noEmit: 0 errors on each.
- Assertion parity: old test-d had 41 expectType + 23 expectAssignable (64) and 5 @ts-expect-error; new file has 41 toEqualTypeOf + 23 toExtend (64) and 6 @ts-expect-error (adds the bad-template-key check at line 101).
- Mutation check: positive (line 103 toEqualTypeOf<"not_found"> -> <"suspended">) fails with TS2344; negative (line 335 ["x","x"] -> ["x","y"]) fails with TS2578 unused @ts-expect-error. Both reverted; test:types passes again.
- Quality gate: typecheck, lint, bun test (129 pass, 100% funcs / 99.89% lines), build, test:types, tsc --noEmit on TS 5.9.3 and 6.0.3 all pass. test:consumer does not exist yet (TASK-044).
- TASK-040 re-verified in the same session: no bunx tsc/tsgo or native-preview; tsconfig types [bun], no jsx/allowJs; dist layout correct and declarations byte-identical to a TS 5.9.3 build; CHANGELOG entry present.
<!-- SECTION:NOTES:END -->
