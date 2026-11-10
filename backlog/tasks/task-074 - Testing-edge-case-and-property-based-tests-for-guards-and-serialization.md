---
id: TASK-074
title: 'Testing: edge-case and property-based tests for guards and serialization'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
