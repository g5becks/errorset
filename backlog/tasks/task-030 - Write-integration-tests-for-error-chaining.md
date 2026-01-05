---
id: task-030
title: Write integration tests for error chaining
status: To Do
assignee: []
created_date: '2026-01-05 15:41'
labels:
  - testing
  - integration
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create integration tests that verify error chaining with cause property works correctly across layers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify cause property is preserved
- [ ] #2 Tests verify error chains can be traversed
- [ ] #3 Tests verify multiple levels of chaining work
- [ ] #4 Tests verify type safety in error chains
- [ ] #5 All tests pass with bun test
- [ ] #6 Coverage for chaining scenarios reaches 100%
- [ ] #7 bun run typecheck passes with no errors
<!-- AC:END -->
