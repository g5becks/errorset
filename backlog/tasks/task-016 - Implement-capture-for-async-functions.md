---
id: task-016
title: Implement capture for async functions
status: To Do
assignee: []
created_date: '2026-01-05 15:40'
labels:
  - capture
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the capture() method to handle async functions and return promises with error set values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 capture() detects when function returns Promise
- [ ] #2 Returns Promise<T | ErrorType> for async functions
- [ ] #3 Catches rejected promises and passes to mapper
- [ ] #4 Mapper receives Error object from rejection
- [ ] #5 Converts non-Error rejections to Error objects
- [ ] #6 Works with async/await syntax
- [ ] #7 bun run typecheck passes with no errors
- [ ] #8 bun run lint:fix passes with no errors
<!-- AC:END -->
