---
id: TASK-068
title: 'Types: optional per-kind data keys for exact data narrowing'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - types
milestone: m-2
dependencies:
  - TASK-064
documentation:
  - errorset-audit.md
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Kind guards narrow `data` to `Partial<T>` because the guard can't know which template keys a kind uses. That pushes consumers toward non-null assertions. Audit ref: A14.

## Implementation
Add an additive overload: `errorSet(name, { not_found: ["id"], suspended: ["id", "reason"] })`. Kind guards then narrow `data` to exactly those keys. The array form keeps working unchanged. Templates for a declared kind may only use its declared keys (type error otherwise). Type and runtime tests for both forms.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The object form narrows data exactly in kind guards; undeclared template keys fail to compile (type tests)
- [ ] #2 The array form is unchanged (existing tests pass)
- [ ] #3 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
