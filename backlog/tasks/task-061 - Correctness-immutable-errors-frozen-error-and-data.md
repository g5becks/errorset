---
id: TASK-061
title: 'Correctness: immutable errors (frozen error and data)'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - correctness
  - breaking
milestone: m-1
dependencies:
  - TASK-055
  - TASK-060
  - TASK-046
documentation:
  - errorset-audit.md
priority: medium
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`err.message = "changed"` and `err.data.id = "changed"` succeed despite the `readonly` types. Errors pass through many layers. Audit refs: A8, D6.

## Implementation
1. `Object.freeze(err)` and a shallow `Object.freeze(data)` at creation (both shapes).
2. Tests: writes throw in strict mode (ES modules are strict). Flip the A8 regression case.
3. Benchmark with `bun run bench` against `bench/baseline-0.3.0.json`: creation overhead from freezing must be < 10%. If it's over, record the measurement and discuss options (e.g. freezing only in development) before deciding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Errors and their data are frozen; writes throw (tests); A8 regression case passes
- [ ] #2 Creation overhead from freezing is < 10% vs the recorded baseline (numbers in notes)
- [ ] #3 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
