---
id: TASK-070
title: 'API: toError() adapter for Error-typed APIs'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:30:00Z'
labels:
  - api
milestone: m-2
dependencies:
  - TASK-064
documentation:
  - errorset-audit.md
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Errors are data, not `Error` instances, but loggers, APMs and reporters key off `name`/`message`/`stack`. Audit ref: A7.

## Implementation
Add `toError(err): Error`, which returns a real `Error` with `name = "<Set>.<kind>"`, `message`, and `cause: err` (with `stack` captured at conversion time). Document it for logger/APM interop. Tests: `instanceof Error`, name, message, cause identity; works for both shapes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 toError returns an Error with name '<Set>.<kind>', the message and cause set to the original (tests)
- [ ] #2 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first (tests/to-error.test.ts + type test): instanceof Error, name '<Set>.<kind>', message, cause identity, both shapes, stack captured at conversion without the toError frame, original unchanged, new ordinary Error each call, throwable.
2. toError<E extends Err>(err): Error & { readonly cause: E }: new Error(message, { cause }), non-enumerable own name, Error.captureStackTrace(error, toError) when available.
3. README section + API row, CHANGELOG Added; gate; ci-local.
<!-- SECTION:PLAN:END -->
