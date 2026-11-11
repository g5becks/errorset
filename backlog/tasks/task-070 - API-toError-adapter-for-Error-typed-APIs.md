---
id: TASK-070
title: 'API: toError() adapter for Error-typed APIs'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:37:00Z'
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
- [x] #1 toError returns an Error with name '<Set>.<kind>', the message and cause set to the original (tests)
- [x] #2 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [x] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first (tests/to-error.test.ts + type test): instanceof Error, name '<Set>.<kind>', message, cause identity, both shapes, stack captured at conversion without the toError frame, original unchanged, new ordinary Error each call, throwable.
2. toError<E extends Err>(err): Error & { readonly cause: E }: new Error(message, { cause }), non-enumerable own name, Error.captureStackTrace(error, toError) when available.
3. README section + API row, CHANGELOG Added; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: toError<E extends Err>(err): Error & { readonly cause: E }. Returns a new, ordinary (not frozen) Error: name '<Set>.<kind>' (own, non-enumerable, like built-ins), the error's message, cause = the original errorset error (non-enumerable, via the ES2022 Error options), stack captured at the call site with Error.captureStackTrace(error, toError) where available. Object.keys(error) is []. Works for template and no-context errors; the original stays frozen and still passes its guards through cause. README section 'Error-Typed APIs: toError()' + API row; CHANGELOG Added. Not breaking.
- Tests: tests/to-error.test.ts (6) + type tests (cause typed as the exact error; plain Error rejected). The stack test asserts the header and that the toError frame is excluded rather than the caller's name, because Bun (JSC) elides small caller frames while Node keeps them (checked on both).
- Bun 1.3.14 finding: the first ci-local run on cc273a6 FAILED on both Bun 1.3.14 legs (macOS and Linux): Error.captureStackTrace makes stack an own enumerable property there (Bun 1.4.4 and Node do not), so Object.keys(error) was ['stack']. Fixed forward in 9ffc4b0 by redefining stack as non-enumerable after capture; verified with bunx bun@1.3.14 test.
- Benchmarks: toError is not on the creation path.
- Verified with scripts/ci-local.sh (9ffc4b0, PASS); the earlier run on cc273a6 failed as described. GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
