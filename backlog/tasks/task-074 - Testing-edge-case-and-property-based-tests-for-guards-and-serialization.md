---
id: TASK-074
title: 'Testing: edge-case and property-based tests for guards and serialization'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:55:00Z'
labels:
  - testing
milestone: m-2
dependencies:
  - TASK-073
documentation:
  - errorset-audit.md
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Edge cases worth pinning down, plus property-based coverage of guard and serialization invariants. Audit ref: Q6.

## Implementation
1. Example tests:
   - repeated template keys;
   - a template missing a key at runtime (untyped call);
   - a kind guard called with an array that has a `raw` property (the template-detection heuristic);
   - `includeStack` on engines without `Error.captureStackTrace` (stub it out);
   - kind tuples near the `HasDuplicates` recursion limit (record the type-check time and where it degrades).
2. Property tests with `fast-check` (pinned devDependency):
   - for random sets and kinds, a guard accepts exactly its own `(set, kind)` errors;
   - `from(JSON.parse(JSON.stringify(e)))` round-trips;
   - frozen errors reject writes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each listed edge case has a test; the HasDuplicates limit and type-check time are recorded
- [ ] #2 fast-check properties for guard precision, rehydration round-trip and immutability pass with a fixed seed in CI
- [ ] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Example tests (tests/edge-cases.test.ts): repeated template keys; a template missing a key at runtime (untyped); a kind guard called with an array that has a raw property (pin and tighten the template-detection heuristic: require a frozen strings array); includeStack with Error.captureStackTrace stubbed out; HasDuplicates near its limit (type test at a realistic size + recorded timings: <=100 kinds ~0.2 s, 500 0.52 s, 999 1.07 s, 1000 TS2589).
2. fast-check 4.10.2 pinned devDependency; property tests with a fixed seed: guard precision over random sets/kinds, from(JSON round trip), frozen errors reject writes.
3. Gate, ci-local.
<!-- SECTION:PLAN:END -->
