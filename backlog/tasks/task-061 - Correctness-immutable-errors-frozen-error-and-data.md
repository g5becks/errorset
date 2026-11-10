---
id: TASK-061
title: 'Correctness: immutable errors (frozen error and data)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T21:16:00Z'
labels:
  - blocked
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
- [x] #1 Errors and their data are frozen; writes throw (tests); A8 regression case passes
- [ ] #2 Creation overhead from freezing is < 10% vs the recorded baseline (numbers in notes)
- [x] #3 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Freeze every error at creation after creation options are applied (Object.freeze(err)) and its data shallowly (Object.freeze(data)), for template and no-context errors; capture's cause-attaching copy is frozen too (data is already frozen and shared).
2. Tests: writes to message, data fields, new keys and deletes throw TypeError (ES modules are strict); with()/capture still work on frozen errors; flip both A8 cases.
3. Benchmark A/B on the same code with and without freezing (bench --runs 3); criterion: freeze overhead < 10% of the 0.3.0 baseline creation time (107.4 ns -> < 10.7 ns); record numbers.
4. CHANGELOG breaking; docs; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- STATUS: BLOCKED on AC #2 (performance budget); implementation committed at 5774129, all other checks pass. Needs a maintainer decision (options below).
- Outcome: every error (template, no-context, with(), capture copy) is Object.freeze()d after creation options are applied; template data is shallow-frozen; no-context errors share one frozen EMPTY_DATA object. Writes/adds throw TypeError (strict-mode ESM), Reflect.deleteProperty returns false; timestamp/stack are frozen too; nested values inside data and the caller's entity are not frozen. Both A8 regression cases flipped to test; tests/immutability.test.ts (7 tests). 227 tests, 100% coverage; 2 test.failing remain (A5, A9: both v0.5.0). Gate passes. CHANGELOG breaking entry added.
- Measurements (Bun 1.4.4, Apple M5; interleaved A/B, 5 child processes per side, same code with and without the freeze calls; budget = 10% of bench/baseline-0.3.0.json):
  - create_template_2keys: 161.8 -> 176.8 ns, freeze delta 14.5 ns = 13.5% of the 107.4 ns baseline (9.0% of the current pre-freeze time). OVER the 10.7 ns budget.
  - create_callable_no_context: 138.8 -> 146.3 ns, delta 7.3 ns = 6.0% of the 121.6 ns baseline. Within budget (after sharing a frozen empty data object; first attempt was +15.3 ns = 12.6%).
- Attempts: (1) plain freeze of error + data: +13.8/+15.3 ns; (2) shared frozen EMPTY_DATA for no-context errors: fixes no-context, template unchanged; (3) moving the per-error [INSPECT] closure into shared descriptors was reverted because existing tests call the inspect hook detached (no `this`). A standalone probe shows Object.freeze costs about 6-9 ns per object regardless of own-property count (5 own: +6.2, 8 own: +6.3, methods on a prototype: +5.8), so a template error (error + data = 2 objects) has a floor of about 12-15 ns. The audit's premise ("freezing is typically a few ns") does not hold, and TASK-071's shared prototype would not fix it.
- Options for the maintainer: (a) accept ~+14 ns (13.5% of the old baseline, 9% of current creation) and relax AC #2; (b) freeze only the error, not data (meets the budget but A8 data writes would succeed: conflicts with AC #1); (c) freeze only in development (e.g. NODE_ENV !== "production"): meets the production budget but behavior differs by environment; (d) defer freezing to a later release. Recommendation: (a): immutability is the point of A8 and the absolute cost is ~14 ns per error.
- Per the run rules, v0.4.0 is not released while this task is blocked.

- ci-local: the freeze commit is covered by Verified with scripts/ci-local.sh (5e4d353, PASS); AC #4 is not checked while the task is blocked (it must be re-run after the maintainer's decision lands).
<!-- SECTION:NOTES:END -->
