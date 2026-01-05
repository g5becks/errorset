---
id: task-015
title: Implement capture for sync functions
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
Create the capture() method that wraps synchronous throwing code and converts exceptions to error set values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 capture() method is defined on error set
- [ ] #2 Accepts a function and error mapper
- [ ] #3 Returns function result if no error thrown
- [ ] #4 Catches thrown errors and passes to mapper
- [ ] #5 Returns mapped error from error set
- [ ] #6 Converts non-Error throws to Error objects
- [ ] #7 Return type is T | ErrorType for sync functions
- [ ] #8 bun run typecheck passes with no errors
- [ ] #9 bun run lint:fix passes with no errors
<!-- AC:END -->
