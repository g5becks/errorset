---
id: task-028
title: Write unit tests for isErr helper
status: To Do
assignee: []
created_date: '2026-01-05 15:41'
labels:
  - testing
  - unit
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create comprehensive tests for the isErr() helper function covering all edge cases.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify returns true for errors with ERR symbol
- [ ] #2 Tests verify returns false for null and undefined
- [ ] #3 Tests verify returns false for plain objects
- [ ] #4 Tests verify returns false for objects with kind but no ERR
- [ ] #5 Tests verify type narrowing works correctly
- [ ] #6 All tests pass with bun test
- [ ] #7 Coverage for isErr reaches 100%
- [ ] #8 bun run typecheck passes with no errors
<!-- AC:END -->
