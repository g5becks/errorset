---
id: TASK-067
title: 'API: variadic, set-aware merge() with recover and inspect'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:18:00Z'
labels:
  - api
milestone: m-2
dependencies:
  - TASK-064
documentation:
  - errorset-audit.md
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`merge()` takes only two sets, duplicates kinds, and the merged guard lacks kind functions, `recover` and `inspect`. Its data type degrades to `Record<string, unknown>`. Audit ref: A9.

## Implementation
1. A variadic `merge(...sets)`.
2. Membership by `(set, kind)` pairs, with no duplicates.
3. The merged guard has `recover` (exhaustive over `(set, kind)`, or with `_`) and `inspect`.
4. Data typed as a discriminated union over `set`.
5. Tests, including sets that share kind names (the merged guard accepts both, and narrows by `set`). Flip the A9 regression case.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 merge(a, b, c) works; kinds has no duplicate (set, kind) pairs; A9 regression case passes
- [ ] #2 The merged guard has recover and inspect; data narrows by set (type tests)
- [ ] #3 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first: tests/merge.test.ts (variadic, dedup, chained/method equivalence, recover by (set, kind) with shared kind names, _, inherited handler keys, untyped throw, inspect) and tests/types/merge.test-d.ts (union over set, data narrowing, exhaustive recover, bad keys).
2. merge(...guards): MergeInput (sets or merged guards), members de-duplicated by (set, kind), kinds = unique names; MergedGuard<E> with recover/inspect (handlers nested by set name then kind, own-property lookup) and merge; ErrorSet.merge variadic.
3. Flip A9; update the integration test that asserted duplicate kinds (intended behavior change); CHANGELOG Added/Changed; README merge section; LLMS regen.
4. Gate, commit, ci-local.
<!-- SECTION:PLAN:END -->
