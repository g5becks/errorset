---
id: task-013
title: Implement inspect helper method
status: To Do
assignee: []
created_date: '2026-01-05 15:40'
labels:
  - helpers
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the inspect() method for side-effect-only error observation without changing control flow or types.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 inspect() method is defined on error set
- [ ] #2 Accepts result value and partial handlers object
- [ ] #3 Does nothing if value is not an error
- [ ] #4 Calls matching handler for error kind if provided
- [ ] #5 Does not call handler for non-matching kinds
- [ ] #6 Returns void (no return value)
- [ ] #7 Does not modify the result value
- [ ] #8 bun run typecheck passes with no errors
- [ ] #9 bun run lint:fix passes with no errors
<!-- AC:END -->
