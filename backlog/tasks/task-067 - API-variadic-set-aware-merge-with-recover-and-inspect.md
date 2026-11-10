---
id: TASK-067
title: 'API: variadic, set-aware merge() with recover and inspect'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
