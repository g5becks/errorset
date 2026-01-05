---
id: task-018
title: Add Symbol.iterator for error set iteration
status: To Do
assignee: []
created_date: '2026-01-05 15:40'
labels:
  - helpers
  - core
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement Symbol.iterator to allow iterating over error set kinds using for...of loops and spread syntax.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Error set has Symbol.iterator property
- [ ] #2 Iterator yields all kind strings
- [ ] #3 Works with for...of loops
- [ ] #4 Works with spread syntax [...ErrorSet]
- [ ] #5 Works with Array.from()
- [ ] #6 bun run typecheck passes with no errors
- [ ] #7 bun run lint:fix passes with no errors
<!-- AC:END -->
