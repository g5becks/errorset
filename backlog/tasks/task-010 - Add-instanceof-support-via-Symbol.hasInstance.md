---
id: task-010
title: Add instanceof support via Symbol.hasInstance
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:39'
updated_date: '2026-01-05 16:08'
labels:
  - guards
  - core
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement Symbol.hasInstance to allow using instanceof operator with error sets as an alternative to callable guards.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Error set has Symbol.hasInstance property defined
- [x] #2 instanceof operator works with error set
- [x] #3 Returns same result as callable guard
- [x] #4 Type narrowing works correctly with instanceof
- [x] #5 bun run typecheck passes with no errors
- [x] #6 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Symbol.hasInstance to the ErrorSet type definition
2. Create helper to attach Symbol.hasInstance to set guard function
3. hasInstance uses same logic as set guard
4. Add tests showing instanceof works equivalently to callable guard
5. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated SetGuard type to include Symbol.hasInstance property
- Added Object.defineProperty to attach Symbol.hasInstance to guard function
- hasInstance delegates to the same guard logic
- Allows both UserError(x) and x instanceof UserError syntax
- Type narrowing works with both approaches
<!-- SECTION:NOTES:END -->
