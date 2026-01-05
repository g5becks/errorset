---
id: task-013
title: Implement inspect helper method
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:40'
updated_date: '2026-01-05 16:15'
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
- [x] #1 inspect() method is defined on error set
- [x] #2 Accepts result value and partial handlers object
- [x] #3 Does nothing if value is not an error
- [x] #4 Calls matching handler for error kind if provided
- [x] #5 Does not call handler for non-matching kinds
- [x] #6 Returns void (no return value)
- [x] #7 Does not modify the result value
- [x] #8 bun run typecheck passes with no errors
- [x] #9 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create InspectHandler type (receives error, returns void)
2. Create InspectHandlers type (partial mapping of kinds to handlers)
3. Implement inspect function - check if error, call matching handler if exists
4. Export inspect and types from index.ts
5. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented inspect helper method for side-effect-only error observation:
- Created InspectHandler<Kind, T> type that returns void
- Created InspectHandlers<Kinds, T> type with all optional handlers
- inspect() does nothing if not an error, calls matching handler if provided
- Useful for logging, metrics, auditing without changing control flow
- Exported inspect, InspectHandler, InspectHandlers from index.ts
<!-- SECTION:NOTES:END -->
