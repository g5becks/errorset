---
id: task-022
title: Write unit tests for error creation
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
Create comprehensive tests for error creation using template literals, covering field extraction and message formatting.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify ERR symbol is set on created errors
- [ ] #2 Tests verify kind property matches
- [ ] #3 Tests verify message formatting with interpolation
- [ ] #4 Tests verify data extraction from template holes
- [ ] #5 Tests verify empty template handling
- [ ] #6 Tests verify cause option support
- [ ] #7 All tests pass with bun test
- [ ] #8 Coverage for error creation reaches 100%
- [ ] #9 bun run typecheck passes with no errors
<!-- AC:END -->
