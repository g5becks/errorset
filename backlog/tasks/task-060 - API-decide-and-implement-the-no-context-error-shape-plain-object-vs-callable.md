---
id: TASK-060
title: >-
  API: decide and implement the no-context error shape (plain object vs
  callable)
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T21:00:00Z'
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
- [ ] #1 The decision and reasoning are recorded in notes and docs
- [ ] #2 If plain object: no callable errors remain, structuredClone of both shapes succeeds (tests), and an options/cause path exists
- [ ] #3 If callable kept: the structuredClone limitation is documented and tested
- [ ] #4 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Decision (b): X.kind`static message` returns a plain, branded error object; the options/cause path is a non-enumerable .with({ cause }) that returns a new error (no mutation, compatible with freezing). .with exists only on no-context errors (NoContextErr<Kind, Set> type replaces CallableErr), so the general Err type stays method-free.
2. Implement in createKindFunction with per-kind descriptors (toJSON, toString, with); remove the function path from capture's cause attachment.
3. Migrate tests (callable call syntax -> .with, typeof "object"); structuredClone round-trip tests for both shapes (data survives, brand lost: documented, from() in 0.5.0). Flip A4.
4. Docs + CHANGELOG breaking with migration; gate; bench; ci-local.
<!-- SECTION:PLAN:END -->
