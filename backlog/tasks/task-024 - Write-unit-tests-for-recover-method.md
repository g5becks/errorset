---
id: task-024
title: Write unit tests for recover method
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
Create comprehensive tests for the recover() helper method covering all handler scenarios.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify success value is returned unchanged
- [ ] #2 Tests verify catch-all handler is applied for any error
- [ ] #3 Tests verify specific handlers are applied for matching kinds
- [ ] #4 Tests verify error is thrown when no matching handler
- [ ] #5 Tests verify return type is correct
- [ ] #6 All tests pass with bun test
- [ ] #7 Coverage for recover reaches 100%
- [ ] #8 bun run typecheck passes with no errors
<!-- AC:END -->
