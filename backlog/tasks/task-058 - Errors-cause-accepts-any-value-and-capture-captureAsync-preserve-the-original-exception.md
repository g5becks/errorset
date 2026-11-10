---
id: TASK-058
title: >-
  Errors: cause accepts any value and capture/captureAsync preserve the original
  exception
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
