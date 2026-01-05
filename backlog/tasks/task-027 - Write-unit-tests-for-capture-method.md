---
id: task-027
title: Write unit tests for capture method
status: Done
assignee: []
created_date: '2026-01-05 15:41'
updated_date: '2026-01-05 16:33'
labels:
  - testing
  - unit
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create comprehensive tests for the capture() method covering both sync and async error wrapping.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify success value is returned for sync functions
- [ ] #2 Tests verify thrown errors are caught and mapped for sync
- [ ] #3 Tests verify async functions return promises
- [ ] #4 Tests verify rejected promises are caught and mapped
- [ ] #5 Tests verify non-Error throws are converted to Error
- [ ] #6 Tests verify return types are correct
- [ ] #7 All tests pass with bun test
- [ ] #8 Coverage for capture reaches 100%
- [ ] #9 bun run typecheck passes with no errors
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
captureSync() and captureAsync() fully tested in helpers.test.ts: error wrapping, success pass-through
<!-- SECTION:NOTES:END -->
