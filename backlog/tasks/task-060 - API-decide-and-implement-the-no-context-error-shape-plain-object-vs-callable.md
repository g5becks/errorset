---
id: TASK-060
title: >-
  API: decide and implement the no-context error shape (plain object vs
  callable)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T21:06:00Z'
labels:
  - api
  - breaking
milestone: m-1
dependencies:
  - TASK-055
  - TASK-058
documentation:
  - errorset-audit.md
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
The no-context callable form is a function: `structuredClone` throws `DataCloneError`, so it can't cross workers, IPC or `postMessage`. 0.3.1 added `toJSON` (A4a). Audit ref: A4 (option b).

## Implementation
1. Decide between:
   - **(a)** keep the callable form;
   - **(b) recommended:** make ``X.kind`static message` `` return a plain error object, and offer `X.kind`msg`.with({ cause })` or a separate creator for options.

   Record the decision with the reasoning.
2. If (b): implement it, update the types (no callable signature), migrate all tests, and add `structuredClone` round-trip tests for both shapes (the brand symbol is lost in a clone, so document that `XError.from()` in 0.5.0 restores it). Flip the A4 regression case.
3. If (a): document the `structuredClone` limitation prominently and convert the A4 case into a documented-behavior test.
4. Migration notes for either outcome.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The decision and reasoning are recorded in notes and docs
- [x] #2 If plain object: no callable errors remain, structuredClone of both shapes succeeds (tests), and an options/cause path exists
- [ ] #3 If callable kept: the structuredClone limitation is documented and tested
- [x] #4 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Decision (b): X.kind`static message` returns a plain, branded error object; the options/cause path is a non-enumerable .with({ cause }) that returns a new error (no mutation, compatible with freezing). .with exists only on no-context errors (NoContextErr<Kind, Set> type replaces CallableErr), so the general Err type stays method-free.
2. Implement in createKindFunction with per-kind descriptors (toJSON, toString, with); remove the function path from capture's cause attachment.
3. Migrate tests (callable call syntax -> .with, typeof "object"); structuredClone round-trip tests for both shapes (data survives, brand lost: documented, from() in 0.5.0). Flip A4.
4. Docs + CHANGELOG breaking with migration; gate; bench; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Decision: option (b), plain object. Reasoning: a function can never cross a structured-clone boundary (workers, postMessage, IPC), and two error shapes made consumers handle both (typeof checks, JSON special cases); (a) would only document the limitation. AC #3 (callable kept) does not apply and is left unchecked.
- Outcome: X.kind`message` returns a plain branded error object (type NoContextErr<Kind, Set>, replacing CallableErr in the exports). Options go through a non-enumerable with(options) that returns a new error with the same set/kind/message (fresh timestamp/stack per creation config) plus the cause; the original is unchanged, so this works with frozen errors (TASK-061). with lives in a per-kind descriptor map next to toJSON/toString (no per-error closures). capture no longer needs a function path. hasBrand accepts only objects now.
- Tests: A4 [TASK-060] flipped to test (structuredClone succeeds). New tests/no-context.test.ts (6): plain object with keys set/kind/message/data, new error per evaluation, with() returns a new error and leaves the original unchanged, with() is non-enumerable, chains and applies timestamps, structuredClone of both shapes keeps set/kind/message/data/cause while the brand is not cloned (isErr false, documented: from() in 0.5.0), JSON of nested no-context error. Migrated call sites (intended API change): 11 `X.kind`msg`(opts)`/`()` calls -> `.with(opts)`/`.with({})`; error-set test asserting typeof "function" now asserts "object"; type tests rewritten for NoContextErr (exact type, with() type, @ts-expect-error on calling it, guards). 220 tests, 100% coverage; 4 test.failing remain (A5, A8 x2, A9).
- Benchmark (median of 3): create_callable_no_context 141.5 ns (198.9 before: one object instead of a function with 6 defineProperty calls); template creation unchanged (162.6).
- Docs: README no-context section (plain objects, with(), structuredClone note), API table; LLMS.txt signature/returns/examples/exports; CHANGELOG ### Breaking changes entry with the decision and migration.
- Breaking change: yes. X.kind`msg`({ cause }) -> X.kind`msg`.with({ cause }); CallableErr -> NoContextErr; typeof is "object".
- Verification: strict gate passes. Verified with scripts/ci-local.sh (b14184d, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
