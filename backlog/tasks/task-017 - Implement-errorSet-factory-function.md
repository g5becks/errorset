---
id: task-017
title: Implement errorSet factory function
status: To Do
assignee: []
created_date: '2026-01-05 15:40'
labels:
  - core
  - factory
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the main errorSet() factory that ties all components together and returns a complete error set with all methods.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 errorSet() function accepts name and kind strings
- [ ] #2 Returns callable error set with set-level guard
- [ ] #3 Attaches kind constructors for each kind
- [ ] #4 Attaches recover, inspect, merge, capture methods
- [ ] #5 Attaches Symbol.hasInstance for instanceof support
- [ ] #6 Includes Type helper for type exports
- [ ] #7 All TypeScript types are correctly inferred
- [ ] #8 bun run typecheck passes with no errors
- [ ] #9 bun run lint:fix passes with no errors
<!-- AC:END -->
