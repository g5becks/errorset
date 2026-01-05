---
id: task-008
title: Implement set-level guard (callable)
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:39'
updated_date: '2026-01-05 16:05'
labels:
  - guards
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the callable error set function that acts as a type guard to check if a value is any error from the set.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Error set function is callable and acts as type guard
- [x] #2 Returns true for any error with matching kind from the set
- [x] #3 Returns false for non-errors and errors from other sets
- [x] #4 Type guard narrows to Err<Kinds, Partial<T>>
- [x] #5 Checks ERR symbol and kind membership
- [x] #6 bun run typecheck passes with no errors
- [x] #7 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create createSetGuard() function that returns a type guard
2. Guard checks: value is object, has ERR symbol, kind is in set
3. Return false for non-errors and errors from other sets
4. Add proper type narrowing to Err<Kinds, Partial<T>>
5. Export from types.ts and index.ts
6. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added createSetGuard() function that creates set-level type guards
- Guard checks: non-null object, ERR symbol true, kind in set
- Returns false for non-errors and errors from other sets
- Type narrows to Err<Kinds, Partial<T>>
- Added SetGuard type for the guard function signature
<!-- SECTION:NOTES:END -->
