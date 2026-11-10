---
id: TASK-070
title: 'API: toError() adapter for Error-typed APIs'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
