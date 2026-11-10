---
id: TASK-047
title: 'API: toJSON and toString on both error shapes (non-breaking)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:07:00Z'
labels:
  - api
milestone: m-0
dependencies:
  - TASK-042
documentation:
  - errorset-audit.md
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
The no-context callable error is a **function**: `JSON.stringify({ error })` → `{}`, so errors vanish from logs and HTTP responses. Errors also have no `name`, and `String(err)` is `[object Object]`. Audit refs: A4 (option a, non-breaking), A7.

## Implementation
1. Write the regression tests first: JSON output of both error shapes (template and callable), `String(err)`, and `JSON.stringify({ error })` nesting.
2. Define a non-enumerable `toJSON()` on both shapes, returning `{ kind, message, data, cause? }` (and `timestamp` when set). `cause` serializes recursively through its own `toJSON` when it's an errorset error; for a native `Error`, serialize `{ name, message }`.
3. Define a non-enumerable `toString()` returning `"<SetName>.<kind>: <message>"`.
4. Don't add enumerable fields, so object keys and existing deep-equality tests stay unchanged.
5. Document both in the README ("Serialization and logging").
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 JSON.stringify(err) and JSON.stringify({ error: err }) produce { kind, message, data, cause? } for template and callable errors
- [x] #2 String(err) returns '<SetName>.<kind>: <message>' for both shapes
- [x] #3 Object.keys(err) is unchanged (toJSON and toString are non-enumerable); existing tests still pass unmodified
- [x] #4 README documents serialization and logging
- [x] #5 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [x] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first (tests/serialization.test.ts): JSON of both shapes, nesting, errorset and native-Error causes, called callable, String(err), Object.keys and non-enumerability.
2. Shared errToJSON (module level) + per-kind toString ("<Set>.<kind>: <message>"), applied with Object.defineProperties using per-kind precomputed descriptors at all 3 creation sites.
3. README "Serialization and Logging" + API table row; CHANGELOG.
4. Gate, bench, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: non-enumerable toJSON and toString on template errors, callable no-context errors (the function itself) and the errors a callable returns. toJSON -> { kind, message, data, cause?, timestamp? }; errorset causes serialize recursively via their own toJSON; native Error causes -> { name, message }. toString -> "<SetName>.<kind>: <message>". errToJSON is a single module-level function; toString and the descriptor map are built once per kind (no per-error closures).
- Tests first: tests/serialization.test.ts (9 tests); 7 failed before the change and all pass after. Existing test files are unmodified; bun test 138 pass (129 + 9). Object.keys stays ["kind","message","data"] (+ "cause"); descriptors are non-enumerable.
- timestamp: included when present, but nothing sets it until TASK-048 (includeTimestamp), so that branch (src/types.ts) is uncovered for now; line coverage 99.79% (threshold 99%). ErrJSON stays internal (no new public type).
- Benchmark (median of 3, ns/op; baseline 0.3.0): create_template_2keys 160.8 (107.4), create_callable_no_context 179.5 (121.6); guards unchanged. Object.defineProperties on fresh objects is the cost; precomputed per-kind descriptors saved about 8 ns. Recovering the rest needs a shared prototype, which is TASK-071 (budget <= 60 ns); recorded in the CHANGELOG.
- Docs: README "Serialization and Logging" section and an API table row; CHANGELOG Added entry.
- Verification: strict gate passes. Verified with scripts/ci-local.sh (927a51a, PASS); GitHub Actions unavailable (billing lock).
- Breaking change: none.
<!-- SECTION:NOTES:END -->
