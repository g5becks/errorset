---
id: TASK-056
title: 'Types: exhaustive recover() (all kinds or a required _ catch-all)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T20:12:00Z'
labels:
  - types
  - breaking
milestone: m-1
dependencies:
  - TASK-053
documentation:
  - errorset-audit.md
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`RecoverHandlers` makes every handler optional, so `recover(r, {})` type-checks, then throws `Error("No handler found…")` at runtime. That's a thrown exception from a library meant to eliminate them. Audit ref: A10.

## Implementation
1. Two overloads: (1) all kinds required when there's no `_`; (2) a partial map plus a required `_` catch-all.
2. Type tests: `{}` fails; a partial map without `_` fails; a full map compiles; partial plus `_` compiles; an extra unknown kind key fails.
3. Keep the runtime throw only as a defensive branch, with a clearer message. Flip the A10 runtime regression case to a type-level guarantee and keep a runtime test that uses `as never` to reach the branch.
4. README: describe recovery as exhaustive.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Type tests: recover with {} or a partial map without _ fails to compile; a full map or partial + _ compiles; unknown keys fail
- [x] #2 The runtime fallback throw is unreachable from typed code (documented, and tested via an untyped call)
- [x] #3 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. RecoverHandlers = union of (all kinds required, `_` optional) | (partial kinds, `_` required): {} and partial-without-_ fail, full map or partial+_ compile, unknown keys fail (excess property check). Overloads only if the union cannot infer R.
2. Type tests for each case; flip A10 regression to test (type-level).
3. Runtime: keep the throw as a defensive branch with a clearer message; runtime test reaching it via an untyped (as never) call. Fix existing tests that used partial maps without _.
4. README: recovery is exhaustive; CHANGELOG breaking entry; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: RecoverHandlers is a union: ({ every kind required } & { _?: catch-all }) | ({ kinds optional } & { _: catch-all required }). Decision: a union type instead of two overloads: same guarantees, one signature for the standalone recover() and the ErrorSet method, R still inferred (tests check the result types), and excess-property checks still reject unknown kind keys.
- Type tests (tests/types/index.test-d.ts): full map compiles (result string); partial + _ compiles (string | number); _ only compiles; full + _ compiles; @ts-expect-error for {}, partial without _, unknown key "refunded" next to all kinds, unknown key "chargeback" next to _. Mutation: restoring the old optional-everything type gives 4 test:types errors and the A10 case fails.
- Runtime: handler lookup is byKind[kind] ?? byKind._; the throw is a documented defensive branch for untyped callers with message `errorset: recover() has no handler for "<Set>.<kind>". Handle every kind of the set or provide a "_" catch-all handler.` Runtime test reaches it via `incomplete as never`.
- Regression: A10 flipped to test; it now computes the expected probe line numbers from the body (the old hard-coded lines were off by one and never validated while test.failing) and asserts exactly 2 tsc errors (the {} and partial calls). 8 test.failing remain (A3, A4, A5, A6, A8 x2, A9, A11 format/colors).
- Existing tests: helpers.test.ts "should throw if no matching handler found" became "should throw if an untyped call has no matching handler" (same assertion via `as never`, regex updated to the new message); "should pass error to handler" gained the missing suspended handler (assertion unchanged).
- Docs: README notes recovery is exhaustive; LLMS.txt recover signature/behavior; CHANGELOG ### Breaking changes entry with migration.
- Benchmark: guards unchanged (2-kind 6.8, 40-kind 44.9, non-error 5.8 ns).
- Breaking change: yes; non-exhaustive recover calls no longer compile; the runtime error message changed.
- Verification: strict gate passes (170 tests, 100% funcs/lines). Verified with scripts/ci-local.sh (e40b9d5, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
