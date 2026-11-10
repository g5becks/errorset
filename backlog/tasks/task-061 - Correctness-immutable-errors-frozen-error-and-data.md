---
id: TASK-061
title: 'Correctness: immutable errors (frozen error and data)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T21:06:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Freeze every error at creation after creation options are applied (Object.freeze(err)) and its data shallowly (Object.freeze(data)), for template and no-context errors; capture's cause-attaching copy is frozen too (data is already frozen and shared).
2. Tests: writes to message, data fields, new keys and deletes throw TypeError (ES modules are strict); with()/capture still work on frozen errors; flip both A8 cases.
3. Benchmark A/B on the same code with and without freezing (bench --runs 3); criterion: freeze overhead < 10% of the 0.3.0 baseline creation time (107.4 ns -> < 10.7 ns); record numbers.
4. CHANGELOG breaking; docs; gate; ci-local.
<!-- SECTION:PLAN:END -->
