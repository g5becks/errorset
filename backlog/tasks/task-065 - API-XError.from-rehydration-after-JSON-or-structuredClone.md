---
id: TASK-065
title: 'API: XError.from() rehydration after JSON or structuredClone'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:13:00Z'
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
The brand is a symbol key, so errors that cross JSON, `structuredClone`, workers or HTTP become plain objects that no guard recognizes. Audit ref: A5.

## Implementation
1. `XError.from(value: unknown): XError | undefined`. It validates `{ set, kind, message, data }` (with `set === X.name` and `kind` in the set; `data` an object; optional `cause` and `timestamp`), then re-brands and freezes. It returns `undefined` for anything that doesn't match.
2. A top-level `fromJSON`/`rehydrate` helper is optional; record the decision.
3. Tests: JSON and `structuredClone` round-trips for every shape; wrong set; wrong kind; missing fields; extra fields (ignored or rejected; document which); nested cause. Flip the A5 regression case.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 XError.from returns a branded, frozen error for valid input of that set and undefined otherwise (tests for each listed case)
- [x] #2 JSON and structuredClone round-trips recover full guard behavior; A5 regression case passes
- [x] #3 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Kind functions register an internal rehydrator (WeakMap keyed by kind function, so no new own properties) that rebuilds an error with the created shape and descriptors; empty data -> no-context shape with .with() and EMPTY_DATA.
2. ErrorSet.from(value): validate object, set === name, kind in the set (Map lookup, so inherited names fail), message string, data plain non-array object, timestamp number if present; live errors of the set returned unchanged; extra fields ignored; cause kept as-is.
3. Tests first (tests/rehydration.test.ts) + type test; flip A5; README section, API row, CHANGELOG Added; regenerate LLMS.txt.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: XError.from(value): Err<Kinds, Partial<T>, N> | undefined. Rebuilds a frozen, branded error with the same key order, toJSON/toString/inspect as a created one; empty data rehydrates to the no-context shape (EMPTY_DATA + .with()). JSON and structuredClone round-trips for both shapes recover set guard, kind guard, instanceof and isErr, with identical JSON and String output (tests). A5 regression case flipped to test; 1 test.failing left (A9, TASK-067).
- Decisions: extra fields are ignored (dropped), not rejected, so a JSON body with stack or other fields still parses; timestamp is kept from the input (config is not re-applied) and no stack is captured; cause is kept as-is (not rehydrated: its set is unknown; use CauseSet.from(err.cause)); a live error of the set is returned unchanged; no top-level fromJSON/rehydrate helper, because validation needs the set's kinds and a global name registry would reintroduce the duplicate-name ambiguity. Edge: a template error whose data values were all undefined loses them in JSON and rehydrates to the no-context shape (same JSON output).
- Not breaking (from was already reserved in 0.4.0). Rejection tests: wrong set (same kind name), unknown kind, inherited name (toString), each missing field, non-string message, null/array/string data, non-number timestamp, non-object inputs, another set's live error.
- Tests 266 pass; gate passes (TS 5.9.3/6.0.3/7.0.2). Coverage stayed above the thresholds but the rehydrated inspect hook was uncovered (types.ts funcs 98.11%); a follow-up test commit restores 100% and is covered by the next ci-local run.
- Benchmarks: from() is not on the creation path; init registers one WeakMap entry per kind.
- Verified with scripts/ci-local.sh (8745f2c, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
