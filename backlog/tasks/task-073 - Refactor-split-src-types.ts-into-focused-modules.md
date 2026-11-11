---
id: TASK-073
title: 'Refactor: split src/types.ts into focused modules'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:50:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Baseline: API report of every src/index.ts export with its emitted declaration text (typescript@5.9.3 API in the scratchpad), test results, coverage, benchmarks.
2. Split src/types.ts mechanically with a TS-API splitter: statements move verbatim with leading comments into brand, types, serialization, kind, guards, helpers, merge, set (each <= ~400 lines, acyclic); imports computed; internal names used across modules exported (index.ts re-exports only the public names). Update the two tests that import createSetGuardWithKinds from src/types.ts.
3. Verify: API report identical, tests/coverage identical, benchmarks within noise, build/consumer smoke, ci-local.
<!-- SECTION:PLAN:END -->
