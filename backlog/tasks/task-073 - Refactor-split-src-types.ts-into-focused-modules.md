---
id: TASK-073
title: 'Refactor: split src/types.ts into focused modules'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - refactor
milestone: m-2
dependencies:
  - TASK-065
  - TASK-066
  - TASK-067
  - TASK-068
  - TASK-069
  - TASK-070
  - TASK-071
  - TASK-072
documentation:
  - errorset-audit.md
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`src/types.ts` (~1,100 lines) mixes types, runtime and helpers. Audit ref: C2. Do this after the behavior changes, to avoid conflicts.

## Implementation
Split into `brand.ts`, `kind.ts`, `set.ts`, `helpers.ts` (recover/inspect/merge/capture), `serialization.ts` and `types.ts`. Keep `src/index.ts` as the only public entry. No behavior change: identical test results, coverage thresholds held, benchmarks within noise, and an unchanged `dist/index.d.ts` public surface (diff the API report, e.g. with `tsc --declaration` output or api-extractor-style listing).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No source file exceeds ~400 lines; src/index.ts is the only entry
- [ ] #2 Public declaration surface unchanged (diff recorded); tests, coverage and benchmarks unchanged within noise
- [ ] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
