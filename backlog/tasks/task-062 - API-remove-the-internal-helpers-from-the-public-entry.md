---
id: TASK-062
title: 'API: remove the internal helpers from the public entry'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T21:16:00Z'
labels:
  - api
  - breaking
milestone: m-1
dependencies:
  - TASK-053
documentation:
  - errorset-audit.md
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
The internal helpers were deprecated in 0.3.1. Audit refs: C1, P3.

## Implementation
Remove `createKindFunction`, `createSetGuard` and `createSetGuardWithKinds` from `src/index.ts`. (If anything legitimately needs them, expose them under an `./internal` subpath export marked unstable; record the decision.) Update the type test from 0.3.1, which asserted they're exported, so it asserts they're absent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The three helpers are not exported from the package root (type test); any ./internal subpath decision is recorded
- [x] #2 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [x] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove createKindFunction, createSetGuard, createSetGuardWithKinds from src/index.ts. Decision: no ./internal subpath (nothing outside the library needs them); they stay exported from the internal src/types.ts module, which the package exports map does not expose.
2. Replace their @deprecated JSDoc with plain @internal.
3. Tests that unit-test them import from ../src/types.ts; flip the 0.3.1 type test to assert absence; runtime test that the entry's exports exclude them; consumer smoke still passes.
4. CHANGELOG breaking; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: createKindFunction, createSetGuard and createSetGuardWithKinds are no longer exported from src/index.ts (the package entry); their @deprecated JSDoc became plain @internal. They remain exported from the internal module src/types.ts, which the package exports map ("." and "./package.json" only) does not expose.
- Decision: no ./internal subpath: nothing outside the library needs them; errorSet().init() and merge() cover every use.
- Tests: tests/types/deprecated-exports.test-d.ts renamed to internal-helpers.test-d.ts and flipped to assert the entry type has no such properties (and still has errorSet); mutation: re-exporting createSetGuard makes test:types fail. Runtime test (tests/types.test.ts "public entry") asserts the module keys exclude them. helpers.test.ts and set-identity.test.ts import the helper from ../src/types.ts for their unit tests. 228 tests, 100% coverage. Consumer smoke passes.
- CHANGELOG ### Breaking changes entry with migration; README/LLMS.txt/CONTRIBUTING have no mentions.
- Breaking change: yes; the three helpers are no longer importable from the package.
- Verification: strict gate passes. Verified with scripts/ci-local.sh (5e4d353, PASS; this run also covers the TASK-061 freeze commit 5774129); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
