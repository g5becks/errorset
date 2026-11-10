---
id: TASK-056
title: 'Types: exhaustive recover() (all kinds or a required _ catch-all)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T20:08:00Z'
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
- [ ] #1 Type tests: recover with {} or a partial map without _ fails to compile; a full map or partial + _ compiles; unknown keys fail
- [ ] #2 The runtime fallback throw is unreachable from typed code (documented, and tested via an untyped call)
- [ ] #3 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. RecoverHandlers = union of (all kinds required, `_` optional) | (partial kinds, `_` required): {} and partial-without-_ fail, full map or partial+_ compile, unknown keys fail (excess property check). Overloads only if the union cannot infer R.
2. Type tests for each case; flip A10 regression to test (type-level).
3. Runtime: keep the throw as a defensive branch with a clearer message; runtime test reaching it via an untyped (as never) call. Fix existing tests that used partial maps without _.
4. README: recovery is exhaustive; CHANGELOG breaking entry; gate; ci-local.
<!-- SECTION:PLAN:END -->
