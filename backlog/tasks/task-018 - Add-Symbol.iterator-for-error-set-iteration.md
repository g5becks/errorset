---
id: task-018
title: Add Symbol.iterator for error set iteration
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:40'
updated_date: '2026-01-05 16:23'
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
- [x] #1 Error set has Symbol.iterator property
- [x] #2 Iterator yields all kind strings
- [x] #3 Works with for...of loops
- [x] #4 Works with spread syntax [...ErrorSet]
- [x] #5 Works with Array.from()
- [x] #6 bun run typecheck passes with no errors
- [x] #7 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Symbol.iterator to ErrorSet type definition
2. Add Symbol.iterator implementation to errorSet factory
3. Iterator yields each kind string from the kinds array
4. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Symbol.iterator for error set iteration:
- Added Symbol.iterator to ErrorSet type definition
- errorSet factory attaches generator function that yields each kind
- Works with for...of loops: for (const kind of UserError) { ... }
- Works with spread syntax: [...UserError] => ["not_found", "suspended"]
- Works with Array.from(UserError)
<!-- SECTION:NOTES:END -->
