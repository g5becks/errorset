---
id: TASK-074
title: 'Testing: edge-case and property-based tests for guards and serialization'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T04:02:00Z'
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
- [x] #1 Each listed edge case has a test; the HasDuplicates limit and type-check time are recorded
- [x] #2 fast-check properties for guard precision, rehydration round-trip and immutability pass with a fixed seed in CI
- [x] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Example tests (tests/edge-cases.test.ts): repeated template keys; a template missing a key at runtime (untyped); a kind guard called with an array that has a raw property (pin and tighten the template-detection heuristic: require a frozen strings array); includeStack with Error.captureStackTrace stubbed out; HasDuplicates near its limit (type test at a realistic size + recorded timings: <=100 kinds ~0.2 s, 500 0.52 s, 999 1.07 s, 1000 TS2589).
2. fast-check 4.10.2 pinned devDependency; property tests with a fixed seed: guard precision over random sets/kinds, from(JSON round trip), frozen errors reject writes.
3. Gate, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Edge cases (tests/edge-cases.test.ts, 8 tests): repeated template keys (each hole renders, data stores the key once); a key missing from the entity at runtime via an untyped call (message renders 'undefined', data has the key with an undefined value, dropped by JSON); a kind guard called with an array that has a raw property; guards stay guards after templates were seen; includeStack with Error.captureStackTrace deleted (no stack, no throw, same keys) and Error.stackTraceLimit restored after capture.
- Bug found and fixed: UserError.a(arrayWithRaw) was treated as a tagged-template call and returned a truthy error object instead of false. Detection now also requires the strings array to be frozen (every real TemplateStringsArray is). Object.isFrozen on arrays is slow in JSC (a first version took template creation 57 -> 127 ns), so the full check runs only for unseen call sites: per-kind last-seen caches (initialized to a private frozen sentinel so no caller value can match) short-circuit it; the no-context call site also caches its joined message. Result: template 58.8 ns (unchanged), no-context 34.3 -> 25.1 ns. A deliberately frozen look-alike is still treated as a template (pinned by a test, documented in CHANGELOG Fixed).
- HasDuplicates limit (TypeScript 7.0.2, tsc --extendedDiagnostics, one errorSet call with N literal kinds): N<=100 ~0.2 s check time (~129k instantiations at 100), 200 0.32 s, 500 0.52 s (378k), 600 0.46 s, 700 0.63 s, 800 0.78 s, 900 0.96 s, 999 1.07 s; N=1000 fails with TS2589 'Type instantiation is excessively deep and possibly infinite' (+ TS2769) after 3.8 s (1.14M instantiations): TypeScript's tail-recursion limit. Pinned by tests/types/large-sets.test-d.ts (200 kinds compile with literal kinds; a duplicate at the end of 200 is detected). test:types still runs in ~0.15 s.
- Properties (tests/properties.test.ts, fast-check 4.10.2 pinned exact as a devDependency, fixed seed 20261110, 150 runs each): set and kind guards accept exactly their own (set, kind) errors across 2-4 random sets sharing kind names; a merged guard over a random subset accepts exactly those sets' errors; from(JSON round trip) restores guard behavior, JSON, String, key order and frozenness for random entities/templates; from(structuredClone) keeps kind-guard precision; writes, additions and deletions on errors and data throw/fail for random fields and values. Mutation check: removing the set-name comparison from the single-set guard makes the precision property fail with a shrunk counterexample [[['f','a'],['a']]] (then restored).
- 333 tests, 100% coverage. Not breaking (the guard fix makes a buggy truthy return false).
- Verified with scripts/ci-local.sh (f359aab, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
