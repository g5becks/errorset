---
id: TASK-058
title: >-
  Errors: cause accepts any value and capture/captureAsync preserve the original
  exception
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T20:21:00Z'
labels:
  - api
  - breaking
milestone: m-1
dependencies:
  - TASK-053
documentation:
  - errorset-audit.md
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`ErrorOptions.cause` is typed as an errorset error, so passing a native `Error` is TS2739. `capture`/`captureAsync` never attach the caught exception, so stacks, `code`, `errno` and nested causes are lost (agentx's StrataDB error mapping loses `SQLiteError` details). Non-`Error` throws become `"[object Object]"`. Audit ref: A6.

## Implementation
1. `cause?: unknown` (ES2022 semantics) on both error shapes.
2. `capture`/`captureAsync` attach the caught value as `cause` by default. If the mapper's result already has a cause, keep it.
3. Non-`Error` throws: keep the original value as `cause`, and build the message with a safe renderer (JSON with a cycle guard, falling back to `Bun.inspect`/`util.inspect`), not `String(x)`.
4. Tests: a sync throw, an async rejection, a sync throw inside an async function, a thrown `Error` subclass with `code`, a thrown plain object, a thrown string. Flip the A6 regression case.
5. toJSON: serialize a native `Error` cause as `{ name, message, code? }` without stacks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 cause accepts unknown (native Error passes type-check); type tests updated
- [ ] #2 capture and captureAsync attach the caught value as cause by default, including non-Error throws, with a readable message (tests for all listed cases)
- [ ] #3 A6 regression case passes
- [ ] #4 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Types: ErrorOptions.cause and Err.cause become unknown (ES2022 semantics); callers narrow with isErr/guards.
2. capture/captureAsync: call the mapper with an Error (non-Error throws wrapped with a safely rendered message: strings as-is, objects as JSON with a cycle guard and bigint support, else the Object.prototype.toString tag); if the mapped error has no cause, return it with the original thrown value as cause (callable errors: call with { cause }; object errors: copy with all descriptors + cause, no mutation so TASK-061 freezing works); keep a cause the mapper set.
3. toJSON: native Error cause -> { name, message, code? } (no stack).
4. Tests: sync throw, async rejection, sync throw inside an async fn, Error subclass with code (+ toJSON code), plain object, string, cyclic object, mapper-provided cause kept, callable mapper result. Flip A6. Type tests: native Error cause compiles.
5. CHANGELOG breaking + docs; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- RESUME STATE (session hit its usage limit): code committed at HEAD (fix(errors)! TASK-058). Strict gate passed (214 tests, 100% coverage; 6 test.failing remain: A4, A5, A8 x2, A9, A11). Remaining for this task: run `bash scripts/ci-local.sh HEAD`, then check ACs 1-5, add full notes (tests in tests/capture-cause.test.ts; tests/support/err-cause.ts helper narrows cause in migrated tests; renderThrown uses JSON+cycle guard with Object.prototype.toString fallback instead of util.inspect to keep the bundle free of runtime imports), set Done.
<!-- SECTION:NOTES:END -->
