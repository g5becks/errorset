---
id: task-033
title: Write edge case tests for tag collisions
status: To Do
assignee: []
created_date: '2026-01-05 15:42'
labels:
  - testing
  - edge-cases
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create tests for handling scenarios where merged error sets have colliding tag names.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify merged sets with same tag names
- [ ] #2 Tests verify kind-level guards distinguish colliding tags
- [ ] #3 Tests verify type safety with collisions
- [ ] #4 Tests verify data access with colliding tags
- [ ] #5 All tests pass with bun test
- [ ] #6 Coverage for collision scenarios reaches 100%
- [ ] #7 bun run typecheck passes with no errors
<!-- AC:END -->
