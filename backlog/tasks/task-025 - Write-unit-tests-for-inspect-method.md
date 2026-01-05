---
id: task-025
title: Write unit tests for inspect method
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
Create comprehensive tests for the inspect() helper method covering side-effect behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify no action for success values
- [ ] #2 Tests verify handler is called for matching kind
- [ ] #3 Tests verify handler is not called for non-matching kinds
- [ ] #4 Tests verify multiple handlers work correctly
- [ ] #5 Tests verify return value is void
- [ ] #6 All tests pass with bun test
- [ ] #7 Coverage for inspect reaches 100%
- [ ] #8 bun run typecheck passes with no errors
<!-- AC:END -->
